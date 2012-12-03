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
    * @param {Array} [records] ko.sync.RecordList or key/value objects to initialize the list
    * @constuctor
    */
   ko.sync.RecordList = function(model, records) {
      this.model     = model;
      this.byKey     = {};   // a list of all keys in this list for quick reference, deleted records are included here until checkpoint() is called
      this.listeners = [];   // a list of subscribers to events in this list
      this.subs      = [];   // a list of records to which this list has subscribed
      this.sorted    = [];
      this.checkpoint();     // refresh our changelists (added/changed/moved/deleted records)

      // create an observableArray and load our records into it
      if( records ) {
         this.load(ko.utils.unwrapObservable(records));
      }

      // we sync last as this simplifies the process of notifications
      // (we haven't subscribed yet and don't get a feedback loop from the observableArray)
      //_sync(this);
   };
   var RecordList = ko.sync.RecordList;

   /**
    * Clear any current change lists (added/updated/moved/deleted records) and begin tracking fresh from this point.
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.checkpoint = function() {
      // clear any existing changes
      _.each(this.changeList(), function(change) {
         this.clearEvent(change[0], change[1].hashKey());
      }.bind(this));
      // reset change list
      this.changes = { added: {}, updated: {}, moved: {}, deleted: {} };
      this.numChanges = 0;
      return this;
   };

   /**
    * @return {ko.sync.RecordList.Iterator}
    */
   ko.sync.RecordList.prototype.iterator = function() {
      return new RecordList.Iterator(this);
   };

   /**
    * True if any records in this list have been marked added/deleted/updated/moved.
    *
    * @return {boolean}
    */
   ko.sync.RecordList.prototype.isDirty = function() {
      return this.numChanges > 0;
   };

   /**
    * Add a new record to our observable array and record it as newly added.
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
    * @param {ko.sync.RecordId|ko.sync.Record|String|int} [afterRecordId] see description
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.add = function(record, afterRecordId) {
      if( _.isArray(record) ) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.add(record[i], afterRecordId);
            afterRecordId = record[i].getKey();
         }
      }
      else {
         var key = record.hashKey();
         if( !(key in this.byKey) ) {
            record.isDirty(true);
            this.changes.added[key] = record;
            this.numChanges++;
            this.load(record, afterRecordId, true);
         }
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
    * @param {ko.sync.Record|ko.sync.RecordId|String} recordOrId
    * @param {ko.sync.RecordId|ko.sync.Record|String|int} [afterRecordIdOrIndex] see description
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.move = function(recordOrId, afterRecordIdOrIndex) {
      var key = getHashKey(recordOrId);
      var record = _findRecord(this, key, true);
      if( key in this.byKey && !(key in this.changes.deleted) ) {
         var newLoc = _findInsertPosition(this, record, afterRecordIdOrIndex); // the exact index this element should be placed at
         var currentLoc = _recordIndex(this, record);
         if( currentLoc !== newLoc ) { // if these are equal, we've already recorded the move or it's superfluous
            // store in changelist
            if( !(key in this.changes.added) ) {
               this.changes.moved[key] = record;
               this.numChanges++;
            }

            var sortedKeys = this.sorted;

            // now we move it, we use the underlying element so this doesn't generate
            // two updates (a delete event followed by an add event)
            _.move(sortedKeys, currentLoc, newLoc);

            // determine what record we have moved it after
            var afterRecord;
            if( newLoc >= sortedKeys.length ) {
               newLoc--;
            }
            if( newLoc > 0 ) {
               // find the record before the new slot
               afterRecord = sortedKeys[newLoc-1];
            }

            // now we shoot off the correct notification
            _updateListeners(this.listeners, 'moved', record, afterRecord);
         }
      }
      else {
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
    * @param {ko.sync.Record|ko.sync.RecordId|String} recordId
    * @return {ko.sync.Record|null}
    */
   ko.sync.RecordList.prototype.find = function(recordId) {
      return _findRecord(this, recordId, true);
   };

   /**
    * Pushes a record into the observableArray; does not store anything in the added/updated/moved/deleted lists.
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
    * @param {ko.sync.RecordId|ko.sync.Record|int|String} [afterRecordId] see description
    * @param {boolean} [sendNotification] if true an added notification is sent
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.load = function(record, afterRecordId, sendNotification) {
      if(_.isArray(record)) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.load(record[i], afterRecordId, sendNotification);
            afterRecordId = afterRecordId? record[i].getKey() : undef;
         }
      }
      else if( !(record instanceof ko.sync.Record) ) {
         this.load(this.model.newRecord(record), afterRecordId, sendNotification);
      }
      else if( !(record.hashKey() in this.byKey) ) {
         var loc = putIn(this, record, afterRecordId, sendNotification);
         //todo-sort
      }
      else {
         console.warn('record already exists in this list', record.hashKey());
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
            if( !(key in this.changes.deleted) ) {
               // remove the record locally and mark it in our changelists
               takeOut(this, record);
            }
            else {
               console.log('record already deleted', key);
            }
         }
         else {
            console.log('record not in list (already removed?)', recordOrIdOrHash);
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
         if( hashKey in this.byKey && !(hashKey in this.changes.deleted) ) {
            if( !(hashKey in this.changes.added) ) {
               // if the record is already marked as newly added, don't mark it as updated and lose that status
               this.changes.updated[hashKey] = record;
               //delete this.changes.moved[hashKey];
               this.numChanges++;
            }
            //todo differentiate between moves and updates?
            _updateListeners(this.listeners, 'updated', record, field);
         }
         else {
            console.warn("Record "+hashKey+' not found (concurrent changes perhaps? otherwise it\'s probably a bad ID)');
         }
      }
      return this;
   };

   ko.sync.RecordList.prototype.clearEvent = function(action, hashKey) {
      if(_.isArray(action)) {
         _.each(action, function(a) { this.clearEvent(a, hashKey); }.bind(this));
      }
      else {
         if( action in {added: 1, deleted: 1, moved: 1, updated: 1} && hashKey in this.changes[action] ) {
            delete this.changes[action][hashKey];
            if( action === 'deleted' ) { delete this.byKey[hashKey]; }
            this.numChanges--;
         }
      }
      return this;
   };

   /**
    * Callbacks receive the following:
    *
    *
    * @param callback
    * @return {*}
    */
   ko.sync.RecordList.prototype.subscribe = function(callback) {
      this.listeners.push(callback);
      return this;
   };

   ko.sync.RecordList.prototype.dispose = function() {
      this.checkpoint();
      _.each(this.subs, function(s) { s.dispose(); });
      this.model = null;
      this.byKey = {};
      this.listeners = [];
      this.subs = [];
      return this;
   };

   ko.sync.RecordList.prototype.changeList = function() {
      var out = [], self = this;
      this.changes && _.each(this.changes, function(recs, action) {
         _.each(recs, function(rec) {
            switch(action) {
               case 'added':
               case 'moved':
                  out.push([action, rec, RecordList.keyBefore(self, rec.hashKey())]);
                  break;
               case 'deleted':
               case 'updated':
                  out.push([action, rec]);
                  break;
               default:
                  throw new Error('invalid changelist action: '+action);
            }
         });
      });
      return out;
   };

   /**
    * A debug method used to obtain the ordered hash key ids for each record
    * @param {ko.sync.RecordList} recordList
    * @return {Array} of string hashKeys
    */
   ko.sync.RecordList.ids = function(recordList) {
      return recordList.sorted.slice(0);
   };

   ko.sync.RecordList.atPos = function(list, i) {
      return list.find(list.sorted[i]);
   };

   ko.sync.RecordList.getPos = function(list, key) {
      return _.indexOf(list.sorted, key);
   };

   ko.sync.RecordList.keyBefore = function(list, key) {
      var pos = RecordList.getPos(list, key);
      if( pos > 0 ) {
         return RecordList.atPos(list, pos-1).hashKey();
      }
      else if( pos < 0 ) {
         return undef;
      }
      else {
         return null;
      }
   };

   ko.sync.RecordList.Iterator = function(list) {
      this.curr = -1;
      // snapshot to guarantee iterator is not mucked up if synced records update during iteration
      this.keys = RecordList.ids(list);
      this.recs = list.byKey; //todo does this also need to be snapshotted?
      this.len  = this.keys.length;
   };

   ko.sync.RecordList.Iterator.prototype.size    = function() { return this.len; };
   ko.sync.RecordList.Iterator.prototype.reset   = function(i) { this.curr = typeof(i) === 'number'? i : -1; };
   ko.sync.RecordList.Iterator.prototype.next    = function() { return this.hasNext()? this.recs[this.keys[++this.curr]] : null; };
   ko.sync.RecordList.Iterator.prototype.prev    = function() { return this.hasPrev()? this.recs[this.keys[--this.curr]] : null; };
   ko.sync.RecordList.Iterator.prototype.hasPrev = function() { return this.len && this.curr > 0; };
   ko.sync.RecordList.Iterator.prototype.hasNext = function() { return this.len && this.curr < this.len-1; };
   ko.sync.RecordList.Iterator.prototype.hash    = function() { return this.keys[this.curr]; };

   function takeOut(recList, record) {
      var key = record.hashKey();

      // mark dirty
      record.isDirty(true);

      if( key in recList.changes.added ) {
         // if the record is newly added, we just remove it from
         // the changelist (it never existed) and don't bother adding/deleting
         // stuff that only existed here momentarily
         delete recList.byKey[key];
      }
      else {
         // mark it deleted
         recList.changes.deleted[key] = record;
         recList.numChanges++;
      }

      // if rec is removed, that supersedes added/updated/moved status
      recList.clearEvent(['added', 'updated', 'moved'], key);

      //delete recList.byKey[key]; (deleted after checkpoint is called)

      // cancel subscription
      recList.subs[key].dispose();
      delete recList.subs[key];
      recList.sorted = _.without(recList.sorted, key);

      // send out notifications
      _updateListeners(recList.listeners, 'deleted', record);
   }

   function putIn(recList, record, afterRecordId, sendNotification) {
      var loc = _findInsertPosition(recList, record, afterRecordId);
      var key = record.hashKey();
      recList.byKey[key] = record;
      if( loc > -1 && loc < recList.sorted.length ) {
         recList.sorted.splice(loc, 0, key);
      }
      else {
         recList.sorted.push(key);
      }
      recList.subs[key] = record.subscribe(function(record, fieldChanged) {
         //todo differentiate between move events and updates
         //todo-sort
         recList.updated(record, fieldChanged);
      });
      if( sendNotification ) {
         _updateListeners(recList.listeners, 'added', record, RecordList.keyBefore(recList, key));
      }
      return loc;
   }

   /**
    * @param {ko.sync.Record|RecordId} recOrId
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
    * @param {ko.sync.Record|RecordId|String} recOrIdOrHash
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
      //todo optimize for mapped arrays
      var hashKey = getHashKey(recOrIdOrHash);
      return _.indexOf(list.sorted, hashKey);
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
    * In the case the `record` exists in the list, this method will also adjust for cases where slicing the element
    * out of the list would affect the index of the insert position.
    *
    * @param {RecordList} recList
    * @param {Record}     record    the record to move
    * @param {String|int|null} [afterRecordIdOrIndex] see description
    * @return {Number}
    * @private
    */
   function _findInsertPosition(recList, record, afterRecordIdOrIndex) {
      var numRecs = recList.sorted.length, loc = numRecs, currLoc;
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
            else if( currLoc === -1 || currLoc > loc ) {
               // when the element currently exists in the list and is positioned before the index we want to move it to,
               // it will effectively drop all the indices one place because we remove it and re-insert
               // which is the reason for the currLoc > loc check
               // when it's greater or not in the list, we need to add one to get the appropriate slot
               // (i.e. it goes after the record)
               loc++;
            }
            // this invisibly handles the case where currLoc === loc, meaning we aren't really moving
            // it at all, because it simply falls through, returning `loc` which will be equal to currLoc
            // which will be checked for by move ops (who don't want to dirty data that hasn't changed)
         }
      }
      else {
         loc = numRecs;
      }
      return loc;
   }

   function _findRecord(list, recOrIdOrHash, withholdDeleted) {
      var hashKey = getHashKey(recOrIdOrHash);
      if( hashKey in list.byKey && (!withholdDeleted || !(hashKey in list.changes.deleted)) ) { return list.byKey[hashKey]; }
      return null;
   }

   /**
    * @param callbacks
    * @param action
    * @param record
    * @param [meta] either a {string} field or {array} fields or {string} recordId
    * @private
    */
   function _updateListeners(callbacks, action, record, meta) {
      var i = -1, len = callbacks.length, args = $.makeArray(arguments).slice(1);
//      console.info(action, record.hashKey(), field, callbacks);
      while(++i < len) {
         callbacks[i].apply(null, args);
      }
   }

})(ko);

