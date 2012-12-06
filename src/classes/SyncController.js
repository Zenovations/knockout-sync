
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
      this.expected   = {};   // the feedback notifications when we push/pull updates
      this.deferred   = $.Deferred().resolve(); // used to determine when record(s) completely loaded
      this.disposed   = false; // set to true if dispose() is called to prevent anything from trying to queue/process

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
      /** @type ko.sync.KeyFactory */
      this.keyFactory = new ko.sync.KeyFactory(model, true);
      /** @type ko.sync.Store */
      this.model      = model;
      /** @type ko.sync.RecordList */
      this.list       = null;
      /** @type ko.sync.Record */
      this.rec        = null;

      if( this.isList ) {
         _syncList(this, model, criteria);
      }
      else {
         _syncRecord(this, criteria);
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
      this.expected   = {};
      this.model      = null;
      this.list       = null;
      this.rec        = null;
      this.disposed   = true;
      return this;
   };

   ko.sync.SyncController.prototype.queue = function(props) {
      if( !this.disposed && expect(this.expected, props) ) {
         var change = newChange(this.con, this.model, this.keyFactory, this.target, props, this.rec);
         console.log('queue', change.key()); //debug
         this.con.addChange(change);
         this.auto && this.pushUpdates();
      }
   };

   ko.sync.SyncController.prototype.pushUpdates = function() {
      console.log('pushUpdates?'); //debug
      if( this.disposed ) {
         return $.Deferred().reject(new Error('SyncController has been disposed'));
      }
      else {
         console.log('pushUpdates'); //debug
         return this.con.process()
            .done(function() { console.log('pushUpdates completed'); })//debug
            .fail(function(possiblyUnresolvedPromises) {
               //todo what do we do about failures?
               //todo
               //todo
               //todo
            });
      }
   };

   ko.sync.SyncController.prototype.ready = function() {
      return this.deferred.promise();
   };

   function _syncList(sync, model, criteria) {
      var target = sync.target;
      if( criteria && !sync.twoway ) {
         // a one time query to get the data down
         sync.deferred = sync.deferred.pipe(function() {
            console.log('_syncList', criteria);
            return model.store.query(model, function(data, key) {
               target.push(model.newRecord(data).applyData());
            }, criteria);
         });
      }

      sync.deferred.then(function() {
         sync.twoway && sync.subs.push(_watchStoreList(sync, criteria));
         //todo if there is no two-way, do a static query()? is that CrudArray's job?
         sync.subs.push(_watchObsArray(sync, target));
      });
   }

   function _syncRecord(sync, criteria) {
      var target = sync.target;
      var model  = sync.model;
      if( typeof(criteria) === 'string' ) {
         // load a record from the server
         console.log('sync record from id'); //debug
         if( sync.twoway ) {
            sync.rec = sync.model.newRecord(criteria);
         }
         else {
            // a static, one time read
            sync.deferred = sync.deferred.pipe(function() {
               return model.store
                  .read(model, ko.sync.RecordId.for(model, criteria))
                  .then(function(rec) {
                     sync.rec = rec;
                     rec.applyData(target);
                  });
            });
         }
      }
      else if( criteria instanceof ko.sync.Record ) {
         // use the record provided
         sync.rec = criteria;
         sync.rec.applyData(target);
      }
      else if( criteria ) {
         // create a record using a data object
         //todo decide if we need to create or update
         sync.rec = model.newRecord(criteria);
         sync.rec.applyData(target);
      }
      else {
         // create an empty record
         sync.rec = model.newRecord();
         sync.rec.applyData(target);
      }

      sync.deferred.then(function() {
         // wait for any record loading as necessary
         if( sync.twoway ) {
            if( sync.rec.hasKey() ) {
               // if the record is valid, sync it up now
               _watchStoreRecord(sync);
            }
            else {
               // otherwise, wait until it has an ID to sync it
               sync.rec.onKey(function(id, oldKey, fields, data) {
                  var props = {action: 'update', key: id, data: data, to: 'store', rec: sync.rec};
                  expect(sync.expected, props);
                  newChange(sync.con, model, sync.keyFactory, target, props, sync.rec).run();
                  _watchStoreRecord(sync);
               });
            }
         }

         if( sync.observed ) {
            sync.subs.push(_watchObs(sync, target));
         }
         else {
            sync.subs.push(_watchData(sync, target));
         }
      });
   }


   //todo there is currently no way to tell a client a record moved on the server
   //todo somehow, we should account for this in updates to obs!
   //todo probably, we should be using sort values and not prevId to do this stuff

   function _watchStoreList(sync, criteria) {
      var model = sync.model;
      //todo-sort make store.watch return sortPriority?
      return model.store.watch(model, function(action, name, value, prevSibling) {
               sync.queue({action: _translateToAction(action), rec: model.newRecord(value), data: value, prevId: prevSibling, to: 'obs'});
            }, criteria);
   }

   function _watchStoreRecord(sync) {
      var model = sync.model, store = model.store, rec = sync.rec;
      console.log('_watchStoreRecord', rec.hashKey()); //debug
      return store.watchRecord(model, rec, function(id, val, sortPriority) {
          sync.queue({action: 'update', rec: rec, data: val, priority: sortPriority, to: 'obs'});
      });
   }

   function _watchObsArray(sync, target) {
      return target.watchChanges(sync.keyFactory, sync.model.observedFields(), {
         add: function(key, data, prevId) {
            sync.queue({action: 'add', key: key, prevId: prevId, data: data, to: 'store'});
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

   function _watchObs(sync, target) {
      console.log('_watchObs', sync.rec && sync.rec.hashKey()); //debug
      return target.watchChanges(sync.model.observedFields(), function(data) {
         console.log('_watchObs::updated', data);//debug
         sync.queue({action: 'update', data: data, to: 'store'});
      });
   }

   function _watchData(sync, data) {
      console.log('_watchData', data && data.id); //debug
      return ko.sync.watchFields(data, sync.model.observedFields(), function(data) {
         console.log('_watchData::updated', data); //debug
         sync.queue({action: 'update', data: data, to: 'store'});
      });
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

   function expect(expectedCache, data) {
      var entry = _.pick(data, ['action', 'to', 'key', 'prevId', 'data']);
      var HK = ko.sync.KeyFactory.HASHKEY_FIELD;
      if( !entry.key ) {
         if( typeof(data.key) === 'function' ) { entry.key = data.key(); }
         else if( data.rec ) { entry.key = data.rec.hashKey(); }
         else if( HK in data ) {
            entry.key = data[HK];
         }
         else if( data.data && HK in entry.data ) {
            entry.key = entry.data[HK];
         }
      }
      var set = _.findOrCreate(expectedCache, [], entry.to, entry.action, entry.key);
      if( _.find(set, function(o) { return _.isEqual(o, entry) } ) ) {
         _.remove(set, entry);
         console.log('expected::removing', entry.key, entry, set);//debug
         if( set.length === 0 ) {
            // free memory
            _.deepRemove(expectedCache, entry.key, entry.to, entry.action);
         }
         return false;
      }
      else {
         console.log('expected::adding', entry.key, entry);//debug
         set.push(entry);
         return true;
      }
   }

   function newChange(con, model, keyFactory, target, queueEntry, rec) {
      var data = _.extend(_.pick(queueEntry, ['to', 'action', 'prevId', 'data', 'rec']), {model: model, obs: target});
      if( !data.rec ) {
         if( rec ) {
            data.rec = rec;
         }
         else {
            data.rec = model.newRecord();
            if( data.key ) {
               var o = target()[ko.sync.findByKey(target, keyFactory, data.key)];
               o && data.rec.updateAll(o);
            }
         }
      }
      queueEntry.data && data.rec.updateAll(queueEntry.data);

      var change = new ko.sync.Change(data);

      if( change.to === 'store' && ko.sync.RecordId.isTempId(change.key()) && !con.findChange(change.key()) ) {
         // the first call to store should always be a create for newly added records
         change.action = 'create';
      }

      return change;
   }

   function checkChangeStatus(changeKeys, change) {
      if( change.to === 'store' && !change.rec.hasKey() ) {
         switch(change.action) {
            case 'update':
               change.action = 'create';
               break;
            case 'move':
               // don't let the first action be a move, just wait for the create or update command
               change.invalidate();
               break;
            default:
            // do nothing
         }
      }
   }

})(jQuery);
