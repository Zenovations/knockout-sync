
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
      this.con        = new ko.sync.ChangeController(new ko.sync.KeyFactory(model, true));
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
      this.queue.push(props);
      this.auto && this.pushUpdates();
//      var isDirty;
//      //todo check expected
//      //todo
//      //todo
//      //todo
//      //todo
//      if( this.isList ) {
//         // make the changes directly to the RecordList
//         _applyToRecordList(this, props);
//         this.queued.push('list');
//         this.list.isDirty() && this.auto && this.pushUpdates();
//      }
//      else {
//         // queue the changes and save them for later
//         if( props.data ) { this.rec.updateAll(props.data); }
//         this.queued.push(props.action);
//         this.rec.isDirty() && this.auto && this.pushUpdates();
//      }
   };

   ko.sync.SyncController.prototype.pushUpdates = function() {
      if( this.isList ) {
         return _processListQueue(this);
      }
      else {
         return _processRecQueue(this);
      }
   };

   function _syncList(sync, model, criteria) {
      sync.list = new ko.sync.RecordList(model, _.isArray(criteria)? criteria : undefined);
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
      else {
         //todo decide if we need to create or update
         sync.rec = new ko.sync.Record(criteria);
         sync.rec.applyData(target);
      }
      sync.twoway && sync.subs.push(_watchStoreRecord(sync, target));
      //todo do we do a static read() if no two-way?
      if( sync.observed ) {
         sync.subs.push(_watchObs(sync, target));
      }
      else {
         if( !target.data ) { target.data = {}; }
         sync.subs.push(_watchData(this, target.data));
      }
   }

   function _watchStoreList(sync, criteria) {
      var model = sync.model, list = sync.list;
      return model.store.watch(model, function(action, name, value, prevSibling) {
               var rec = list.find(name), key;
               if( !rec && action !== 'added' ) {
                  console.debug('action invalid (record does not exist in this list)', action, name);
                  return;
               }
               //todo add sortPriority in here!
               sync.queue({action: _changeAction(action), key: name, value: value, prevId: prevSibling, src: 'store'});
               //todo-diff this assumes no changes were made on client in the interim, how to we reconcile local edits and server updates?
            }, criteria);
   }

   function _watchStoreRecord(sync, target) {
      var model = sync.model, store = model.store, rec = sync.rec;
      return store.watchRecord(model, rec, function(id, val, sortPriority) {
          sync.queue({action: 'update', key: id, data: val, priority: sortPriority, src: 'store'});
      });
   }

   function _watchObsArray(sync, target) {
      return target.watchChanges(sync.keyFactory, sync.model.observedFields(), {
         add: function(key, data, prevId) {
            sync.queue({action: 'add', key: key, prevId: prevId, data: data, src: 'obs'});
         },
         update: function(key, data) {
            sync.queue({action: 'update', key: key, data: data, src: 'obs'});
         },
         move: function(key, data, prevId) {
            sync.queue({action: 'move', key: key, prevId: prevId, src: 'obs'});
         },
         delete: function(key) {
            sync.queue({action: 'delete', key: key, src: 'obs'});
         }
      });
   }

   function _watchObs(sync, target) {
      return target.watchChanges(sync.model.observedFields(), function(data) {
         sync.queue({action: 'update', data: data, src: 'obs'});
      });
   }

   function _watchData(sync, data) {
      //todo
      //todo
      //todo
      //todo
   }

   function _processListQueue(sync) {
      //todo
      //todo
      //todo
      //todo
   }

   function _processRecQueue(sync) {
      //todo match up temp ids with perm ids
      //todo
      //todo
      //todo
      //todo
   }

   function _applyToRecordList(sync, props) {
      var rec;
      switch(props.action) {
         case 'create':
            rec = sync.model.newRecord(props.data);
            if( !rec.hasKey() ) { }
            sync.list.add(rec, props.prevId);
            break;
         case 'read':
            //todo
            //todo
            //todo
            throw new Error('not ready');
         case 'update':
            rec = sync.list.find(props.key);
            sync.list.updated(rec);
            break;
         case 'delete':
            sync.list.remove(props.key);
            break;
         case 'move':
            sync.list.move(props.key, props.prevId);
            break;
         default:
            throw new Error('invalid action '+props.action);
      }
   }

   var CHANGE_CONVERSIONS = {
      added: 'create',
      updated: 'update',
      deleted: 'delete',
      moved: 'move'
   };

   function _changeAction(recListChangeType) {
      if( !_.has(CHANGE_CONVERSIONS, recListChangeType) ) {
         throw new Error('invalid action: '+recListChangeType);
      }
      return CHANGE_CONVERSIONS[recListChangeType];
   }


})(jQuery);
