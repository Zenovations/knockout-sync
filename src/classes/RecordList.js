/*******************************************
 * RecordList class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   //var ko = this.ko;
   //var _ = this._;

   /**
    * @var ko.sync.RecordList
    * @param {ko.sync.Model} model
    * @param {Array} [records] ko.sync.Record objects to initialize the list
    * @constuctor
    */
   var RecordList = function(model, records) {
      this.changed   = [];
      this.added     = [];
      this.deleted   = [];
      this.dirty     = false;
      this.model     = model;
      this.recs      = {};
      this.listeners = [];
      if( records ) { this.load(records); }
   };

   RecordList.prototype.checkpoint = function() {
      this.changed = [];
      this.added   = [];
      this.deleted = [];
      this.dirty   = false;
   };

   RecordList.prototype.store = function() {
      //todo
   };

   RecordList.prototype.iterator = function() {
      return new RecordList.Iterator(this);
   };

   RecordList.prototype.isDirty = function() {
      return this.dirty;
   };

   RecordList.prototype.add = function(record) {
      if( _.isArray(record) ) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.add(record[i]);
         }
      }
      else {
         record.isDirty(true);
         var key = record.hashKey();
         this.added.push(key);
         this.dirty = true;
         this.load(record);
      }
      //todo _updateListeners
   };

   RecordList.prototype.load = function(record) {
      if(_.isArray(record)) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.load(record[i]);
         }
      }
      else {
         record.subscribe(_.bind(this.updated, this));
         var key = record.hashKey();
         this.recs[key] = record;
      }
   };

   RecordList.prototype.remove = function(recordOrId) {
      var record = _findRecord(this.recs, recordOrId);
      if( record ) {
         var key = record.hashKey();
         record.isDirty(true);
         this.dirty = true;
         this.deleted.push(record);
         delete this.recs[key];
         _updateListeners(this.listeners, 'deleted', record);
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
               if( record.hashKey() in this.recs ) {
                  this.changed.push(record);
                  this.dirty = true;
               }
               else if( typeof(console) === 'object' && console.warn ) {
                  console.warn("Record "+record.hashKey()+' not found (concurrent changes perhaps? otherwise it\'s probably a bad ID)');
               }
            }
            break;
         default:
            throw new Error('Invalid status '+state);
      }
      //todo _updateListeners
      //todo when the sortPriority field is updated, this triggers a move operation
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

   RecordList.Iterator = function(list) {
      this.curr = -1;
      // snapshot to guarantee iterator is not mucked up if synced records update during iteration
      this.recs = _.toArray(list.recs);
      this.len  = this.recs.length;
   };

   RecordList.Iterator.prototype.size    = function() { return this.len; };
   RecordList.Iterator.prototype.reset   = function() { this.curr = -1; };
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

   function _findRecord(list, recOrId) {
      var key = _keyFor(recOrId);
      if( key === null ) {
         return null;
      }
      else {
         return list[ key.hashKey() ];
      }
   }

   function _updateListeners(callbacks, value) {
      var i = -1, len = callbacks.length;
      while(++i < len) {
         callbacks[i](value);
      }
   }

//   ko.sync || (ko.sync = {});
   ko.sync.RecordList = RecordList;

})(ko);

