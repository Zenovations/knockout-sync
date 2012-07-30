
jQuery(function($) {
   "use strict";

   var undef;
   var FIREBASE_URL = 'http://gamma.firebase.com/wordspot';
   var FIREBASE_TEST_URL = 'GitHub/firebase-sync';
   var syncRoot = new window.Firebase(FIREBASE_URL+'/'+FIREBASE_TEST_URL);
   var TestData = ko.sync.TestData;
   //todo composite key
   var Util = ko.sync.stores.FirebaseStore.Util;

   // override asyncTest for some logging
   console.log({asyncTest: asyncTest});
   var _asyncTest = asyncTest, currName;
   asyncTest = function(name, fx) {
      return _asyncTest(name, function() {
         console.log('starting', name);
         console.time(name);
         currName = name;
         fx();
      });
   };

   var _start = start;
   start = function() {
      console.timeEnd(currName);
      _start();
   };

   var sequenceMethods = {
      create: function(store, model, data) {
         var record = model.newRecord(data), def = $.Deferred();
         //todo use pipe()
         store.create(model, record).done(function(id) {
            // do not immediately return the record because it is actually only stored locally at this point
            // wait for the server database to recognize it, then resolve, just to simplify our test case if/else nesting
            watchForEntry(model.table, id).done(function(rec) {
               def.resolve(id);
            }).fail(function(e) { def.reject(e); });
         }).fail(function(e) { def.reject(e); });
         return def.promise();
      },
      read: function(store, model, recordId) {
         return store.read(model, recordId);
      },
      update: function(store, model, data) {
         return store.update(model, model.newRecord(data));
      },
      delete: function(store, model, recordId) {
         return store.delete(model, new ko.sync.RecordId('id', {id: recordId}));
      },
      /** check if record exists in database (do not use the Store to do this) */
      exists: function(table, recordId) {
         var def = $.Deferred();
         syncRoot.child(table).child(recordId).once('value', function(snapshot) {
            def.resolve(snapshot.val() !== null);
         });
         return def;
      },
      /** Check the record by retrieving it from the database and comparing to the original (do not use the Store) */
      check: function(model, origData, recordId) {
         //todo-test check sort priorities
         var table = model.table, fields = model.fields, k, keys = Object.keys(fields), i = keys.length;
         // because the record may have just been added, it may not be in the db yet
         // so wait for it to be added before fetching it
         return watchForEntry(table, recordId).done(function(resultData) {
            while(i--) {
               k = keys[i];
               if( origData.hasOwnProperty(k) ) {
                  switch(k) {
                     case 'dateRequired':
                     case 'dateOptional':
                        if( resultData[k] && origData[k] ) {
                           equal(
                              moment(resultData[k]).format(),
                              moment(origData[k]).format(),
                              k+' has correct date');
                        }
                        else {
                           equal(resultData[k], origData[k]);
                        }
                        break;
                     default:
                        equal(resultData[k], origData[k], k+' has correct value');
                  }
               }
               else {
                  equal(resultData[k], getDefaultValue(fields[k].type), k+' has correct default');
               }
            }
         });
      }
   };

   clearAllRecords();

   module("FirebaseStore");

   //todo-test test sort priorities (create/update/etc)
   asyncTest("#create (keyed record)", function() {
      var store = resetStore(), data = TestData.fullData(), model = TestData.model();

      // we perform one assertion for each field plus one assertion for the id returned by create
      expect(Object.keys(model.fields).length+1);

      startSequence()
         .create(store, model, data)
         .then(function(id) { equal(id, data.id, 'resolves with correct id'); })
         .check(model, data, $.Sequence.PREV)
         .end()
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#create (unkeyed record)", function() {
      var store = resetStore(), data = TestData.genericData(true), model = TestData.model();

      // we perform one assertion for each field plus one assertion for the id returned by create
      expect(Object.keys(model.fields).length+1);

      startSequence()
         .create(store, model, data)
         .then(function(id) { ok(exists(id), 'resolves with an id'); })
         .check(model, data, $.Sequence.PREV)
         .end()
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);

   });

   asyncTest("#create (empty record)", function() {
      var store = resetStore(), data = {}, model = TestData.model();

      // we perform one assertion for each field plus one assertion for the id returned by create
      expect(Object.keys(model.fields).length+1);

      startSequence()
         .create(store, model, data)
         .then(function(id) { ok(exists(id), 'test1', 'resolves with correct id'); })
         .check(model, data, $.Sequence.PREV)
         .end()
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#read", function() {
      expect(2);
      var store = resetStore(), data = {id: 'record123'},
          recId = new ko.sync.RecordId('id', data),
          model = TestData.model();
      startSequence()
         .create(store, model, data)
         .read(store, model, recId)
         .then(function(rec) {
            ok(rec instanceof ko.sync.Record, 'is instanceof record');
            equal(rec.get('id'), 'record123', 'has the right id');
         })
         .end()
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest('#read (non-existing record)', function() {
      expect(1);
      var store = resetStore(), recId = TestData.makeRecordId('i am not a record');
      startSequence()
         .read(store, TestData.model(), recId)
         .then(function(rec) {
            strictEqual(rec, null, 'record should be null');
         })
         .end()
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#update", function() {
      var store = resetStore(),
         model = TestData.model(),
         data = {
         id:             'record123',
         stringRequired: '2-stringRequired',
         dateRequired:   moment().add('days', 7).toDate(),
         intRequired:    -2,
         boolRequired:   false,
         floatRequired:  1.2,
         emailRequired:  'me2@me2.com'
      };

      expect(Object.keys(model.fields).length*2);

      startSequence()
         .create(store, model, TestData.genericData())
         .check(model, TestData.genericData(), data.id)
         .update(store, model, data)
         .check(model, data, data.id)
         .end()
         .fail(function(e) { console.error(e); ok(false, e.toString());})
         .always(start);
   });

   asyncTest("#update without key", function() {
      expect(1);
      var store = resetStore(),
         model = TestData.model(),
         data = {
         stringRequired: '2-stringRequired',
         dateRequired:   moment().add('days', 7).toDate(),
         intRequired:    -2,
         boolRequired:   false,
         floatRequired:  1.2,
         emailRequired:  'me2@me2.com'
      };

      startSequence()
         .create(store, model, TestData.genericData())
         .update(store, model, data)
         .end()
         .fail(function(e) {
               equal(e, 'Invalid key', 'should fail with invalid key error');
         })
         .always(start);
   });

   asyncTest('#update non-existing', function() {
      expect(1);
      var store = resetStore(),
         model = TestData.model(),
         data = {
         id: 'I am not a valid record id',
         stringRequired: '2-stringRequired',
         dateRequired:   moment().add('days', 7).toDate(),
         intRequired:    -2,
         boolRequired:   false,
         floatRequired:  1.2,
         emailRequired:  'me2@me2.com'
      };

      startSequence()
         .create(store, model, TestData.genericData())
         .update(store, model, data)
         .end()
            .done(function() {
               ok(false, 'should not succeed (record does not exist)');
            })
         .fail(function(e) {
            equal(e, 'Record does not exist', 'should fail because record does not exist');
         })
         .always(start);
   });

   asyncTest("#delete", function() {
      expect(2);
      var store = resetStore(), model = TestData.model();
      startSequence()
         .create(store, model, TestData.genericData())
         .delete(store, model, $.Sequence.PREV)
         .then(function(id) {
            // did we get return value?
            equal(id, 'record123', 'returned id of deleted record');
         })
         .exists(model.table, $.Sequence.PREV)
         .then(function(x) { strictEqual(x, false, 'does not exist'); })
         .end()
         .fail(function(e) { ok(false, e); })
         .always(start);
   });

   asyncTest("#delete followed by #update", function() {
      expect(1);
      var store = resetStore(),
         newData = $.extend(TestData.genericData(), {intRequired: 99}),
         model = TestData.model();
      startSequence()
         .create(store, model, TestData.genericData())
         .delete(store, model, $.Sequence.PREV)
         .update(store, model, newData)
         .end()
         .fail(function(e) {
            equal(e, 'Record does not exist', 'should fail because record does not exist');
         })
         .always(start);
   });

   asyncTest("#count", function() {
      expect(2);
      var store = resetStore(), bigModel = TestData.bigData.model();
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.count(bigModel);
         })
         .pipe(function(count) {
            strictEqual(count, TestData.bigData.COUNT, 'found correct number of records');
         })
         .pipe(function() {
            return store.delete(bigModel, [TestData.makeRecordId(2), TestData.makeRecordId(3)]);
         })
         .pipe(function() {
            return store.count(bigModel);
         })
         .done(function(count) {
            strictEqual(count, TestData.bigData.COUNT-2, 'count correct after deletions');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#count limit", function() {
      expect(1);
      var store = resetStore(), LIMIT = 25, bigModel = TestData.bigData.model();
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.count(bigModel, {limit: LIMIT});
         })
         .done(function(count) {
            strictEqual(count, LIMIT, 'found correct number of records');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#count limit (not reached)", function() {
      expect(1);
      var store = resetStore(), LIMIT = 25, NUMRECS = 15, bigModel = TestData.bigData.model();
      TestData.bigData.reset(syncRoot, NUMRECS)
         .pipe(function() {
            return store.count(bigModel, {limit: LIMIT});
         })
         .done(function(count) {
            strictEqual(count, NUMRECS, 'found correct number of records');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#count where object", function() {
      expect(1);
      var store = resetStore(), bigModel = TestData.bigData.model(),
         parms = {
         where: { aBool: true, sortField: function(v) { return v < 51; } }
      };
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.count(bigModel, parms);
         })
         .done(function(count) {
            strictEqual(count, 25, 'correct number of records (evens under 51) returned');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#count where+limit", function() {
      expect(2);
      var store = resetStore(), bigModel = TestData.bigData.model(), parms = {
         where: { aBool: false },
         limit: 75
      };
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.count(bigModel, parms);
         })
         .then(function(count) {
            strictEqual(count, 75, 'correct number of records (odds up to 75) returned');
         })
         .pipe(function() {
            parms.limit = 175;
            return store.count(bigModel, parms);
         })
         .done(function(count) {
            strictEqual(count, 100, 'correct number of records (limit never reached) returned');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#query", function() {
      expect(2);
      var store = resetStore(), bigModel = TestData.bigData.model(), parms = {
         where: { aBool: true, sortField: function(v) { return v < 51; } }
      }, iteratorCalls = 0;
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.query(bigModel, function(rec) {
               iteratorCalls++;
            }, parms);
         })
         .done(function(count) {
            strictEqual(count, iteratorCalls, 'iterator called correct number of times');
            strictEqual(count, 25, 'correct number of records (evens under 51) returned');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#query where+limit", function() {
      expect(4);
      var store = resetStore(), bigModel = TestData.bigData.model(), parms = {
         where: { aBool: false },
         limit: 75
      }, iteratorCalls = 0;
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.query(bigModel, function(rec) {
               iteratorCalls++;
            }, parms);
         })
         .pipe(function(count) {
            strictEqual(count, iteratorCalls, 'iterator called correct number of times');
            strictEqual(count, 75, 'correct number of records (odds up to 75) returned');
         })
         .pipe(function() {
            parms.limit = 175;
            iteratorCalls = 0;
            return store.query(bigModel, function(rec) {
               iteratorCalls++;
            }, parms);
         })
         .done(function(count) {
            strictEqual(count, iteratorCalls, 'iterator called correct number of times');
            strictEqual(count, 100, 'correct number of records (limit never reached) returned');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#query (no results)", function() {
      expect(2);
      var store = resetStore(), bigModel = TestData.bigData.model(),
         parms = { where: { aString: 'not this' } }, iteratorCalls = 0;
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.query(bigModel, function(rec) {
               iteratorCalls++;
            }, parms);
         })
         .done(function(count) {
            strictEqual(count, iteratorCalls, 'iterator called correct number of times');
            strictEqual(count, 0, 'no records returned');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#query function", function() {
      expect(2);
      var store = resetStore(),
         bigModel = TestData.bigData.model(),
         parms = {
            where: function(v, k) {
               return k.match(/^1\d$/);
            }
         }, iteratorCalls = 0;
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.query(bigModel, function(rec) {
               iteratorCalls++;
            }, parms);
         })
         .done(function(count) {
            strictEqual(count, iteratorCalls, 'iterator called correct number of times');
            strictEqual(count, 10, 'correct number of records returned');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   asyncTest("#query function (no results)", function() {
      expect(2);
      var store = resetStore(), bigModel = TestData.bigData.model(),
         parms = { where: function() { return false; } }, iteratorCalls = 0;
      TestData.bigData.reset(syncRoot)
         .pipe(function() {
            return store.query(bigModel, function(rec) {
               iteratorCalls++;
            }, parms);
         })
         .done(function(count) {
            strictEqual(count, iteratorCalls, 'iterator called correct number of times');
            strictEqual(count, 0, 'correct number of records returned');
         })
         .fail(function(e) { console.error(e); ok(false, e.toString()); })
         .always(start);
   });

   test("#hasTwoWaySync", function() {
      var store = resetStore();
      strictEqual(store.hasTwoWaySync(), true, 'store has sync');
   });

   asyncTest("#watch", function() {
      expect(4);
      var obs,
          added = 0, updated = 0, removed = 0, moved = 0,
          store = resetStore(),
          done  = $.Deferred(),
          to    = _timeout(done),
          model = TestData.bigData.model();
      function watcher(type, id, val, prev) {
         console.log(arguments);
         switch(type) {
            case 'added':   added++;   break;
            case 'updated': updated++; break;
            case 'deleted': removed++; break;
            case 'moved':   moved++;   break;
            default:
               done.reject('Invalid event type', type);
         }
         if( added + moved + updated + removed == 207 ) {
            clearTimeout(to);
            done.resolve();
         }
      }

      TestData.bigData.reset(syncRoot).then(function(ref) {
         console.log('bigData reset');

         // calling this twice should not double-add the listener
         // and cause it to be invoked twice for each event
         obs = store.watch(model, watcher);

         // add a record locally
         store.create(model, TestData.bigData.record(201, {aString: 'hello'}, model));

         // do a remote update
         ref.child('100')
            .set(TestData.bigData.data(100,
               {aString: 'this is SPARTA'}, model));

         // do a local update
         store.update(model, TestData.bigData.record(110, {aString: 'goodbye'}, model));

         // do a remote delete
         ref.child('201').remove();

         // do a local delete
         store.delete(model, TestData.bigData.record(25, {}, model));

      });

      // sync to the bigData model right now while records are changing
      store.watch(model, watcher);

      done
         .fail(function(e) { ok(false, e); })
         .always(function() {
            equal(added, 201, 'records added');
            equal(updated, 2, 'records updated');
            equal(removed, 2, 'records deleted');
            equal(moved,   2, 'records moved');
            obs && obs.dispose();
            start();
         });
   });

   test('#watchRecord', function() {
      //todo
   });

   test("#onConnect", function() {
      ok(false, 'Implement me!');
   });

   test("#onDisconnect", function() {
      ok(false, 'Implement me!');
   });

   test('sorted records', function() {
      ok(false, 'Implement me');
   });

   test("composite keys", function() {
      ok(false, 'Implement me!');
   });

   test("#assignTempId", function() {
      ok(false, 'Implement me!');
   });

   function watchForEntry(table, hashKey) {
      var tableRef = syncRoot.child(table);
      var def = $.Deferred();
      var timeout = setTimeout(function() {
         def.reject('record not found');
         timeout = null;
      }, 2000); // die after 5 seconds if we don't have any data
      tableRef.child(hashKey).on('value', function(snapshot) {
         var rec = snapshot.val();
         if( rec !== null ) {
            if( timeout ) { clearTimeout(timeout); timeout = null; }
            def.resolve(rec);
         }
      });
      return def.promise();
   }

   /**
    * @param {int} [timeout]
    * @return {jQuery.Sequence}
    */
   function startSequence(timeout) {
      timeout || (timeout = 2500);
      var seq = $.Sequence.start(sequenceMethods), timeoutRef;

      if( timeout ) {
         timeoutRef = setTimeout(function() {
            timeoutRef = null;
            seq.abort('timeout exceeded');
         }, timeout);
      }

      seq.master.done(function() {
         if( timeoutRef ) { clearTimeout(timeoutRef); }
      });

      return seq;
   }

   /**
    * @return {ko.sync.stores.FirebaseStore}
    */
   function resetStore() {
      clearAllRecords();
      return new ko.sync.stores.FirebaseStore(FIREBASE_URL, FIREBASE_TEST_URL);
   }

   function clearAllRecords() {
      syncRoot.set({});
   }

   function getDefaultValue(type) {
      switch(type) {
         case 'boolean':
            return false;
         case 'int':
            return 0;
         case 'float':
            return 0;
         case 'string':
         case 'email':
         case 'date':
            return null;
         default:
            throw new Error('Invalid field type '+type);
      }
   }

   function exists(val) {
      return  val !== null && val !== undef;
   }

   /**
    * @param def
    * @param {int} [timeout]
    * @return {Number}
    * @private
    */
   function _timeout(def, timeout) {
      timeout || (timeout = 5000);
      return setTimeout(function() {
         def.reject('timeout exceeded');
      }, timeout)
   }

});

