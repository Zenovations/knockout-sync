(function($) {
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
            var keys     = ['one', 'four'];
            var obs      = ko.observableArray(), recsUpdated = 0;
            var crud     = new CrudArray(obs, store);
            var updating = ko.sync.test.afterDone(def);
            ko.sync.test.disposable(store.on('update', function(key) {
               console.log('callback invoked', key); //debug
               // we don't count the records until the initial load is completed
               recsUpdated++;
               ok(_.contains(keys, key), key + ' matches a key in our test data');
               updating();
            }));

            // wait for read() to complete
            crud.read().ready.done(function() {
               var exp = 0;
               _.delay(function() {
                  _.each(keys, function(k) {
                     exp++;
                     var v = storeTester.updateData(k);
                     console.log('updatding', k); //debug
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

   test('sync: local changes', function() { ok(false); });

   test('sync: remote changes', function() { ok(false); });

})(jQuery);

