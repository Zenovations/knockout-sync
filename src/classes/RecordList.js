/*******************************************
 * RecordList class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   var undef;

   //var ko = this.ko;
   //var _ = this._;

   /**
    * @param {ko.sync.Model} model
    * @param {Array} [records] ko.sync.Record objects to initialize the list
    * @constuctor
    */
   ko.sync.RecordList = function(model, records) {
      this.model     = model;
      this.byKey     = {}; // a list of all keys in this list for quick reference, deleted records are included here until checkpoint() is called
      this.cache     = {}; // a partial list of keys to indices to speed up retrieval
      this.listeners = []; // a list of subscribers to events in this list
      this.subs      = []; // a list of records to which this list has subscribed
      this.obsSub    = null; // a subscription to the observableArray (added by _sync, used by ko.sync.RecordList::dispose)
      this.checkpoint();   // refresh our changelists (added/changed/moved/deleted records)
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

      // we sync last as this simplifies the process of notifications
      // (we haven't subscribed yet and don't get a feedback loop from the observableArray)
      _sync(this);
   };

   /**
    * Clear any current change lists (added/updated/moved/deleted records) and begin tracking fresh from this point.
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.checkpoint = function() {
      var keys = this.byKey;
      // remove any keys which have been deleted
      _.has(this, 'deleted') && _.each(this.deleted, function(v, k) { delete keys[k]; });
      this.changed = {};
      this.added   = {};
      this.deleted = {};
      this.moved   = {};
      this.dirty   = false;
      return this;
   };

   /**
    * @return {ko.sync.RecordList.Iterator}
    */
   ko.sync.RecordList.prototype.iterator = function() {
      return new ko.sync.RecordList.Iterator(this);
   };

   /**
    * True if any records in this list have been marked added/deleted/updated/moved.
    *
    * @return {boolean}
    */
   ko.sync.RecordList.prototype.isDirty = function() {
      return this.dirty;
   };

   /**
    * Add a new record to our observable array and record it as newly added.
    *
    * If no afterRecordId is provided, the value is appended to the list. If the `afterRecordId` is set to {boolean}true,
    * then the value is prepended to the list instead.
    *
    * @param {ko.sync.Record} record
    * @param {ko.sync.RecordId|ko.sync.Record|String|boolean} [afterRecordId] see description
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.add = function(record, afterRecordId) {
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
         this.load(record, afterRecordId, 'added');
      }
      return this;
   };

   /**
    * Repositions the record within the observable array.
    *
    * If afterRecordId is a string, then it represents the hashKey of the record that will be immediately before our
    * insert position. If that record doesn't exist, then we append to the end.
    *
    * If afterRecordId is null or undefined, then we append to the end.
    *
    * If afterRecordId is a positive integer, then it is the exact position at which to insert our record. Thus,
    * 0 means insert it at position 0 (shift all records to the right 1), 1 means insert it immediately after record
    * 0, and so on.
    *
    * If afterRecordId is a negative integer, it is relative to the end position. Thus, -1 means just before
    * the last record, -2 means insert it before the last 2 records, etc.
    *
    * @param {ko.sync.Record} record
    * @param {ko.sync.RecordId|ko.sync.Record|String|int} [afterRecordIdOrIndex] see description
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.move = function(record, afterRecordIdOrIndex) {
      var key = record.hashKey();
      var newLoc = _findInsertPosition(this, record, afterRecordIdOrIndex); // the exact index this element should be placed at
      var currentLoc = _recordIndex(this, record);

      if( key in this.byKey && !(key in this.deleted) ) {
         if( currentLoc !== newLoc ) { // if these are equal, we've already recorded the move or it's superfluous
            _invalidateCache(this);

            // store in changelist
            this.moved[key] = record;

            // is the record's status already set to added?
            var wasAdded = key in this.added;

            // this is a hackish way to trick the notifications system into not marking this item deleted/added
            // and shooting of events as we move it out and back into the observableArray
            this.deleted[key] = record;
            wasAdded || (this.added[key] = record);

            // determine what record we have moved it after
            var afterRecord = null;
            if( newLoc > 0 ) {
               if( newLoc == currentLoc + 1 ) {
                  // we are moving it by 1 slot so the next record is the one we want
                  afterRecord = this.obs()[newLoc];
               }
               else {
                  // find the record before the new slot
                  afterRecord = this.obs()[newLoc-1];
               }
            }

            // now we move it
            _.move(this.obs, currentLoc, newLoc);

            // now we restore the changelists from our devious trickishness
            delete this.deleted[key];
            wasAdded || (delete this.added[key]);

            // now we shoot off the correct notification
            _updateListeners(this.listeners, 'moved', record, afterRecord);
         }
      }
      else if( typeof(console) === 'object' && console.warn ) {
         console.warn('attempted to move a record which doesn\'t exist; probably just a concurrent edit');
      }
      return this;
   };

   /**
    * Quickly located a record which exists in the observable array.
    *
    * Records which have been deleted will not be returned by this method (it only returns records in obsArray) even
    * though they are still tracked as deleted.
    *
    * @param recordId
    * @return {ko.sync.Record|null}
    */
   ko.sync.RecordList.prototype.find = function(recordId) {
      return _findRecord(this, recordId, true);
   };

   /**
    * Pushes a record into the observableArray; does not store anything in the added/updated/moved/deleted lists.
    *
    * If no afterRecordId is provided, the value is appended to the list. If the `afterRecordId` is set to {boolean}true,
    * then the value is prepended to the list instead.
    *
    * @param {ko.sync.Record} record
    * @param {ko.sync.RecordId|ko.sync.Record|String} [afterRecordId] see description
    * @param {boolean} [sendNotification] if true an added notification is sent
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.load = function(record, afterRecordId, sendNotification) {
      if(_.isArray(record)) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.load(record[i], afterRecordId);
            afterRecordId = afterRecordId? record[i].getKey() : undef;
         }
      }
      else {
         var loc = putIn(this, record, afterRecordId, sendNotification);
         this.obs.splice(loc, 0, record);
      }
      return this;
   };

   /**
    *
    * @param {ko.sync.RecordId|ko.sync.Record|String} recordOrIdOrHash
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.remove = function(recordOrIdOrHash) {
      if(_.isArray(recordOrIdOrHash) ) {
         var i = -1, len = recordOrIdOrHash.length;
         while(++i < len) {
            this.remove(recordOrIdOrHash[i]);
         }
      }
      else {
         var record = _findRecord(this, recordOrIdOrHash);
         if( record ) {
            var key = record.hashKey();

            if( !(key in this.deleted) ) {
               // remove the record locally and mark it in our changelists
               takeOut(this, record);

               // remove the record from the observableArray
               var idx = _recordIndex(this, key);
               this.obs.splice(idx, 1); // this will trigger a notification (handled by _sync)
            }
            else {
               console.warn('tried to delete the same record twice', key);
            }
         }
         else {
            console.warn('attempted to delete a record which doesn\'t exist in this list', recordOrIdOrHash);
         }
      }
      return this;
   };

   /**
    * @param {ko.sync.Record} record
    * @param {string} [field]
    */
   ko.sync.RecordList.prototype.updated = function(record, field) {
      if( record.isDirty() ) {
         var hashKey = record.hashKey();
         if( _recordIndex(this, hashKey) >= 0 ) { //todo-perf we could skip this check and just assume; do the checking at save time
            if( !(hashKey in this.added) ) {
               // if the record is already marked as newly added, don't mark it as updated and lose that status
               this.changed[hashKey] = record;
            }
            this.dirty = true;
            _updateListeners(this.listeners, 'updated', record, field);
         }
         else {
            console.warn("Record "+hashKey+' not found (concurrent changes perhaps? otherwise it\'s probably a bad ID)');
         }
      }
      return this;
   };

   ko.sync.RecordList.prototype.subscribe = function(callback) {
      this.listeners.push(callback);
      return this;
   };

   ko.sync.RecordList.prototype.dispose = function() {
      var i = this.subs.length;
      while(i--) {
         this.subs[i].dispose();
      }
      this.obsSub && this.obsSub.dispose();
      return this;
   };

   ko.sync.RecordList.Iterator = function(list) {
      this.curr = -1;
      // snapshot to guarantee iterator is not mucked up if synced records update during iteration
      this.recs = _.toArray(list.obs());
      this.len  = this.recs.length;
   };

   /**
    * A debug method used to obtain the ordered hash key ids for each record
    * @param {ko.sync.RecordList} recordList
    * @return {Array} of string hashKeys
    */
   ko.sync.RecordList.ids = function(recordList) {
      return _.map(recordList.obs(), function(v) { return v.hashKey(); });
   };

   ko.sync.RecordList.Iterator.prototype.size    = function() { return this.len; };
   ko.sync.RecordList.Iterator.prototype.reset   = function(i) { this.curr = typeof(i) === 'number'? i : -1; };
   ko.sync.RecordList.Iterator.prototype.next    = function() { return this.hasNext()? this.recs[++this.curr] : null; };
   ko.sync.RecordList.Iterator.prototype.prev    = function() { return this.hasPrev()? this.recs[--this.curr] : null; };
   ko.sync.RecordList.Iterator.prototype.hasPrev = function() { return this.len && this.curr > 0; };
   ko.sync.RecordList.Iterator.prototype.hasNext = function() { return this.len && this.curr < this.len-1; };

   function takeOut(recList, record) {
      var key = record.hashKey();

      // mark dirty
      recList.dirty = true;
      record.isDirty(true);

      // mark it deleted
      recList.deleted[key] = record;

      // if rec is removed, that supersedes added/updated status
      delete recList.added[key];
      delete recList.changed[key];


      // clear our indexes
      _invalidateCache(recList);
      //delete recList.byKey[key]; (deleted after checkpoint is called)

      // cancel subscription
      recList.subs[key].dispose();
      delete recList.subs[key];

      // send out notifications
      _updateListeners(recList.listeners, 'deleted', record);
   }

   function putIn(recList, record, afterRecordId, sendNotification) {
      var loc = _findInsertPosition(recList, record, afterRecordId);
      _invalidateCache(recList);
      _cacheAndMonitor(recList, record, loc);
      if( sendNotification ) {
         _updateListeners(recList.listeners, 'added', record);
      }
      return loc;
   }

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
         _cacheAndMonitor(list, r, i);
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
      list.subs[key] = record.subscribe(function(record, fieldChanged) {
         list.updated(record, fieldChanged);
      });
      list.cache[key] = position;
      list.byKey[key] = record;
   }

   /**
    * @param {ko.sync.Record|ko.sync.RecordId} recOrId
    * @return {ko.sync.RecordId}
    */
   function keyFor(recOrId) {
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

   /**
    * @param {ko.sync.Record|ko.sync.RecordId|String} recOrIdOrHash
    * @return {ko.sync.RecordId}
    */
   function getHashKey(recOrIdOrHash) {
      if( typeof(recOrIdOrHash) === 'string' ) {
         return recOrIdOrHash;
      }
      else {
         var key = keyFor(recOrIdOrHash);
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
    *
    * This keeps a partial/temporary cache of indices so that lookup speed can be improved.
    *
    * @param {ko.sync.RecordList} list
    * @param {ko.sync.Record|ko.sync.RecordId|String} recOrIdOrHash
    * @return {int}
    * @private
    */
   function _recordIndex(list, recOrIdOrHash) {
      var hashKey = getHashKey(recOrIdOrHash), cache = list.cache;
      if( hashKey && hashKey in cache ) {
         // do we have it in hand? (in our cache?)
         return cache[hashKey];
      }
      else if( hashKey && hashKey in list.byKey ) {
         // go fish! (look for it in the array)
         var key, vals = ko.utils.unwrapObservable(list.obs), i = vals.length;
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

   /**
    * Determine the position where a record should be inserted.
    *
    * If afterRecordId is a string, then it represents the hashKey of the record that will be immediately before our
    * insert position. If that record doesn't exist, then we append to the end.
    *
    * If afterRecordId is null or undefined, then we append to the end.
    *
    * If afterRecordId is a positive integer, then it is the exact position at which to insert our record. Thus,
    * 0 means insert it at position 0 (shift all records to the right 1), 1 means insert it immediately after record
    * 0, and so on.
    *
    * If afterRecordId is a negative integer, it is relative to the end position. Thus, -1 means just before
    * the last record, -2 means insert it before the last 2 records, etc.
    *
    * @param {RecordList} recList
    * @param {Record}     record    the record to move
    * @param {String|int|null} [afterRecordIdOrIndex] see description
    * @return {Number}
    * @private
    */
   function _findInsertPosition(recList, record, afterRecordIdOrIndex) {
      var numRecs = recList.obs().length, loc = numRecs, currLoc;
      // a null or undefined is interpreted as append to end of records
      if( afterRecordIdOrIndex !== undef && afterRecordIdOrIndex !== null ) {
         if( typeof(afterRecordIdOrIndex) === 'number' ) {
            // a number represents the exact position of the insert
            // a negative number is relative to the end
            loc = afterRecordIdOrIndex < 0? Math.max(numRecs - 1 + afterRecordIdOrIndex, 0) : Math.min(afterRecordIdOrIndex, numRecs);
         }
         else {
            loc = _recordIndex(recList, afterRecordIdOrIndex);
            currLoc = _recordIndex(recList, record);
            if( loc === -1 ) {
               // if the record wasn't found, we append
               loc = numRecs;
            }
            else if( currLoc > loc ) {
               // when loc < currLoc, it will be removed, dropping all the indices one place
               // when it's greater, we need to add one to get the appropriate slot (i.e. after the record)
               loc++;
            }
         }
      }
      return loc;
   }

   function _findRecord(list, recOrIdOrHash, withholdDeleted) {
      var hashKey = getHashKey(recOrIdOrHash);
      if( hashKey in list.byKey && (!withholdDeleted || !(hashKey in list.deleted)) ) { return list.byKey[hashKey]; }
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
//      console.info(action, record.hashKey(), field, callbacks);
      while(++i < len) {
         callbacks[i](action, record, field);
      }
   }

   function _sync(recList) {
      recList.obsSub = recList.obs.subscribe(function(obsValue) {
         if( recList.ignoreNextEvent ) { //todo unused
            // notification suppressed
            recList.ignoreNextEvent = false;
         }
         else {
            // diff the last version with this one and see what changed; we only have to look for deletions and additions
            // since all of our local changes will change byKey before modifying the observable array, feedback loops
            // are prevented here because anything already marked as added/deleted can be considered a prior change
            var existingKeys = recList.byKey, alreadyDeleted = recList.deleted;
            var obsKeys = [];

            // look for added keys
            _.each(obsValue, function(v, i) {
               var key = v.hashKey();
               if( !_.has(existingKeys, key) ) {
                  // it's in the new values but not in the old values
                  putIn(recList, v, _findPrevId(existingKeys, alreadyDeleted, obsValue, i), true);
               }
               obsKeys.push(v.hashKey()); // saves an iteration to collect the keys
            });

            // look for deleted keys
            _.chain(existingKeys).keys().difference(_.keys(alreadyDeleted)).difference(obsKeys).each(function(key) {
               // it's in the old values and not marked as deleted, but not in the new values
               takeOut(recList, existingKeys[key]);
            });
         }
         recList.lastUpdate = obsValue.slice();
      });
   }

   function _findPrevId(existingKeys, deletedKeys, list, idx) {
      if( idx === 0 ) { return 0; }
      else if( idx < list.length - 1 ) {
         var i = idx, key;
         while(i--) {
            key = list[i].hashKey;
            if( key in existingKeys && !key in deletedKeys ) {
               return key;
            }
         }
         return undef;
      }
      else {
         return undef;
      }
   }

//   ko.sync || (ko.sync = {});

})(ko);

