
jQuery(function($) {
   "use strict";
   var undef;

   var genericModel = new ko.sync.Model(ko.sync.TestData.genericModelProps);
   var genericData  = $.extend({}, ko.sync.TestData.genericDataWithId);

   // create a generic list of test records
   function testRecord(model, base, i) {
      var data = $.extend({}, base);
      data.id = 'record-'+i;
      data.requiredInt = i;
      data.requiredFloat = i + (i * .01);
      data.requiredString = 'string-'+i;
      return model.newRecord(data);
   }

   function testData(model, base, len) {
      var recs = [];
      for(var i = 1; i <= len; i++) {
         recs.push(testRecord(genericModel, genericData, i));
      }
      return recs;
   }

   module('RecordList');

   test('#checkpoint', function() {
      var list = new ko.sync.RecordList(genericModel);
      list.add( testData(genericModel, genericData, 2) );
      strictEqual(list.isDirty(), true, 'list is dirty after adding records');
      list.checkpoint();
      strictEqual(list.isDirty(), false, 'not dirty after checkpoint');
   });

   test('#iterator', function() {
      var it,
          recs = testData(genericModel, genericData, 5),
          list = new ko.sync.RecordList(genericModel);
      // try one before we have any records
      it = list.iterator();
      ok(it instanceof ko.sync.RecordList.Iterator, 'instanceof iterator');
      strictEqual(it.len, 0, 'iterator has no records');
      list.add(recs);
      it = list.iterator();
      ok(it instanceof ko.sync.RecordList.Iterator, 'instanceof iterator');
      strictEqual(it.len, 5, 'has correct number of records');
   });

   test('#isDirty', function() {
      var recs = testData(genericModel, genericData, 5), list = new ko.sync.RecordList(genericModel, recs);
      strictEqual(list.isDirty(), false);
      // changing a record should cascade out to the list
      recs[0].set('intOptional', 99);
      strictEqual(list.isDirty(), true);
   });

   test('#add', function() {
      var data = testData(genericModel, genericData, 5), list = new ko.sync.RecordList(genericModel, data.slice(0, 4)),
          newRec = testRecord(genericModel, data.slice(4,5)[0]), key = newRec.getKey().valueOf();
      list.checkpoint();
      strictEqual(list.isDirty(), false, 'list is not dirty before add');
      ok(_.indexOf(list.added, key) < 0, 'list.added does not contain record before add');
      list.add(newRec);
      strictEqual(list.isDirty(), true, 'list is dirty after add');
      strictEqual(newRec.isDirty(), true, 'rec should be dirty after add');
      ok(_.indexOf(list.added, key) >= 0, 'list.added contains the newly added record');
   });

   test('#load', function() {
      var data = testData(genericModel, genericData, 5), list = new ko.sync.RecordList(genericModel, data.slice(0, 4)),
         newRec = testRecord(genericModel, data.slice(4,5)[0]), key = newRec.getKey().valueOf();
      list.checkpoint();
      strictEqual(list.isDirty(), false, 'list is not dirty before push');
      ok(!(key in list.recs), 'list does not contain record before push');
      list.load(newRec);
      strictEqual(list.isDirty(), false, 'list is not dirty after push');
      strictEqual(newRec.isDirty(), false, 'rec should not be dirty after push');
      ok(key in list.recs, 'list contains record after push');
   });

   test('#remove', function() {
      //todo-test
   });

   test('#updated', function() {
      //todo-test
   });

   test('#store', function() {
      //todo-test
   });

   module('RecordList.Iterator');

   test('#size', function() {
      strictEqual(_newIt(0).size(), 0);
      strictEqual(_newIt(10).size(10), 10);
   });

   test('#reset', function() {
      var it = _newIt(5), i = 3;
      while(i--) { it.next(); }
      strictEqual(it.curr, 2, 'it.curr incremented with each call to next()');
      it.reset();
      strictEqual(it.curr, -1, 'it.curr reset to -1 after call to reset()');
   });

   test('#next', function() {
      var it = _newIt(2), first = it.next(), second = it.next(), third = it.next();
      ok(first instanceof ko.sync.Record, 'returns a record');
      equal(first.getKey().valueOf(), 'record-1', 'has the correct key');
      equal(second.getKey().valueOf(), 'record-2', 'has the correct key');
      strictEqual(third, null, 'returns null after last record');
   });

   test('#prev', function() {
      var it = _newIt(2);
      for(var i=0; i < 2; i++) { it.next(); } // loop it to the end
      var first = it.prev(), second = it.prev();
      ok(first instanceof ko.sync.Record, 'returns a record');
      equal(first.getKey().valueOf(), 'record-1', 'has the correct key');
      strictEqual(second, null, 'returns null before first record');
   });

   test('#hasPrev', function() {
      var i, it = _newIt(5);
      strictEqual(it.hasPrev(), false, 'no prev before start');
      for(i=0; i < 5; i++) {
         it.next();
         var exp = i > 0;
         strictEqual(it.hasPrev(), exp, 'hasPrev() at index '+i+' of next('+exp+')');
      }
      for(i=3; i >= 0; i--) {
         it.prev();
         exp = i > 0;
         strictEqual(it.hasPrev(), exp, 'hasPrev() at index '+i+' of prev('+exp+')')
      }
   });

   test('#hasNext', function() {
      var i, it = _newIt(5), max = 4;
      strictEqual(it.hasNext(), true, 'has next before start');
      for(i=0; i < 5; i++) {
         it.next();
         var exp = i < max;
         strictEqual(it.hasNext(), exp, 'hasNext() at index '+i+' of next('+exp+')');
      }
      for(i=3; i >= 0; i--) {
         it.prev();
         exp = i < max;
         strictEqual(it.hasNext(), exp, 'hasNext() at index '+i+' of prev('+exp+')')
      }
   });

   function _newIt(len) {
      return new ko.sync.RecordList.Iterator({recs: testData(genericModel, genericData, len)});
   }

});
