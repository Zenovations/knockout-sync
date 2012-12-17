
/***********************************************
 * SyncController connects RecordList to a Store
 **********************************************/
(function($) {
   "use strict";
   var undefined;

   /**
    * Establish and handle updates between a Store and a knockout observable. If the model/store only supports
    * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
    * is true. When auto-sync is false, then updates are synced by calling pushUpdates() manually.
    *
    * It is expected that by the time this class is called, that the data has been loaded and the object is ready
    * to be placed into a two-way sync state. Any time a record is reloaded or a list is reloaded with new data or
    * criteria, this object should probably be disposed (SyncController.dispose()) and replaced.
    *
    * Changes to the model (including the auto property) are not supported and a new SyncController should be created.
    *
    * The `criteria` properties for an observableArray may be any of the following:
    *    - null/undefined: the entire database table will be loaded (watch out!)
    *    - object: records loaded from Store, this object should match the format of Store.watch()
    *    - array: an Array of Records or Objects to load locally (only used if two-way sync is disabled)
    *
    * The `criteria` properties for an observable (single record) may be any of the following:
    *    - string: hashKey of a record to load from the server
    *    - object: record is created on server, if it already exists it will be overwritten (use with care!)
    *
    * @param {ko.sync.Model} model
    * @param {Object|ko.observable|ko.observableArray} target if listOrRecord is a RecordList this must be an observableArray
    * @param {Object|Array|String} [criteria] see above
    * @constructor
    */
   ko.sync.SyncController = function(model, target, criteria) {
      this.subs       = [];   // subscriptions to everything SyncController is monitoring
      this.deferred   = $.Deferred().resolve(); // used to determine when record(s) completely loaded
      this.pushQueue  = {current: null, next: null}; // used when pushUpdates() is called multiple times; ensures all updates occur in order
      this.disposed   = false; // set to true if dispose() is called to prevent anything from trying to queue/process

      /** @type {ko.sync.FeedbackFilter} */
      this.filter     = new ko.sync.FeedbackFilter();
      /** @type {ko.observable|ko.observableArray} */
      this.target     = target;
      /** @type {boolean} */
      this.observed   = ko.isObservable(target);
      /** @type {boolean} */
      this.isList     = this.observed && ko.sync.isObservableArray(target);
      /** @type {boolean} */
      this.twoway     = model.store.hasTwoWaySync();
      /** @type {boolean} */
      this.auto       = model.auto;
      /** @type ko.sync.ChangeController */
      this.con        = new ko.sync.ChangeController();
      /** @type ko.sync.Store */
      this.model      = model;
      /** @type ko.sync.KeyFactory */
      this.keyFactory = new ko.sync.KeyFactory(model, true);
      /** @type ko.sync.RecordList */
      this.list       = null;
      /** @type ko.sync.Record */
      this.rec        = null;

      // monitor the ChangeController for updates; adds the expected feedback loops at the time each change is invoked
      watchController(this.subs, this.filter, this.con);

      // sync up data with various subscribers
      if( this.isList ) {
         syncList(this, model, criteria);
      }
      else {
         syncRecord(this, criteria);
      }
   };

   ko.sync.SyncController.prototype.dispose = function() {
      if( this.subs ) {
         var i = this.subs.length;
         while (i--) {
            this.subs[i].dispose();
         }
      }
      this.con        = null;
      this.subs       = [];
      this.filter     = new ko.sync.FeedbackFilter();
      this.model      = null;
      this.list       = null;
      this.rec        = null;
      this.disposed   = true;
      return this;
   };

   ko.sync.SyncController.prototype.queue = function(props) {
      var def = this.ready();
      if( !this.disposed ) {
         var change = props instanceof ko.sync.Change? props : newChange(this.con, this.model, this.keyFactory, this.target, props, this.rec);
         if( !this.filter.clear(change) ) {
            console.log('queued', change.key(), change.to, change.action); //debug
            this.con.addChange(change);
            if( this.auto ) {
               this.pushUpdates();
            }
         }
         else if( change.to === 'obs' && change.action === 'create' && change.prevId ) {
            // when we get records back from the store, the position may be altered, so sync it
            //todo is this right? it feels... hokey
            change.action = 'move';
            if( !this.filter.clear(change) ) {
               this.con.addChange(change);
               if( this.auto ) {
                  this.pushUpdates();
               }
            }
         }
      }
      return this;
   };

   ko.sync.SyncController.prototype.pushUpdates = function() {
      // to ensure all records are processed in order, only one pushUpdate may occur at a time
      var pushQueue = this.pushQueue;
      var controller = this.con;
      var self = this;
      var promise;
      if( this.disposed ) {
         promise = $.Deferred().reject(new Error('SyncController has been disposed')).promise();
      }
      else if( pushQueue.next ) {
         // a push has already been queued so our changes will just be added to that queue to be pushed when pushQueue.current resolves
         promise = pushQueue.next;
      }
      else if( pushQueue.current ) {
         if( controller.hasChanges() ) {
            // since changes could come in while one is processing, it's possible to queue exactly one additional push
            // (all scheduled changes will get shoved out during the second call, so only one queued push is necessary)
            promise = pushQueue.next = $.Deferred(function(def) {
               pushQueue.current.always(function() {
                  controller.process().then(def.resolve,
                           function(promises) {
                              handlePushFailures(self);
                              def.reject(promises);
                           });
               });
            }).promise();
         }
         else {
            // however, if there is nothing queued for processing, then there is no need to queue the additional push
            // and we can simply return the current promise, as all processing changes will be done then
            // this will be a common scenario since sync.queue(...).pushUpdates(...) may be a common usage pattern
            promise = pushQueue.current;
         }
      }
      else {
         // no pushes have been scheduled, so create one right now
         promise = pushQueue.current = controller.process().fail(handlePushFailures(self)).always(function() {
               // a push could be queued while this one is running, always advance `next` to become the current push
               // before it is invoked
               pushQueue.current = pushQueue.next? pushQueue.next : null;
               pushQueue.next = null;
            });
      }
      return promise;
   };

   ko.sync.SyncController.prototype.read  = function(criteria) {
      if( this.isList ){
         return readList(this, this.model, this.target, criteria);
      }
      else {
         return readRecord(this, this.model, this.target, criteria);
      }
   };

   ko.sync.SyncController.prototype.ready = function() {
      return this.deferred.promise();
   };

   function syncList(sync, model, criteria) {
      var target = sync.target;
      if( criteria && !sync.twoway ) {
         sync.deferred = readList(sync, model, target, criteria);
      }

      //todo always isn't really the best choice, need some error handling
      sync.deferred.then(function() {
         sync.twoway && sync.subs.push(watchStoreList(sync, criteria));
         sync.subs.push(watchObsArray(sync, target));
      });
   }

   function syncRecord(sync, criteria) {
      var target = sync.target;
      loadRecordCriteria(sync, criteria);

      //todo isn't the best answer; need some error handling
      sync.deferred.then(function() {
         // wait for any record loading as necessary
         if( sync.twoway ) {
            if( sync.rec.hasKey() ) {
               // if the record is valid, sync it up now
               watchStoreRecord(sync);
            }
            else {
               // otherwise, wait until it has an ID to sync it
               sync.rec.onKey(function(id, oldKey, fields, data) {
                  sync.rec.updateAll(data);
                  sync.filter.expect({
                     to: 'obs',
                     action: 'update',
                     key: id,
                     data: sync.rec.getData()
                  });
                  sync.rec.applyData(target);
//                  var props = {action: 'update', key: id, data: data, to: 'store', rec: sync.rec};
//                  newChange(sync.con, model, sync.keyFactory, target, props, sync.rec).run();
                  watchStoreRecord(sync);
               });
            }
         }

         if( sync.observed ) {
            sync.subs.push(watchObs(sync, target));
         }
         else {
            sync.subs.push(watchData(sync, target));
         }
      });
   }

   function loadRecordCriteria(sync, criteria) {
      var target = sync.target;
      var model  = sync.model;
      if( typeof(criteria) === 'string' ) {
         // load a record from the server
         sync.deferred = readRecord(sync, model, target, criteria);
      }
      else if( criteria instanceof ko.sync.Record ) {
         // use the record provided
         sync.rec = criteria;
         sync.rec.applyData(target);
      }
      else if( criteria ) {
         // create a record using a data object
         sync.rec = model.newRecord(criteria);
         sync.rec.applyData(target);
      }
      else {
         // create an empty record
         sync.rec = model.newRecord(ko.sync.unwrapAll(target));
         sync.rec.applyData(target);
      }
   }

   function watchStoreList(sync, criteria) {
      var model = sync.model;
      //todo-sort make store.watch return sortPriority? ues comparator?
      return model.store.watch(model, function(action, name, value, prevSibling) {
         sync.queue({action: _translateToAction(action), rec: model.newRecord(value), data: value, prevId: prevSibling, to: 'obs'});
      }, criteria);
   }

   function watchStoreRecord(sync) {
      var model = sync.model, store = model.store, rec = sync.rec;
      return store.watchRecord(model, rec, function(id, val, sortPriority) {
          rec.updateAll(val);
          sync.queue({action: 'update', rec: rec, data: rec.getData(true), priority: sortPriority, to: 'obs'});
      });
   }

   function watchObsArray(sync, target) {
      return target.watchChanges(sync.keyFactory, sync.model.observedFields(), {
         add: function(key, data, prevId) {
            sync.queue({action: 'create', key: key, prevId: prevId, data: data, to: 'store'});
         },
         update: function(key, data) {
            sync.queue({action: 'update', key: key, data: data, to: 'store'});
         },
         move: function(key, data, prevId) {
            sync.queue({action: 'move', key: key, prevId: prevId, to: 'store'});
         },
         delete: function(key) {
            sync.queue({action: 'delete', key: key, to: 'store'});
         }
      });
   }

   function watchObs(sync, target) {
      return target.watchChanges(sync.model.observedFields(), function(data) {
         sync.queue({action: 'update', data: data, to: 'store'});
      });
   }

   function watchData(sync, data) {
      return ko.sync.watchFields(data, sync.model.observedFields(), function(data) {
         sync.queue({action: 'update', data: data, to: 'store'});
      });
   }

   function watchController(subs, filter, controller) {
      subs.push(controller.observe(function(state, change, msg) {
         switch(state) {
            case 'started':
               // adds the expected feedback loops at the time that the change is invoked
               filter.expect(change);
               break;
            case 'failed':
               console.warn(change+' failed', msg);
               filter.clear(change);
               break;
            case 'completed':
               // nothing to do
               break;
            default:
               throw new Error('unexpected state '+state);
         }
      }));
   }

   var CHANGE_CONVERSIONS = {
      added: 'create',
      updated: 'update',
      deleted: 'delete',
      moved: 'move'
   };

   function _translateToAction(recListChangeType) {
      if( !_.has(CHANGE_CONVERSIONS, recListChangeType) ) {
         throw new Error('invalid action: '+recListChangeType);
      }
      return CHANGE_CONVERSIONS[recListChangeType];
   }

   function newChange(con, model, keyFactory, target, queueEntry, rec) {
      //todo this is hard to read and a bit coupled : (
      var data = _.extend(_.pick(queueEntry, ['to', 'action', 'prevId', 'data', 'rec']), {model: model, obs: target});
      if( !data.rec ) {
         if( rec ) {
            data.rec = rec;
         }
         else {
            data.rec = model.newRecord();
            if( queueEntry.key && ko.sync.isObservableArray(target) ) {
               var o = target()[ko.sync.findByKey(target, keyFactory, queueEntry.key)];
               if( o ) {
                  data.rec.updateAll(o);
               }
            }
         }
      }
      queueEntry.data && data.rec.updateAll(queueEntry.data);
      if( !data.rec.hasKey() && data.action === 'delete' && queueEntry.key ) {
         data.rec.updateHashKey(queueEntry.key);
      }
      var change = new ko.sync.Change(data);

      if( change.to === 'store' && ko.sync.RecordId.isTempId(change.key()) && !con.findChange(change.key()) ) {
         if( change.action === 'delete' ) {
            change.invalidate();
            console.warn('Tried to delete a temporary record', change.key());
         }
         else {
            // the first call to store should always be a create for newly added records
            change.action = 'create';
         }
      }

      return change;
   }

   function handlePushFailures(sync) {
      var MAX_RETRIES = ko.sync.SyncController.MAX_RETRIES;
      return function(changes) {
         //todo should SyncController be retrying? should that be a higher level decision?
         //todo the automation is nice but maybe SyncController doesn't have context for this?
         var count = 0, givenUp = [];
         _.each(changes, function(changeResult) {
            var change = changeResult.change;
            if(changeResult.state === 'rejected') {
               count++;
               change.retries++;
               if( change.retries > MAX_RETRIES ) {
                  givenUp.push(change.toString());
               }
               else {
                  sync.queue(change);
               }
            }
         });
         var countGivenUp = givenUp.length;
         console.warn('pushUpdates had '+(count)+' failures, requeueing '+(count-countGivenUp)+', giving up on '+countGivenUp);
      }
   }

   function readList(sync, model, target, criteria) {
      // a one time query to get the data down
      return sync.deferred.pipe(function() {
         return $.Deferred(function(def) {
            var prevId = 0;
            target([]);
            model.store.query(model, function(data, key) {
               var rec = model.newRecord(data);
               sync.filter.expect({action: 'create', to: 'obs', key: key, prevId: prevId, data: rec.getData(true)});
               prevId = key;
               target.push(rec.applyData());
               //todo-sort
            }, criteria).always(function(matches) { def.resolve(matches)});
         });
      });
   }

   function readRecord(sync, model, target, criteria) {
      // a static, one time read
      return sync.deferred.pipe(function() {
         return model.store
                  .read(model, ko.sync.RecordId.for(model, criteria))
                  .then(function(rec) {
                     if( rec ) {
                        sync.rec = rec;
                        rec.applyData(target);
                     }
                  });
      });
   }

   ko.sync.SyncController.MAX_RETRIES = 3;

})(jQuery);
