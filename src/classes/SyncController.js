(function($) {

   /**
    * Establish and handle client-to-server and server-to-client updates. If the model/store only supports
    * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
    * is true.
    *
    * It is expected that by the time this class is called, that the data has been loaded and the object is ready
    * to be placed into a two-way sync state. Any time a record is reloaded or a list is reloaded with new data or
    * criterio, this object should probably be disposed and replaced.
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

         //todo if the model.auto property is toggled this will not be updated; do we care?
         if( model.auto ) {
            // sync client to server (push) updates
            if( isList ) {
               this.subs.push.apply(this.subs, syncListPush(model, listOrRecord));
            }
            else         {
               this.subs.push.apply(this.subs, syncRecordPush(model, listOrRecord));
            }
         }

         //todo if the model.store property is changed this will not be updated; do we care?
         if( store.hasTwoWaySync(model) ) {
            // sync server to client (pull) updates
            // monitor the client (using the libs)
            if( isList ) {
               this.subs.push.apply(this.subs, syncListPull(model, listOrRecord, criteria));
            }
            else {
               this.subs.push.apply(this.subs, syncRecordPull(model, listOrRecord));
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
            return $.Deferred(function(def) {
               var store = this.store, model = this.model;
               if( !action ) { action = 'updated'; }
               switch(action) {
                  case 'added':
                     store.create(model, listOrRecord).then(_resolve(def, listOrRecord));
                     break;
                  case 'updated':
                     store.update(model, listOrRecord).then(_resolve(def, listOrRecord));
                     break;
                  case 'deleted':
                     store.delete(model, listOrRecord).then(_resolve(def, listOrRecord));
                     break;
                  case 'moved':
                     //todo-sort does this work? how do we get "moved" notifications?
                     store.update(model, listOrRecord).then(_resolve(def, listOrRecord));
                     break;
                  default:
                     throw new Error('Invalid action', action);
               }
            }.bind(this));
         }
         return $.Deferred().resolve(false);
      }
   });

   function syncListPush(model, list) {
      var store = model.store;
      list.subscribe(function(action, record, field) {
         console.log('push::'+action, name, prevSibling, rec.hashKey()); //debug
         switch(action) {
            case 'added':
               store.create(model, record);
               break;
            case 'deleted':
               store.delete(model, record);
               break;
            case 'updated':
               store.update(model, record);
               break;
            case 'moved':
               //todo-sort is this sufficient? will the record even be dirty?
               store.update(model, record);
               break;
            default:
               console.error('invalid action', _.toArray(arguments));
         }
      });
   }

   function syncListPull(model, list, criteria) {
      model.store.watch(model, function(action, name, value, prevSibling) {
         var rec = list.find(name) || model.newRecord(value);
         console.log('pull::'+action, name, prevSibling, rec.hashKey()); //debug
         switch(action) {
            case 'added':
               list.add(rec, prevSibling || 0);
               break;
            case 'deleted':
               list.remove(rec);
               break;
            case 'updated':
               rec.updateAll(value);
               break;
            case 'moved':
               list.move(rec, prevSibling || 0);
               break;
            default:
               console.error('invalid action', _.toArray(arguments));
         }
      }, criteria);
   }

   function syncRecordPush(model, rec) {
      var store = model.store;
      return rec.subscribe(function(record, fieldChanged) {
         store.update(model, record);
      });
   }

   function syncRecordPull(model, rec) {
      return model.store.watchRecord(model, rec.getKey(), function(id, val, sortPriority) {
         //todo-sort need to do something with sortPriority here
         rec.updateAll(val);
      });
   }

   function _resolve(def, rec) {
      return function() {
         rec.isDirty(false);
         def.resolve.apply(def, _.toArray(arguments));
      };
   }

})(jQuery);

