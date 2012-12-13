
(function(ko) {
   "use strict";
   var undefined;

   function FeedbackFilter() {
      // the indexed list of expected feedback events
      // this is coupled with FeedbackFilter.test.js::entriesForKey; update that whenever changing this structure
      this.expecting = {};
   }

   /**
    * Given an event, such as {to: store, action: delete}, this "expects" the feedback (i.e. the inverse event)
    * of that event, which in this case would be {to: obs, action: delete}.
    *
    * @param {Object} x
    * @return {FeedbackFilter} this
    */
   FeedbackFilter.prototype.expect = function(x) {
      //todo make all expected events expire after, say, a minute? two minutes?
      //todo or maybe when they fail?
      var entry = FeedbackEntry.make(x);
      var set = _.findOrCreate(this.expecting, [], entry.to, entry.action, entry.key);
      var idx = _.findIndex(set, entry);
      if( idx === -1 ) {
         set.push(entry);
      }
      else {
         console.warn('tried to add an element already in the expected list (should you call clear() or find() first?)', entry.to, entry.action, entry.key);
      }
      return this;
   };

   /**
    * @param {Object} x
    * @return {Object|null}
    */
   FeedbackFilter.prototype.find = function(x) {
      var entry = FeedbackEntry.make(x);
      var set = _.deepFind(this.expecting, entry.to, entry.action, entry.key);
      var idx = set? _.findIndex(set, entry) : -1;
      return idx > -1? set[idx] : null;
   };

   /**
    * Clears a feedback event from the list, if it exists, and returns true if it was found.
    *
    * @param {Object} x
    * @return {boolean} true if event was found
    */
   FeedbackFilter.prototype.clear = function(x) {
      var e = FeedbackEntry.make(x);
      return removeExpected(this.expecting, e);
   };

   FeedbackFilter.KEYS = ['action', 'to', 'key', 'prevId', 'data'];

   function removeExpected(expectedCache, entry) {
      var set = _.deepFind(expectedCache, [entry.to, entry.action, entry.key]);
      if( set ) {
         var originalLength = set.length;
         _.remove(set, entry);
         if( set.length === 0 ) {
            // free memory
            _.deepRemove(expectedCache, entry.key, entry.to, entry.action);
         }
         return set.length < originalLength;
      }
      else {
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

