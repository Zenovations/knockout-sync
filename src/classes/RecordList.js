/*******************************************
 * RecordList class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   var undef;

   //var ko = this.ko;
   //var _ = this._;

   /**
    * @var ko.sync.RecordList
    * @param {ko.sync.Model} model
    * @param {Array} [records] ko.sync.Record objects to initialize the list
    * @constuctor
    */
   var RecordList = function(model, records) {
      this.model     = model;
      this.keys      = {}; // a list of all keys in this list for quick reference
      this.cache     = {}; // a partial list of keys to indices to speed up retrieval
      this.listeners = []; // a list of subscribers to events in this list
      this.subs      = []; // a list of records to which this list has subscribed
      this.checkpoint();   // refresh our list of added/changed/deleted records
      if( records && ko.isObservable(records) ) {
         // use the `records` object as our observableArray
         this.obs = records;
         _checkAndCacheAll(this, model);
      }
      else {
         // create an observableArray and load our records into it
         this.obs = ko.observableArray();
         if( records ) {
            this.load(records);
         }
      }
      _sync(this);
   };

   RecordList.prototype.checkpoint = function() {
      var keys = this.keys;
      var cache = this.cache;
      // remove any keys which have been deleted
      _.each(this.deleted, function(v, k) {
         delete keys[k];
      });
      this.changed = {};
      this.added   = {};
      this.deleted = {};
      this.dirty   = false;
   };

   RecordList.prototype.iterator = function() {
      return new RecordList.Iterator(this);
   };

   RecordList.prototype.isDirty = function() {
      return this.dirty;
   };

   RecordList.prototype.add = function(record, afterRecordId) {
      if( _.isArray(record) ) {
         var i = -1, len = record.length;
         while(++i < len) {
            // add them in reverse so they end up in order
            this.add(record[i], afterRecordId);
            afterRecordId = record[i].getKey();
         }
      }
      else {
         var key = record.hashKey();
         record.isDirty(true);
         this.added[key] = record;
         this.dirty = true;
         this.load(record, afterRecordId);
         _updateListeners(this.listeners, 'added', record);
      }
   };

   RecordList.prototype.move = function(record, afterRecordId) {
      //todo
      //todo
      //todo
      //todo
   };

   RecordList.prototype.find = function(recordId) {
      return _findRecord(this, recordId);
   };

   RecordList.prototype.load = function(record, afterRecordId) {
      if(_.isArray(record)) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.load(record[i], afterRecordId);
            afterRecordId = afterRecordId? record[i].getKey() : undef;
         }
      }
      else {
         var afterRecordPos = _recordIndex(this, afterRecordId);
         if( afterRecordPos > 0 ) {
            var loc = afterRecordPos+1;
            this.obs.splice(loc, 0, record);
            _invalidateCache(this);
            _cacheAndMonitor(this, record, loc);
         }
         else {
            _cacheAndMonitor(this, record, this.obs.push(record)-1);
         }
      }
   };

   RecordList.prototype.remove = function(recordOrId) {
      if(_.isArray(recordOrId) ) {
         var i = -1, len = recordOrId.length;
         while(++i < len) {
            this.remove(recordOrId[i]);
         }
      }
      else {
         var record = _findRecord(this, recordOrId);
         if( record ) {
            var key = record.hashKey();

            if( !(key in this.deleted) ) {
               // mark dirty
               this.dirty = true;
               record.isDirty(true);

               // mark it deleted
               this.deleted[key] = record;

               // if rec is removed, that supersedes added/updated status
               delete this.added[key];
               delete this.changed[key];

               // remove the record
               var idx = _recordIndex(this, key);
               this.obs.splice(idx, 1);

               // clear our indexes
               _invalidateCache(this);
               delete this.keys[key];

               // cancel subscription
               this.subs[key].dispose();
               delete this.subs[key];

               // trigger event
               _updateListeners(this.listeners, 'deleted', record);
            }
            else {
               console.warn('tried to delete the same record twice', key);
            }
         }
         else {
            console.warn('attempted to delete a record which doesn\'t exist in this list', recordOrId);
         }
      }
   };

   /**
    * @param {ko.sync.Record} record
    * @param {string} [state]
    */
   RecordList.prototype.updated = function(state, record, field) {
      if( typeof(state) !== 'string' && arguments.length < 3 ) {
         field = record;
         record = state;
         state = 'updated';
      }
      switch(state) {
         case 'deleted':
            this.remove(record);
            break;
         case 'added':
            this.add(record);
            break;
         case 'updated':
            if( record.isDirty() ) {
               var hashKey = record.hashKey();
               if( _recordIndex(this, hashKey) >= 0 ) { //todo-perf we could skip this check and just assume; do the checking at save time
                  if( !(hashKey in this.added) ) {
                     // if the record is already marked as newly added, don't mark it as updated and lose that status
                     this.changed[hashKey] = record;
                  }
                  this.dirty = true;
               }
               else {
                  console.warn("Record "+hashKey+' not found (concurrent changes perhaps? otherwise it\'s probably a bad ID)');
               }
            }
            break;
         default:
            throw new Error('Invalid status '+state);
      }
      return true;
   };

   RecordList.prototype.subscribe = function(callback) {
      var listeners = this.listeners;
      listeners.push(callback);
      return {
         dispose: function() {
            var idx = _.indexOf(listeners, callback);
            if( idx >= 0 ) { listeners.splice(idx, 1); }
         }
      };
   };

   RecordList.prototype.dispose = function() {
      var i = this.subs.length;
      while(i--) {
         this.subs[i]();
      }
   };

   RecordList.Iterator = function(list) {
      this.curr = -1;
      // snapshot to guarantee iterator is not mucked up if synced records update during iteration
      this.recs = _.toArray(list.obs());
      this.len  = this.recs.length;
   };

   RecordList.Iterator.prototype.size    = function() { return this.len; };
   RecordList.Iterator.prototype.reset   = function(i) { this.curr = typeof(i) === 'number'? i : -1; };
   RecordList.Iterator.prototype.next    = function() { return this.hasNext()? this.recs[++this.curr] : null; };
   RecordList.Iterator.prototype.prev    = function() { return this.hasPrev()? this.recs[--this.curr] : null; };
   RecordList.Iterator.prototype.hasPrev = function() { return this.len && this.curr > 0; };
   RecordList.Iterator.prototype.hasNext = function() { return this.len && this.curr < this.len-1; };

   /**
    * Only intended to be used during load operations where the observableArray has already been populated.
    * @param list
    * @private
    */
   function _checkAndCacheAll(list, model) {
      var vals = ko.utils.unwrapObservable(list.obs), i = vals.length, r;
      while(i--) {
         r = vals[i];
         if( !(r instanceof ko.sync.Record) ) {
            vals[i] = r = model.newRecord(r);
         }
         _cacheAndMonitor(this, r, i);
      }
   }

   /**
    * Add a record to the cache and subscribe to the record to get notifications of any changes. Only intended to
    * be used by load operations.
    * @param {ko.sync.RecordList} list
    * @param {ko.sync.Record} record
    * @param {int} position
    * @private
    */
   function _cacheAndMonitor(list, record, position) {
      var key = record.hashKey();
      list.subs[key] = record.subscribe(_.bind(list.updated, this));
      list.cache[key] = position;
      list.keys[key] = key;
   }

   function _keyFor(recOrId) {
      if( typeof(recOrId) !== 'object' || !recOrId ) {
         return null;
      }
      else if( _.isFunction(recOrId['getKey']) ) {
         return recOrId.getKey();
      }
      else {
         return recOrId;
      }
   }

   function _hashKey(recOrIdOrHash) {
      if( typeof(recOrIdOrHash) === 'string' ) {
         return recOrIdOrHash;
      }
      else {
         var key = _keyFor(recOrIdOrHash);
         return key? key.hashKey() : null;
      }
   }

   function _invalidateCache(list) {
      // because the cache doesn't have a guaranteed order and items aren't entered into it in the same sorted way
      // they are put into the observable, any time the observable changes, our cache of keys to indices becomes invalid
      // (unless the item was just added to the end, in which case we're fine!)
      list.cache = {};
   }

   /**
    * Locate a record's position in the observable array. If it isn't found, return -1
    * @param {ko.sync.RecordList} list
    * @param {ko.sync.Record|ko.sync.RecordId|String} recOrIdOrHash
    * @return {int}
    * @private
    */
   function _recordIndex(list, recOrIdOrHash) {
      var hashKey = _hashKey(recOrIdOrHash), cache = list.cache;
      if( hashKey && hashKey in cache ) {
         // do we have it in hand? (in our cache?)
         return cache[hashKey];
      }
      else if( hashKey && hashKey in list.keys ) {
         // go fish! (look for it in the array)
         var key, vals = ko.unwrapObservable(list.obs), i = vals.length;
         while(i--) {
            key = vals[i].hashKey();
            if( !(key in cache) ) {
               // rebuild cache as we go
               cache[key] = i;
            }
            if( key == hashKey ) { return i; }
         }
      }
      // it's not in our list, so -1 it
      return -1;
   }

   function _findRecord(list, recOrIdOrHash) {
      var idx = _recordIndex(list, recOrIdOrHash);
      if( idx >= 0 ) {
         return ko.utils.unwrapObservable(list.obs)[idx];
      }
      return null;
   }

   /**
    * @param callbacks
    * @param action
    * @param record
    * @param [field]
    * @private
    */
   function _updateListeners(callbacks, action, record, field) {
      var i = -1, len = callbacks.length;
      while(++i < len) {
         callbacks[i](action, record, field);
      }
   }

   function _sync(reclist) {
      var obSub = reclist.dispose = reclist.obs.subscribe(function() {
         //todo find some way to ignore our own changes!
         //todo compare and adjust
         //todo obsarray only throws off adds and deletes (no updates to be concerned about)
         //todo call _updateListeners
         //todo
         //todo
      });
      reclist.subs.push(obSub);
   }

//   ko.sync || (ko.sync = {});
   ko.sync.RecordList = RecordList;

})(ko);

