
(function(ko) {
   "use strict";
   var undefined;

   function FeedbackFilter() {
      // the indexed list of expected feedback events
      // this is coupled with FeedbackFilter.test.js::entriesForKey; update that whenever changing this structure
      this.expecting = {};
   }

   /**
    * @param {Object} x
    * @return {FeedbackFilter} this
    */
   FeedbackFilter.prototype.expect = function(x) {
      //todo make all expected events expire after, say, a minute? two minutes?
      var entry = FeedbackEntry.make(x);
      var set = _.findOrCreate(this.expecting, [], entry.to, entry.action, entry.key);
      var idx = _.findIndex(set, entry);
      if( idx === -1 ) {
         console.log('expect', entry.to, entry.action, entry.key); //debug
         set.push(entry);
      }
      else {
         console.warn('tried to add an element already in the expected list (did you mean to call expectOrClear?)', entry.to, entry.action, entry.key);
      }
      return this;
   };

   /**
    * @param {Object} x
    * @return {Object|null}
    */
   FeedbackFilter.prototype.find = function(x) {
      var entry = FeedbackEntry.make(x);
      console.log('find', entry.to, entry.action, entry.key); //debug
      var set = _.deepFind(this.expecting, entry.to, entry.action, entry.key);
      var idx = set? _.findIndex(set, entry) : -1;
      return idx > -1? set[idx] : null;
   };

   /**
    * @param {Object} x
    * @return {FeedbackFilter} this
    */
   FeedbackFilter.prototype.clear = function(x) {
      var e = FeedbackEntry.make(x);
      console.log('clear', e.to, e.action, e.key); //debug
      return removeExpected(this.expecting, e);
   };

   /**
    * @param {Object} x
    * @return {boolean} true if the item was added, false if it was cleared
    */
   FeedbackFilter.prototype.expectOrClear = function(x) {
      var e = FeedbackEntry.make(x);
      console.log('expectOrClear', e.to, e.action, e.key); //debug
      if( removeExpected(this.expecting, e) ) {
         this.clear(x);
         return false;
      }
      else {
         this.expect(e);
         return true;
      }
   };

   FeedbackFilter.KEYS = ['action', 'to', 'key', 'prevId', 'data'];

   function removeExpected(expectedCache, entry) {
      var set = _.deepFind(expectedCache, [entry.to, entry.action, entry.key]);
      if( set ) {
         console.log('set'); //debug
         var originalLength = set.length;
         _.remove(set, entry);
         if( set.length === 0 ) {
            // free memory
            _.deepRemove(expectedCache, entry.key, entry.to, entry.action);
         }
         console.log('removeExpected', set.length < originalLength, entry); //debug
         return set.length < originalLength;
      }
      else {
         console.log('notta', expectedCache); //debug
         return false;
      }
   }

   function FeedbackEntry(data) {
      //todo this could be replaced with a Factory for diverse usage
      this.action = undefined;
      this.to     = undefined;
      this.key    = undefined;
      this.prevId = undefined;
      this.data   = undefined;
      _.extend(this, _.pick(data, FeedbackFilter.KEYS));
      this.to = _invertTo(this.to);

      if( this.data ) {
         this.data = ko.sync.unwrapAll(this.data);
      }

      var HK = ko.sync.KeyFactory.HASHKEY_FIELD;
      if( !this.key || typeof(this.key) === 'function' ) {
         if( typeof(data.key) === 'function' ) { this.key = data.key(); }
         else if( data.rec ) { this.key = data.rec.hashKey(); }
         else if( HK in data ) {
            this.key = data[HK];
         }
         else if( data.data && HK in this.data ) {
            this.key = this.data[HK];
         }
      }
   }

   FeedbackEntry.make = function(x) {
      if( x instanceof FeedbackEntry ) {
         return x;
      }
      else {
         return new FeedbackEntry(x);
      }
   };

   FeedbackEntry.prototype.equals = function(o) {
      return o instanceof FeedbackEntry && _.isEqual(o, this);
   };

   function _invertTo(to) {
      switch(to) {
         case 'store':
            return 'obs';
         case 'obs':
            return 'store';
         default:
            throw new Error('invalid destination: '+to);
      }
   }

   /**
    * @type {FeedbackFilter}
    * @constructor
    */
   ko.sync.FeedbackFilter = FeedbackFilter;

})(ko);

