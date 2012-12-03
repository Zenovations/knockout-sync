
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
      this.observed   = ko.isObservable(target);
      this.isList     = this.observed && ko.sync.isObservableArray(target);
      this.twoway     = model.store.hasTwoWaySync();
      this.auto       = model.auto;
      this.subs       = [];
      this.expected   = {}; // the feedback notifications when we push/pull updates
      this.runContext = {   // used by _push() to control multiple calls to pushUpdates
         queued: []         // stores activities to be pushed to server
      };

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
         _syncList(this, model, criteria, target);
      }
      else {
         _syncRecord(this, target, criteria);
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
      return this;
   };

   ko.sync.SyncController.prototype.queue = function(props) {
      if( this.isList ) {
         //todo
         //todo
         //todo
         //todo
      }
      else {
         //todo
         //todo
         //todo
         //todo
      }
      if( this.auto ) { this.pushUpdates(); }
   };

   ko.sync.SyncController.prototype.pushUpdates = function() {
      if( this.isList ) {
         return _processListQueue(this);
      }
      else {
         return _processRecQueue(this);
      }
   };

   function _syncList(sync, model, criteria, target) {
      sync.list = new ko.sync.RecordList(model, _.isArray(criteria)? criteria : undefined);
      sync.twoway && sync.subs.push(_watchStoreList(this, target, criteria));
      sync.subs.push(_watchObsArray(this, target));
   }

   function _syncRecord(sync, target, criteria) {
      if( typeof(criteria) === 'string' ) {
         //todo load it from server
         //todo
         //todo
         //todo
      }
      else {
         sync.rec = new ko.sync.Record(criteria);
         sync.rec.applyData(target);
      }
      sync.twoway && sync.subs.push(_watchStoreRecord(this, target));
      if( sync.observed ) {
         sync.subs.push(_watchObs(this, target));
      }
      else {
         sync.subs.push(_watchData(this, target.data));
      }
   }

   function _watchStoreList() {
      //todo
      //todo
      //todo
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

   function _watchStoreRecord() {
      //todo
      //todo
      //todo
   }

   function _watchObs(sync, target) {
      return target.watchChanges(sync.model.observedFields(), function(data) {
         sync.queue({action: 'update', data: data, src: 'obs'});
      });
   }

   function _watchData() {
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
      //todo
      //todo
      //todo
      //todo
   }

})(jQuery);
