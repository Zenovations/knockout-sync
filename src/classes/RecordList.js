/*******************************************
 * RecordList class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   /**
    * @var ko.sync.RecordList
    * @param {ko.sync.Model} model
    * @param {Array} [records] ko.sync.Record objects to initialize the list
    * @constuctor
    */
   var RecordList = function(model, records) {
      this.changed = [];
      this.added   = [];
      this.deleted = [];
      this.dirty   = false;
      this.model   = model;
      this.recs    = {};
      if( records ) { this.add(records); }
      this.checkpoint();
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
         var key = record.getKey().valueOf();
         record.subscribe(this.updated);
         this.recs[key] = record;
         this.added.push(key);
         this.dirty = true;
      }
   };

   RecordList.prototype.remove = function(recordOrId) {
      var record = _findRecord(this.iterator(), recordOrId);
      if( record ) {
         var key = record.getKey().valueOf();
         delete this.recs[key];
         ko.utils.arrayRemoveItem(this.recs, record);
         this.deleted.push(record);
         this.dirty = true;
      }
      else {
         console.log('could not find record', recordOrId);
      }
   };

   /**
    * @param {ko.sync.Record} record
    * @param {string} [state]
    */
   RecordList.prototype.updated = function(record, state) {
      switch(state) {
         case 'deleted':
            this.remove(record);
            break;
         case 'added':
            this.add(record);
            break;
         default:
            if( _recordFound(this, record) && record.isDirty() ) {
               this.changed.push(record);
               this.dirty = true;
            }
      }
      return true;
   };

   RecordList.Iterator = function(list) {
      this.curr = -1;
      // snapshot to guarantee iterator is not mucked up if synced records update during iteration
      this.recs = _.prototype.slice.call(list.recs);
      this.len  = this.recs.length;
   };

   RecordList.Iterator.prototype.size    = function() { return this.len; };
   RecordList.Iterator.prototype.reset   = function() { this.curr = -1; };
   RecordList.Iterator.prototype.next    = function() { return this.hasNext()? this.recs[++this.curr] : null; };
   RecordList.Iterator.prototype.prev    = function() { return this.hasPrev()? this.recs[--this.curr] : null; };
   RecordList.Iterator.prototype.hasPrev = function() { return this.len && this.curr > 0; };
   RecordList.Iterator.prototype.hasNext = function() { return this.len && this.curr < this.len-1; };

   function _findRecord(list, recId) {
      if( typeof(recId) !== 'object' || !recId ) {
         return null;
      }
      else {
         return list.recs[ recId.valueOf() ];
      }
   }

   function _recordFound(list, record) {
      return _findRecord(list, record) !== null;
   }

   ko.sync || (ko.sync = {});
   ko.sync.RecordList = RecordList;

})(ko);

