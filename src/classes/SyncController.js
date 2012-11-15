/***********************************************
 * SyncController connects RecordList to a Store
 **********************************************/
(function($) {

   //todo
   //todo
   //todo
   //todo
   //todo
   //todo when and where does the isDirty flag get cleared? (for auto-sync?)

   /**
    * Establish and handle updates between a Store and a RecordList. If the model/store only supports
    * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
    * is true. When auto-sync is false, then updates are pushed by calling pushUpdates().
    *
    * It is expected that by the time this class is called, that the data has been loaded and the object is ready
    * to be placed into a two-way sync state. Any time a record is reloaded or a list is reloaded with new data or
    * criteria, this object should probably be disposed and replaced.
    *
    * Additionally, changes to the story are not detected and a new SyncController must be established. For example:
    * if the model.store property is changed this will not be updated and a new SyncController is needed; if the
    * model.auto property is toggled then a new SyncController will be needed.
    */
   ko.sync.SyncController = Class.extend({

      /**
       * Establish and handle client-to-server and server-to-client updates. If the model/store only supports
       * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
       * is true.
       *
       * @param {ko.sync.Model} model
       * @param {ko.sync.RecordList|ko.sync.Record} listOrRecord
       * @param {object} [criteria] used with lists to specify the filter parameters used by server and to load initial data
       * @constructor
       */
      init: function(model, listOrRecord, criteria) {
         var isList = listOrRecord instanceof ko.sync.RecordList, store = model.store;
         this.store = store;
         this.model = model;
         this.subs = [];

         if( model.auto ) {
            // sync client to server (push) updates
            if( isList ) {
               this.subs.push(syncListPush(model, listOrRecord));
            }
            else         {
               this.subs.push(syncRecordPush(model, listOrRecord));
            }
         }

         if( store.hasTwoWaySync(model) ) {
            // sync server to client (pull) updates
            // monitor the client (using the libs)
            if( isList ) {
               this.subs.push(syncListPull(model, listOrRecord, criteria));
            }
            else {
               this.subs.push(syncRecordPull(model, listOrRecord));
            }
         }
      },

      /**
       * @return {ko.sync.SyncController} this
       */
      dispose: function() {
         var i = this.subs.length;
         while (i--) {
            this.subs[i].dispose();
         }
         this.subs = [];
         return this;
      },

      /**
       * Force updates (for use when auto-sync is off). It is safe to call this on unchanged records or empty lists
       *
       * @param {Array|ko.sync.Record} listOrRecord
       * @param {string} [action]  added, updated, or deleted
       * @return {Promise} fulfilled when all updates are marked completed by the server
       */
      pushUpdates: function(listOrRecord, action) {
         if(_.isArray(listOrRecord) ) {
            var promises = [];
            _.each(listOrRecord, function(v) {
               promises.push(this.pushUpdates(v, action));
            }, this);
            return $.when(promises);
         }
         else if( listOrRecord.isDirty() ) {
            return pushUpdate(action||'updated', this.store, this.model, listOrRecord);
         }
         else {
            return $.Deferred().resolve(false);
         }
      }
   });

   function syncListPush(model, list) {
      var store = model.store;
      list.subscribe(function(action, record, field) {
         return pushUpdate(action, store, list.model, record);
      });
   }

   function syncListPull(model, list, criteria) {
      model.store.watch(model, function(action, name, value, prevSibling) {
         var rec = list.find(name) || model.newRecord(value);
         switch(action) {
            case 'added':
               list.add(rec, prevSibling || 0);
               break;
            case 'deleted':
               var key = rec.hasKey() && rec.hashKey();
               key && !(key in list.deleted) && !(key in list.delayed) && list.remove(rec);
               break;
            case 'updated':
               rec.updateAll(value);
               break;
            case 'moved':
               list.move(rec, prevSibling || 0);
               break;
            default:
               typeof(console) === 'object' && console.error && console.error('invalid action', _.toArray(arguments));
         }
      }, criteria);
   }

   function syncRecordPush(model, rec) {
      var store = model.store;
      return rec.subscribe(function(record, fieldChanged) {
         store.update(model, record).then(thenClearDirty(record));
      });
   }

   function pushUpdate(action, store, model, rec) {
      //todo nothing happens if the sync fails; should we retry here? fix this upstream?
      var def;
      switch(action) {
         case 'added':
            def = store.create(model, rec);
            break;
         case 'updated':
            def = store.update(model, rec);
            break;
         case 'deleted':
            def = store.delete(model, rec);
            break;
         case 'moved':
            //todo-sort does this work? how do we get "moved" notifications?
            def = store.update(model, rec);
            break;
         default:
            def = $.Deferred().reject('invalid action: '+action);
            typeof(console) === 'object' && console.error && console.error('invalid action', _.toArray(arguments));
      }
      return def.then(thenClearDirty(rec));
   }

   function syncRecordPull(model, rec) {
      return model.store.watchRecord(model, rec, function(id, val, sortPriority) {
         rec.updateAll(val);
      });
   }

   function thenClearDirty(rec) {
      return function(success) {
         success !== false && rec.isDirty(false);
      }
   }

})(jQuery);

