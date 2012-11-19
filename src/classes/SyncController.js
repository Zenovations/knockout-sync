/***********************************************
 * SyncController connects RecordList to a Store
 **********************************************/
(function($) {

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
       * @param {Object|ko.observable|ko.observableArray} target if listOrRecord is a RecordList this must be an observableArray
       * @param {ko.sync.RecordList|ko.sync.Record} listOrRecord
       * @param {object} [criteria] used with lists to specify the filter parameters used by server and to load initial data
       * @constructor
       */
      init: function(model, target, listOrRecord, criteria) {
         this.model = model;
         this.subs = [];
         var next = $.Deferred(function(def) { def.resolve(); });
         syncTarget(model, target, listOrRecord, this.subs);
         syncPush(model, listOrRecord, this.subs, next);
         syncPull(model, listOrRecord, this.subs, next, criteria);
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
       * @param {string} [action]  added, updated, moved, or deleted
       * @return {Promise} fulfilled when all updates are marked completed by the server
       */
      pushUpdates: function(listOrRecord, action) {
         //todo make this work if a RecordList is passed in
         //todo this method signature is wrong; we should be checking the list/record we received in init rather
         //todo than operating on any list we see come through
         //todo if this is an observableArray, then call checkpoint()!
         if(_.isArray(listOrRecord) ) {
            var promises = [];
            _.each(listOrRecord, function(v) {
               promises.push(this.pushUpdates(v, action));
            }, this);
            return $.when(promises);
         }
         else if( listOrRecord.isDirty() ) {
            return pushUpdate(_updateAction(listOrRecord, action), this.model, listOrRecord);
         }
         else {
            return $.Deferred().resolve(false);
         }
      }
   });

   function syncPush(model, listOrRecord, subs, next) {
      if (model.auto) {
         // sync client to server (push) updates
         if (listOrRecord instanceof ko.sync.RecordList) {
            subs.push(syncListPush(model, listOrRecord));
         }
         else {
            //todo this is not enough; existence of a key doesn't ensure record exists on the server
            if (!listOrRecord.hasKey()) {
               next.pipe(function () {
                  // record is new, must be created on server
                  return model.store.create(model, listOrRecord).then(function (id) {
                     listOrRecord.updateHashKey(id);
                     //todo target
                  }).then(thenClearDirty(listOrRecord));
               });
            }
            next.then(function () {
               subs.push(syncRecordPush(model, listOrRecord));
            });
         }
      }
   }

   function syncPull(model, listOrRecord, subs, next, criteria) {
      if( model.store.hasTwoWaySync(model) ) {
         // sync server to client (pull) updates
         // monitor the client (using the libs)
         if( listOrRecord instanceof ko.sync.RecordList ) {
            subs.push(syncListPull(model, listOrRecord, criteria));
         }
         else {
            //todo this is not enough, existence of a key doesn't ensure the record exists on the server
            if( listOrRecord.hasKey() ) {
               subs.push(syncRecordPull(model, listOrRecord));
            }
            else {
               next.then(function() {
                  // if the record must be created, wait before trying to sync for updates
                  subs.push(syncRecordPush(model, listOrRecord));
               });
            }
         }
      }
   }

   function syncListPush(model, list) {
      var store = model.store;
      list.subscribe(function(action, record, field) {
         return pushUpdate(action, list.model, record);
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
               //todo this doesn't deal with conflicts (update on server and client at same time)
               rec.updateAll(value);
               break;
            case 'moved':
               list.move(rec, prevSibling || 0);
               break;
            default:
               typeof(console) === 'object' && console.error && console.error('invalid action', _.toArray(arguments));
         }
         rec.isDirty(false); // record now matches server
      }, criteria);
   }

   function syncRecordPush(model, rec) {
      var store = model.store;
      return rec.subscribe(function(record, fieldChanged) {
         store.update(model, record).then(thenClearDirty(record));
      });
   }

   function pushUpdate(action, model, rec) {
      var def, store = model.store;
      switch(action) {
         case 'added':
            def = store.create(model, rec).then(function(id) {
               rec.updateHashKey(id);
            });
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
         //todo this doesn't deal with conflicts (update on server and client at same time)
         //todo-sort this ignores sortPriority, which is presably in the data, but should we rely on that?
         rec.updateAll(val);
         rec.isDirty(false); // record now matches server
      });
   }

   function thenClearDirty(rec) {
      return function(success) {
         success !== false && rec.isDirty(false);
      }
   }

   function _updateAction(rec, action) {
      if( action ) { return action; }
      else if( rec.hasKey() ) {
         return 'updated';
      }
      else {
         return 'created';
      }
   }

   function syncTarget(model, target, listOrRecord, subs, next) {
      console.log('syncTarget', target);
      var isObservableArray = ko.sync.isObservableArray(target);
      if( listOrRecord instanceof ko.sync.RecordList && !isObservableArray ) {
         throw new Error('RecordList only works with ko.observableArray instances '+target+', '+listOrRecord);
      }
      else if( isObservableArray ) {
         target.removeAll();
         var rec, data, it = listOrRecord.iterator();
         while(it.hasNext()) {
            rec = it.next();
            target.push(rec.getData());
            subs.push(new DataSync(target, rec, true));
         }
         //todo target
         //todo target
         //todo target
         //todo target
      }
      else {
         var isObservable = ko.isObservable(target);
         //todo target
         //todo target
         //todo target
         //todo target
      }
   }

   function DataSync(target, record, isObservable) {
      this.isList = record instanceof ko.sync.RecordList;
      this.isObs  = isObservable;
      this.target = target;

   }

   DataSync.prototype.dispose = function() {

   };

   function _sync(recList, obsArray, subs) {
      //todo-sync this belongs in SyncController
      subs = obsArray.subscribe(function(obsValue) {
         // diff the last version with this one and see what changed; we only have to look for deletions and additions
         // since all of our local changes will change byKey before modifying the observable array, feedback loops
         // are prevented here because anything already marked as added/deleted can be considered a prior change
         var existingRecords = recList.byKey;
         var alreadyDeleted  = recList.deleted;
         var currentData     = buildKeysForDataList(obsValue);

         // look for added keys
         _.each(currentData, function(key, i) {
            var v, prevId = _findPrevId(existingRecords, alreadyDeleted, currentData.keys, i);
            if( !_.has(existingRecords, key) ) {
               v = recList.model.newRecord(currentData.data[key]);
               // it's in the new values but not in the old values
               recList.added[key] = v;
               recList.numChanges++;
               putIn(recList, v, prevId, true);
            }
            else if(_.has(recList.delayed, key)) {
               v = recList.get(key);
               // clear the pending delete action
               clearTimeout(recList.delayed[key]);
               delete recList.delayed[key];
               // add the record to the cached and monitored content
               moveRec(recList, v, prevId);
            }
         });

         // look for deleted keys by seeing what our existing keys are are not already deleted and
         // do not appear in the new keyedValues list
         _.chain(existingRecords).keys().difference(_.keys(alreadyDeleted)).difference(currentData.keys).each(function(key) {
            recList.delayed[key] = setTimeout(function() {
               // it's in the old values and not marked as deleted, and not in the new values
               takeOut(recList, existingRecords[key]);
            }, 0);
         });
      });
   }

   /**
    * Only intended for use in _sync()
    * @private
    */
   function _findPrevId(existingRecords, deletedKeys, newKeys, idx) {
      //todo-sync this belongs in SyncController
      if( idx === 0 ) { return 0; }
      else if( idx < newKeys.length - 1 ) {
         var i = idx, key;
         while(i--) {
            key = newKeys[i];
            if( key in existingRecords && !key in deletedKeys ) {
               return key;
            }
         }
         return undef;
      }
      else {
         return undef;
      }
   }

   /**
    * Only intended for use in _sync
    */
   function buildKeysForDataList(model, obsValues) {
      //todo-sync this belongs in SyncController
      var keys = [], data = {};
      _.each(obsValues, function(data) {
         var key = RecordId.for(model, data);
         keys.push(key);
         data[key] = data;
      });
      return { keys: keys, data: data };
   }

})(jQuery);

