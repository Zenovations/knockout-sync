
(function($) {
   "use strict";
   var undefined;

   module('FeedbackFilter');

   var FF = ko.sync.FeedbackFilter;

   test('#expect', function() {
      var f = new FF(), data = eventData();
      f.expect(data);
      deepEqual(result(f.find(data)), resultInvert(data));
   });

   test('#expect, duplicate', function() {
      var f = makeFilterWithData(), data = eventData({action: 'update', data: {intOptional: 1}});
      var originalNumber = entriesForKey(f, data.key).length;
      f.expect(data);
      strictEqual(entriesForKey(f, data.key).length, originalNumber);
   });

   test('#clear, in list', function() {
      expect(3);
      var f = makeFilterWithData(), data = eventData();
      ok(f.find(data), 'has entry before clear');
      strictEqual(f.clear(data), true, 'clear() returns true');
      strictEqual(f.find(data), null, 'does not have entry after clear');
   });

   test('#clear, not in list', function() {
      expect(2);
      var f = makeFilterWithData(), data = eventData({data: {a: 'a'}});
      var origNumber = entriesForKey(f, data.key).length;
      strictEqual(f.clear(data), false, 'clear() returns false');
      strictEqual(entriesForKey(f, data.key).length, origNumber, 'clear did not remove entry');
   });

   test('#find, not in list', function() {
      expect(2);
      var f = new FF();
      strictEqual(f.find(eventData()), null, 'empty list works');
      f = makeFilterWithData();
      strictEqual(f.find(eventData({action: 'update', data: {intOptional: 2}})), null, 'list with entries works');
   });

   test('#find, in list', function() {
      expect(2);
      var f = makeFilterWithData(), data1 = eventData(), data2 = eventData({action: 'update', data: {intOptional: 1}});
      deepEqual(result(f.find(data1)), resultInvert(data1), 'data1 in list');
      deepEqual(result(f.find(data2)), resultInvert(data2), 'data2 in list');
   });

   /**
    * Intended mainly for test units, this provides a method to retrieve all feedback entries for a given key
    * without accessing the internals of FeedbackFilter.
    *
    * @param {ko.sync.FeedbackFilter} filter
    * @param {String} key
    * @return {Array}
    */
   function entriesForKey(filter, key) {
      var out = [];
      _.each(filter.expecting, function(actions) {
         _.each(actions, function(entries) {
            _.each(entries, function(vals, key) {
               if( key === key ) {
                  Array.prototype.push.apply(out, vals);
               }
            })
         });
      });
      return out;
   }

   function makeFilterWithData() {
      var filter = new FF();
      for(var i=1; i < 10; i++) {
         var key = 'record-'+i;
         filter.expect(eventData({key: key}));
         filter.expect(eventData({key: key, action: 'update', data: { intOptional: i }}));
      }
      return filter;
   }

   function resultInvert(data) {
      return result(_.extend({}, data, {to: data.to=='obs'? 'store' : 'obs'}));
   }

   function result(data) {
      return data? _.pick(data, FF.KEYS) : null;
   }

   function eventData(moreData) {
      return _.extend({
         action: 'create',
         to:     'store',
         key:    'record-1',
         prevId: undefined,
         data:   undefined
      }, moreData);
   }

})(jQuery);

