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
      this.changed = [];
      this.added   = [];
      this.deleted = [];
      this.dirty   = false;
      this.model   = model;
      this.recs    = {};
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
         ko.utils.arrayRemoveItem(this.recs, record);
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
            if( state && state !== 'updated' ) {
               throw new Error('Invalid status '+state);
            }
            if( record.isDirty() && record.hashKey() in this.recs ) {
               this.changed.push(record);
               this.dirty = true;
            }
      }
      return true;
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

//   ko.sync || (ko.sync = {});
   ko.sync.RecordList = RecordList;

})(ko);

