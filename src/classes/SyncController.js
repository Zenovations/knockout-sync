
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
      this.target     = target;
      this.observed   = ko.isObservable(target);
      this.isList     = this.observed && ko.sync.isObservableArray(target);
      this.twoway     = model.store.hasTwoWaySync();
      this.auto       = model.auto;
      this.subs       = [];
      this.expected   = {};  // the feedback notifications when we push/pull updates
      this.queued     = [];  // stores activities to be pushed to server

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
      this.subs       = [];
      this.expected   = {}; // the feedback notifications when we push/pull updates
      this.model      = null;
      this.list       = null;
      this.rec        = null;
      this.queue      = []; // used for updating records
      return this;
   };

   ko.sync.SyncController.prototype.queue = function(props) {
      if( expect(this.expected, props) ) {
         this.con.addChange(newChange(this.model, this.keyFactory, this.target, props, this.rec));
         this.auto && this.pushUpdates();
      }
   };

   ko.sync.SyncController.prototype.pushUpdates = function() {
      return this.con.process()
         .fail(function(possiblyUnresolvedPromises) {
            //todo what do we do about failures?
            //todo
            //todo
            //todo
         });
   };

   function _syncList(sync, model, criteria) {
      sync.twoway && sync.subs.push(_watchStoreList(sync, criteria));
      //todo if there is no two-way, do a static query()? is that CrudArray's job?
      sync.subs.push(_watchObsArray(sync, sync.target));
   }

   function _syncRecord(sync, criteria) {
      var target = sync.target;
      if( typeof(criteria) === 'string' ) {
         //todo load it from server
         //todo
         //todo
         //todo
      }
      else if( criteria instanceof ko.sync.Record ) {
         sync.rec = criteria;
         sync.rec.applyData(target);
      }
      else if( criteria ) {
         //todo decide if we need to create or update
         sync.rec = sync.model.newRecord(criteria);
         sync.rec.applyData(target);
      }
      else {
         sync.rec = sync.model.newRecord();
         sync.rec.applyData(target);
      }
      sync.twoway && sync.subs.push(_watchStoreRecord(sync, target));
      //todo do we do a static read() if no two-way? maybe that's the Crud/CrudArray's job?
      if( sync.observed ) {
         sync.subs.push(_watchObs(sync, target));
      }
      else {
         if( !target.data ) { target.data = {}; }
         sync.subs.push(_watchData(sync, target.data));
      }
   }


   //todo there is currently no way to tell a client a record moved on the server
   //todo somehow, we should account for this in updates to obs!
   //todo probably, we should be using sort values and not prevId to do this stuff

   function _watchStoreList(sync, criteria) {
      var model = sync.model, list = sync.list;
      //todo-sort make store.watch return sortPriority?
      return model.store.watch(model, function(action, name, value, prevSibling) {
               var rec = list.find(name), key;
               if( !rec && action !== 'added' ) {
                  console.debug('action invalid (record does not exist in this list)', action, name);
                  return;
               }
               sync.queue({action: _translateToAction(action), rec: model.newRecord(value), data: value, prevId: prevSibling, to: 'obs'});
            }, criteria);
   }

   function _watchStoreRecord(sync) {
      var model = sync.model, store = model.store, rec = sync.rec;
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
      return target.watchChanges(sync.model.observedFields(), function(data) {
         sync.queue({action: 'update', data: data, to: 'store'});
      });
   }

   function _watchData(sync, data) {
      return ko.sync.watchFields(data, sync.model.observedFields(), function(data) {
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

   function expect(expectedCache, entry) {
      var set = _.findOrCreate(expectedCache, [], entry.to, entry.action, entry.key);
      if( _.find(set, function(o) { return _.isEqual(o, entry) } ) ) {
         _.remove(set, entry);
         if( set.length === 0 ) {
            // free memory
            _.deepRemove(expectedCache, entry.key, entry.to, entry.action);
         }
         return false;
      }
      else {
         set.push(entry);
         return true;
      }
   }

   function newChange(model, keyFactory, target, queueEntry, rec) {
      var data = _.pick(queueEntry, ['to', 'action', 'prevId', 'data', 'rec']);
      if( !rec ) {
         if( !data.rec ) {
            data.rec = model.newRecord();
            if( data.key ) {
               var o = target()[ko.sync.findByKey(target, keyFactory, data.key)];
               o && data.rec.updateAll(o);
            }
         }
      }
      else {
         data.rec = rec;
      }
      queueEntry.data && data.rec.updateAll(queueEntry.data);
      return new ko.sync.Change(data);
   }

})(jQuery);
