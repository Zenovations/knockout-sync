(function() {
   "use strict";
   var Store = ko.sync.stores.TestStore;
   var CrudArray = ko.sync.CrudArray;
   var storeTester = new Store.Tester();

   module('CrudArray');

   asyncTest('#create', function() {
      expect(3);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild({noData: true})).then(function(store) {
         return ko.sync.test.def(function(def) {
            var newRecs = [storeTester.validData(), storeTester.validData()];
            var keys    = _.map(newRecs, function(r) { return r._key; });
            var obs     = ko.observableArray(), recsCreated = 0;
            var crud    = new CrudArray(obs, store).read();
            var done    = ko.sync.test.afterDone(def);
            ko.sync.test.disposable(store.on('create', function(key) {
               // we don't count the records until the initial load is completed
               recsCreated++;
               ok(_.contains(keys, key), 'created with key from our test data');
               done();
            }));
            recsCreated = 0;
            crud.create(newRecs);
            def.done(function() {
               strictEqual(recsCreated, 2, 'correct number of records created');
            });
         });
      })
      .fail(ok.bind(null, false))
      .always(ko.sync.test.done);
   });

   asyncTest('#read', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         return ko.sync.test.def(function(def) {
            var obs     = ko.observableArray(), recsLoaded = 0;
            var loading = ko.sync.test.afterDone(def);
            new CrudArray(obs, store).read();

            ko.sync.test.disposable(store.on('create', function(key) {
               // we don't count the records until the initial load is completed
               recsLoaded++;
               loading();
            }));

            // create callbacks have ceased
            def.done(function() {
               strictEqual(recsLoaded, 5, 'correct number of records created');
            });
         });
      })
      .fail(ok.bind(null, false))
      .always(ko.sync.test.done);
   });

   asyncTest('#update', function() {
      expect(3);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         return ko.sync.test.def(function(def) {
            var exp = 0;
            var keys     = ['one', 'four'];
            var obs      = ko.observableArray(), recsUpdated = 0;
            var crud     = new CrudArray(obs, store);
            var updating = ko.sync.test.afterDone(def);
            ko.sync.test.disposable(store.on('update', function(key) {
               // we don't count the records until the initial load is completed
               recsUpdated++;
               ok(_.contains(keys, key), key + ' matches a key in our test data');
               updating();
            }));

            // wait for read() to complete
            crud.read().ready.done(function() {
               _.delay(function() {
                  _.each(keys, function(k) {
                     exp++;
                     var v = storeTester.updateData(k);
                     crud.update(k, v).ready.fail(def.reject);
                  });
               }, 500);
            });

            // create callbacks have ceased
            def.done(function() {
               strictEqual(recsUpdated, exp, 'correct number of records updated');
            });
         });
      })
      .fail(ok.bind(null, false))
      .always(ko.sync.test.done);
   });

   asyncTest('#delete', function() {
      expect(3);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         return ko.sync.test.def(function(def) {
            var keys    = ['one', 'four'];
            var obs     = ko.observableArray(), recsDeleted = 0;
            var crud    = new CrudArray(obs, store).read();
            var updating = ko.sync.test.afterDone(def);
            ko.sync.test.disposable(store.on('delete', function(key) {
               // we don't count the records until the initial load is completed
               recsDeleted++;
               ok(_.contains(keys, key), key + ' matches a key in our set of deletes');
               updating();
            }));

            // wait for load
            var exp = 0;
            _.each(keys, function(k) {
               exp++;
               crud.delete(k).ready.fail(def.reject);
            });

            // create callbacks have ceased
            def.done(function() {
               strictEqual(recsDeleted, exp, 'correct number of records deleted');
            });
         });
      })
      .fail(ok.bind(null, false))
      .always(ko.sync.test.done);
   });

   asyncTest('sync: local changes', function() {
      expect(4);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         return ko.sync.test.def(function(def) {
            var obs     = ko.observableArray();
            var createKey;
            var crud    = new CrudArray(obs, store).read();
            var updating = ko.sync.test.afterDone(def);
            var recsChanged = 0;

            ko.sync.test.disposable(store.on('create update delete', function(key, v, event) {
               // ignore initial load events
               if( event === 'create' && key in {one: 1, two: 2, three: 3, four: 4, five: 5} ) { return; }
               recsChanged++;
               switch(event) {
                  case 'create':
                     strictEqual(key, createKey, 'created record matches key');
                     break;
                  case 'update':
                     strictEqual(key, 'one', 'one updated');
                     break;
                  case 'delete':
                     strictEqual(key, 'three', 'three deleted');
                     break;
                  default:
                     throw new Error('unknown event type', event);
               }
               updating();
            }));

            // wait for load
            crud.ready.done(function() {
               obs.splice(2,1); // delete record three
               obs.replace(obs()[0], storeTester.updateData('one')); // update one
               var newRec = storeTester.validData();
               createKey = newRec._key;
               obs.push(newRec); // create a record
            });

            // create callbacks have ceased
            def.done(function() {
               strictEqual(recsChanged, 3, 'correct number of records changed');
            });
         });
      })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('sync: remote changes', function() {
      expect(2);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         return ko.sync.test.def(function(def) {
            var obs     = ko.observableArray();
            var events = [], updateCount = 0;
            var crud    = new CrudArray(obs, store).read();
            var updating = ko.sync.test.afterDone(def);

            // wait for load
            var expect = 0;
            crud.ready.done(function() {
               obs.watchChanges(store, function(changeList) {
                  console.log('changeList', changeList); //debug
                  _.each(changeList, function(c) { events.push(c.status); });
                  updating();
                  expect++;
               });
               obs.subscribe(function(v) { updateCount++; });
               storeTester.updateEvent();
               storeTester.deleteEvent();
               storeTester.createEvent();
            });

            // create callbacks have ceased
            def.done(function() {
               deepEqual(events, ['update', 'delete', 'move', 'create'], 'correct events received');
               strictEqual(updateCount, expect, 'obs.subscribe triggered right number of events');
            });
         });
      })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('synchronization: observed record', start);

   asyncTest('synchronization: observed field', start);

})();

