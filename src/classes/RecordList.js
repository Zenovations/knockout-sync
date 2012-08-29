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
      this.obs       = ko.observableArray();
      this.keys      = {};
      this.listeners = [];
      this.subs      = []; // replaced when sync() is called
      this.checkpoint();
      if( records ) { this.load(records); }
      _sync(this);
   };

   RecordList.prototype.checkpoint = function() {
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
      return _findRecord(this.obs, recordId);
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
         var key = record.hashKey(), loc, aKey = afterRecordId? afterRecordId.hashKey() : null;
         this.subs[key] = record.subscribe(_.bind(this.updated, this));
         if( aKey && aKey in this.keys ) {
            loc = this.keys[key] = this.keys[aKey]+1;
            _shiftKeys(this.keys, key, false);
            this.obs.splice(loc, 0, record);
         }
         else {
            this.keys[key] = this.obs.push(record)-1;
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
         var record = _findRecord(this.keys, this.obs, recordOrId);
         if( record ) {
            var key = record.hashKey();

            if( !(key in this.deleted) ) {
               // mark dirty
               this.dirty = true;

               // if rec is removed, take it out of the added/updated list
               delete this.added[key];
               delete this.updated[key];

               record.isDirty(true);
               this.deleted[key] = record;
               // remove the record
               var idx = this.keys[key];
               this.obs.splice(idx, 1);
               _shiftKeys(this.keys, key, true);
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
               if( hashKey in this.keys ) {
                  if( !(hashKey in this.added) ) {
                     // if the record is already marked as newly added, don't mark it as an update too
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

   function _findRecord(keys, obs, recOrIdOrHash) {
      var hashKey = _hashKey(recOrIdOrHash);
      if( hashKey && hashKey in keys ) {
         return obs()[ keys[hashKey] ];
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

   function _shiftKeys(keys, from, down) {
      //todo
      //todo
      //todo
      //todo
      //todo
   }

//   ko.sync || (ko.sync = {});
   ko.sync.RecordList = RecordList;

})(ko);

