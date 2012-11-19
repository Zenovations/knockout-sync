
(function($) {
   "use strict";
   var undef;

   var TestData = ko.sync.TestData, RecordList = ko.sync.RecordList;

   module('RecordList');

   test('#checkpoint', function() {
      var model = TestData.model(), list = new RecordList(model);
      list.add( TestData.makeRecords(2) );
      strictEqual(list.isDirty(), true, 'list is dirty after adding records');
      list.checkpoint();
      strictEqual(list.isDirty(), false, 'not dirty after checkpoint');
   });

   test('#iterator', function() {
      var it,
          model = TestData.model(),
          recs = TestData.makeRecords(5),
          list = new RecordList(model);
      // try one before we have any records
      it = list.iterator();
      ok(it instanceof RecordList.Iterator, 'instanceof iterator');
      strictEqual(it.len, 0, 'iterator has no records');
      list.add(recs);
      it = list.iterator();
      ok(it instanceof RecordList.Iterator, 'instanceof iterator');
      strictEqual(it.len, 5, 'has correct number of records');
   });

   test('#isDirty', function() {
      var recs = TestData.makeRecords(5), list = new RecordList(TestData.model(), recs);
      strictEqual(list.isDirty(), false);
      // changing a record should cascade out to the list
      recs[0].set('intOptional', 99);
      strictEqual(list.isDirty(), true);
   });

   test('#add', function() {
      var model = TestData.model(),
          data = TestData.makeRecords(5),
          list = new RecordList(model, data.slice(0, 4)),
          newRec = data.slice(4,5)[0], key = newRec.hashKey();

      list.checkpoint();
      strictEqual(list.isDirty(), false, 'list is not dirty before add');
      ok(!(key in list.added), 'list.added does not contain record before add');
      list.add(newRec);
      strictEqual(list.isDirty(), true, 'list is dirty after add');
      strictEqual(newRec.isDirty(), true, 'rec should be dirty after add');
      ok(key in list.added, 'list.added contains the newly added record');
   });

   test('#load', function() {
      var model = TestData.model(),
         data = TestData.makeRecords(5),
         list = new RecordList(model, data.slice(0, 4)),
         newRec = TestData.makeRecord(model, data.slice(4,5)[0]), key = newRec.hashKey();
      strictEqual(list.isDirty(), false, 'list is not dirty before push');
      strictEqual(list.find(key), null, 'list does not contain record before push');
      list.load(newRec);
      strictEqual(list.isDirty(), false, 'list is not dirty after push');
      strictEqual(newRec.isDirty(), false, 'rec should not be dirty after push');
      ok(list.find(key) !== null, 'list contains record after push');
   });

   test('#remove using Record', function() {
      var data = TestData.makeRecords(5),
         list = new RecordList(TestData.model(), data),
            key = 'record-5', recToDelete = list.find(key);
      strictEqual(list.isDirty(), false, 'list is not dirty before remove');
      ok(list.find(key) !== null, 'list should contain our record before remove');
      list.remove(recToDelete); // delete using the Record object
      strictEqual(list.isDirty(), true, 'list is dirty after remove');
      strictEqual(recToDelete.isDirty(), true, 'rec should be dirty after remove'); // true until it saves
      strictEqual(list.find(key), null, 'record has been removed');
   });

   test('#remove using RecordId', function() {
      var data = TestData.makeRecords(5),
         list = new RecordList(TestData.model(), data),
          key = 'record-5', recToDelete = list.find(key);
      strictEqual(list.isDirty(), false, 'list is not dirty before remove');
      list.remove(recToDelete.getKey()); // delete using the record id
      strictEqual(list.isDirty(), true, 'list is dirty after remove');
      strictEqual(recToDelete.isDirty(), true, 'rec should be dirty after remove');
      strictEqual(list.find(key), null, 'list does not contain record after remove');
   });

   test('#move using record id', function() {
      expect(9);
      var list = new RecordList(TestData.model(), TestData.makeRecords(5)),
          rec = RecordList.atPos(list, 0), after = RecordList.atPos(list, 2), callbackInvoked = false;

      function callback(action, record, afterRec) {
         callbackInvoked = true;
         strictEqual(action, 'moved', 'notification was a move event');
         strictEqual(record.hashKey(), rec.hashKey(), 'notification with correct record id');
         strictEqual(afterRec, after.hashKey(), 'notification with correct "after" record');
      }

      list.subscribe(callback);

      // move record
      list.move(rec, after);
      strictEqual(_.indexOf(RecordList.ids(list), rec.hashKey()), 2, 'record in correct position after move');

      // switch it back
      after = RecordList.atPos(list, 0);
      list.move(rec.getKey(), after.getKey());
      strictEqual(_.indexOf(RecordList.ids(list), rec.hashKey()), 1, 'record in correct position after move');

      ok(callbackInvoked, 'callback was invoked');
   });

   test('#move with undefined', function() {
      expect(6);
      var list = new RecordList(TestData.model(), TestData.makeRecords(5)),
         rec = RecordList.atPos(list, 0), after = RecordList.atPos(list, 4), callbackInvoked = false;

      function callback(action, record, afterRec) {
         callbackInvoked = true;
         strictEqual(action, 'moved', 'notification was a move event');
         strictEqual(record.hashKey(), rec.hashKey(), 'notification with correct record id');
         strictEqual(afterRec, after.hashKey(), 'notification with correct "after" record');
      }

      list.subscribe(callback);

      strictEqual(_.indexOf(RecordList.ids(list), rec.hashKey()), 0, 'record starts in correct position');
      list.move(rec, after);
      strictEqual(_.indexOf(RecordList.ids(list), rec.hashKey()), 4, 'record in correct position after move');

      ok(callbackInvoked, 'callback was invoked');
   });

   test('#move, with null', function() {
      expect(6);
      var list = new RecordList(TestData.model(), TestData.makeRecords(5)),
         rec = RecordList.atPos(list, 2), after = RecordList.atPos(list, 4), callbackInvoked = false;

      function callback(action, record, afterRec) {
         callbackInvoked = true;
         strictEqual(action, 'moved', 'notification was a move event');
         strictEqual(record.hashKey(), rec.hashKey(), 'notification with correct record id');
         strictEqual(afterRec, after.hashKey(), 'notification with correct "after" record');
      }

      list.subscribe(callback);

      strictEqual(_.indexOf(RecordList.ids(list), rec.hashKey()), 2, 'record starts in correct position');
      list.move(rec, null);
      strictEqual(_.indexOf(RecordList.ids(list), rec.hashKey()), 4, 'record in correct position after move');

      ok(callbackInvoked, 'callback was invoked');
   });

   test('#move, integer', function() {
      expect(17);
      var list = new RecordList(TestData.model(), TestData.makeRecords(10)),
          callbackInvoked = false, rec, after,
          ids = list.sorted;

      function callback(action, record, afterRec) {
         callbackInvoked = true;
         console.log(action, record, afterRec);//debug
         strictEqual(action, 'moved', 'notification was a move event');
         strictEqual(record.hashKey(), rec.hashKey(), 'notification with correct record id');
         strictEqual(afterRec, after, 'notification with correct "after" record');
      }

      list.subscribe(callback);

      // move forwards
      rec = list.find(ids[0]);
      after = ids[5];
      list.move(rec, 5);
      strictEqual(_.indexOf(ids, rec.hashKey()), 5, 'moved forwards');
      console.log(ids);//debug

      // move backwards
      rec = list.find(ids[7]);
      after = ids[1];
      list.move(rec, 2);
      strictEqual(_.indexOf(ids, rec.hashKey()), 2, 'moved backward');
      console.log(ids);//debug

      // move first to last
      rec = list.find(ids[0]);
      after = ids[9];
      list.move(rec, 9);
      strictEqual(_.indexOf(ids, rec.hashKey()), 9, 'moved first to last');
      console.log(ids);//debug

      // move last to first
      rec = list.find(ids[9]);
      after = undef;
      list.move(rec, 0);
      strictEqual(_.indexOf(ids, rec.hashKey()), 0, 'moved last to first');
      console.log(ids);//debug

      ok(callbackInvoked, 'callback was invoked');
   });

   test('#move with negative integer', function() {
      expect(9);
      var list = new RecordList(TestData.model(), TestData.makeRecords(10)), callbackInvoked = false,
         ids = list.sorted, rec, after;

      function callback(action, record, afterRec) {
         callbackInvoked = true;
         strictEqual(action, 'moved', 'notification was a move event');
         strictEqual(record.hashKey(), rec.hashKey(), 'notification with correct record id');
         strictEqual(afterRec, after, 'notification with correct "after" record');
      }

      list.subscribe(callback);

      rec = list.find(ids[3]);
      after = ids[8];
      list.move(rec, -1);
      strictEqual(_.indexOf(ids, rec.hashKey()), 8, 'record before last position');

      rec = list.find(ids[3]);
      after = ids[6];
      list.move(rec, -3);
      strictEqual(_.indexOf(ids, rec.hashKey()), 6, 'record before third from last');

      ok(callbackInvoked, 'callback was invoked');
   });

   test('#move invalid move options', function() {
      var data = TestData.makeRecords(10), list = new RecordList(TestData.model(), data.slice(0, 5)),
          origList = RecordList.ids(list), a = data[1], b = data[8];

      function callback() {
         ok(false, 'should not invoke callback');
      }

      list.subscribe(callback);
      list.move(b, 0);
      deepEqual(origList, RecordList.ids(list), 'list should not change');

      list.subscribe(callback);
      list.move(b, a);
      deepEqual(origList, RecordList.ids(list), 'list should not change');
   });

   test('change tracking', function() {
      var RECS_TOTAL = 6;
      var RECS_PRELOADED = 3;
      var i, v, k,
         data     = TestData.makeRecords(RECS_TOTAL),
         // create the list with 4 records pre-populated
         list     =  new RecordList(TestData.model(), data.slice(0, RECS_PRELOADED));

      // now add records
      list.add(data.slice(RECS_PRELOADED));

      // one is deleted below, so our list doesn't include it here
      var added_recs = _.map(data.slice(RECS_PRELOADED+1), getHashKey);

      // now delete an added and a neutral record (which we will try and update in a second)
      list.remove([data[2], data[3]]);

      // in total we've deleted one of each type: added, updated, unchanged
      var deleted_recs = _.map(data.slice(1, 4), getHashKey);

      // now update the even records (one of each type)
      var updated_recs = [];
      for(i = 0 ; i < RECS_TOTAL ; i += 2) {
         k = data[i].hashKey();
         if( _.indexOf(deleted_recs, k) === -1 && _.indexOf(added_recs, k) === -1 ) {
            // if it is marked as added or deleted, it shouldn't be in this list when we get done
            updated_recs.push(k);
         }
         data[i].set('boolOptional', true);
      }

      // now delete one which was already updated
      list.remove(data[1]);

      // now check the results
      deepEqual(_.keys(  list.added).sort(),   added_recs, 'added is only added (not deleted)');
      deepEqual(_.keys(list.changed).sort(), updated_recs, 'updated is only updated (not added or deleted)');
      deepEqual(_.keys(list.deleted).sort(), deleted_recs, 'deleted is everything that was deleted');

      function getHashKey(v) { return v.hashKey(); }
   });

   test('#updated dirty', function() {
      var data = TestData.makeRecords(5),
         list  = new RecordList(TestData.model(), data),
         rec   = list.find('record-4');
      rec.isDirty(true);
      strictEqual(list.isDirty(), false, 'list is not dirty before updated()');
      list.updated(rec);
      strictEqual(list.isDirty(), true, 'list is dirty after updated()');
   });

   test('#updated not dirty', function() {
      var data = TestData.makeRecords(5),
         list  = new RecordList(TestData.model(), data),
         key   = 'record-4', rec = list.find(key);
      strictEqual(list.isDirty(), false, 'list is not dirty before updated()');
      list.updated(rec);
      strictEqual(list.isDirty(), false, 'list is dirty after updated()');
   });

   asyncTest('#subscribe', function() {
      var RECS_TOTAL = 5;
      var RECS_PRELOADED = 2;
      var i, v,
          data     = TestData.makeRecords(RECS_TOTAL+1), //create one extra for the manual push/delete ops; it won't be in list
          // create the list with 2 records pre-populated
          list     =  new RecordList(TestData.model(), data.slice(0, RECS_PRELOADED+1)),
          events   = [],
          expected = [];

      // data values to use for update operation
      var newVals = {
         stringOptional: 'liver yuck!',
         stringRequired: 'yummy apples',
         dateOptional:   moment.utc().add('seconds', 10).toDate(),
         dateRequired:   moment.utc().add('days', 5).toDate(),
         intOptional:    -27,
         intRequired:    525,
         boolOptional:   true,
         boolRequired:   false,
         floatOptional:  .001,
         floatRequired:  -.001,
         emailOptional:  'newemail@new.com',
         emailRequired:  'newerest@newest.com'
      };

      function callback(action, record, field) {
         var args = $.makeArray(arguments);
         args[1] = record.hashKey();
         events.push(args);
      }

      list.subscribe(callback);

      // add our new records
      i = RECS_PRELOADED;
      while(++i < RECS_TOTAL) {
         v = data[i];
         list.add(data[i]);
         expected.push(['added', v.hashKey(), data[i-1].hashKey()]);
      }

      // try updating each record using a different field each time for fun
      i = 0;
      _.each(newVals, function(v, k) {
         var j = i % RECS_TOTAL, rec = data[j];
         expected.push(['updated', rec.hashKey(), k]);
         rec.set(k, v);
         i++;
      });

      // delete some records
      i = RECS_PRELOADED+2;
      while(i-- > RECS_PRELOADED) {
         var rec = data[i];
         expected.push(['deleted', rec.hashKey()]);
         list.remove(rec);
      }

      // just leave enough time for deleted events to get processed
      _.delay(function() {
         // check the results
         deepEqual(events, expected, 'all events recorded as expected');
         start();
      }, 100);
   });

   test('#subscribe, invalid update ops', function() {
      var RECS_TOTAL = 5;
      var i, data = TestData.makeRecords(RECS_TOTAL),
      // create the list with 2 records pre-populated
         list     =  new RecordList(TestData.model(), data),
         events   = [],
         expected = [];

      // data values to use for update operation
      var newVals = {
         stringOptional: 'liver yuck!',
         stringRequired: 'yummy apples',
         dateOptional:   moment.utc().add('seconds', 10).toDate(),
         dateRequired:   moment.utc().add('days', 5).toDate(),
         intOptional:    -27,
         intRequired:    525,
         boolOptional:   true,
         boolRequired:   false,
         floatOptional:  .001,
         floatRequired:  -.001,
         emailOptional:  'newemail@new.com',
         emailRequired:  'newerest@newest.com'
      }, newValKeys = _.keys(newVals);

      function callback(action, record, field) {
         events.push([action, record.hashKey(), field]);
      }

      list.subscribe(callback);

      // try updating each record using a different field each time for fun
      i = 0;
      _.each(newVals, function(v, k) {
         var j = i % RECS_TOTAL, rec = data[j];
         expected.push(['updated', rec.hashKey(), k]);
         rec.set(k, v);
         i++;
      });

      // try updating each record again, but use the previous values, which shouldn't trigger updates
      i = 12;
      var rec;
      while(i--) {
         var k = newValKeys[i % newValKeys.length];
         rec = data[i % data.length];
         rec.set( k, rec.get(k) );
      }

      // check the results
      deepEqual(events, expected, 'all events recorded as expected');
   });

   asyncTest('#subscribe, invalid delete ops', function() {
      var RECS_TOTAL = 5;
      var i, v,
         data     = TestData.makeRecords(RECS_TOTAL),
        // create the list but leave out one record (so we can use it for a record not in the list)
         list     =  new RecordList(TestData.model(), data.slice(0, -1)),
         events   = [],
         expected = [];

      function callback(action, record, field) {
         events.push([action, record.hashKey(), field]);
      }

      list.subscribe(callback);

      // manually delete a record from the observable, which should still trigger notifications
      v = data[RECS_TOTAL-2];
      expected.push(['deleted', v.hashKey(), undef]);
      list.remove(v);

      // delete the same record again and make sure it doesn't trigger an update
      list.remove(v); // we already removed this

      // delete a record that doesn't exist and make sure it doesn't trigger an update
      list.remove(data[RECS_TOTAL-1]);

      // just leave enough time for deleted events to get processed
      _.delay(function() {
         // check the results
         deepEqual(events, expected, 'all events recorded as expected');
         start();
      }, 100);

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
      equal(first.hashKey(), 'record-1', 'has the correct key');
      equal(second.hashKey(), 'record-2', 'has the correct key');
      strictEqual(third, null, 'returns null after last record');
   });

   test('#prev', function() {
      var it = _newIt(2);
      for(var i=0; i < 2; i++) { it.next(); } // loop it to the end
      var first = it.prev(), second = it.prev();
      ok(first instanceof ko.sync.Record, 'returns a record');
      equal(first.hashKey(), 'record-1', 'has the correct key');
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
      var list = new RecordList(TestData.model(), TestData.makeRecords(len));
      return new RecordList.Iterator(list);
   }

})(jQuery);
