(function() {
   "use strict";

   var Crud = ko.sync.Crud;
   var storeTester = new ko.sync.stores.TestStore.Tester();

   module('Crud');

   test('#create', function() {
      expect(3);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         var obs = ko.observable({ _key: 'five', name: 'Fiver'});
         var crud = new Crud(obs, store);
         return crud.create({email: 'fiver@five.com' }).ready.done(function() {
            var obsData = ko.sync.unwrapAll(obs), dataKey = obsData._key;
            strictEqual(crud.key, dataKey, 'crud has correct key');
            deepEqual(store.data['five'], obsData, 'store and obs data matches');
            strictEqual(obsData.email, 'fiver@five.com', 'has both observable and argument values');
         })
      })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#read', function() {
      expect(2);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         var obs = ko.observable();
         var crud = new Crud(obs, store);
         return crud.read('four').ready.done(function() {
            deepEqual(ko.sync.unwrapAll(obs), store.data['four'], 'observable receives correct data');
            strictEqual(crud.key, 'four', 'crud.key updated appropriately');
         });
      })
      .fail(ok.bind(null, false)).always(ko.sync.test.done);
   });

   asyncTest('#update', function() {
      expect(2);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         var obs = ko.observable();
         var newData = _.extend({}, store.data['two'], { name: 'Wayne' });
         var crud = new Crud(obs, store);
         return crud.read('two').update({ name: 'Wayne' }).ready.done(function() {
            var obsData = ko.sync.unwrapAll(obs);
            deepEqual(store.data['two'], newData, 'store received data');
            deepEqual(obsData, newData, 'obs received argument data');
         });
      })
      .fail(ok.bind(null, false)).always(ko.sync.test.done);
   });

   test('#delete', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         var obs = ko.observable();
         var crud = new Crud(obs, store);
         return crud.read('one').delete('one').ready.done(function() {
            ok(_.has(store.data, 'two'), 'record removed from store');
         });
      })
      .fail(ok.bind(null, false)).always(ko.sync.test.done);
   });

   asyncTest('synchronization: local change', function() {
      expect(2);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         var obs = ko.observable();
         obs.watchChanges(store, function(v) { console.log('watcher', v)});
         var crud = new Crud(obs, store);
         var def = ko.sync.test.def();
         crud.read('one').ready.done(function() {
            ko.sync.test.disposable(store.on('update', 'one', function(key, data) {
               strictEqual(key, 'one', 'update completed with correct key');
               deepEqual(data, ko.sync.unwrapAll(obs), 'update completed with correct data');
               def.resolve();
            }));
            ko.sync.test.update(obs, {name: 'Pinky'});
         });
         return def;
      })
      .fail(ok.bind(null, false)).always(ko.sync.test.done);
   });

   asyncTest('synchronization: remote change', function() {
      expect(2);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild()).then(function(store) {
         var obs = ko.observable();
         var crud = new Crud(obs, store).read('one');
         var def = ko.sync.test.def();
         // wait for the read to take effect
         _.defer(function() {
            ko.sync.test.disposable(obs.subscribe(function(newData) {
               deepEqual(newData, store.data['one'], 'update completed with correct data');
               strictEqual(newData.name, 'Buffy', 'name was updated');
               def.resolve();
            }));
            store.update('one', _.extend({}, store.data['one'], {name: 'Buffy'}));
         });
         return def;
      })
         .fail(ok.bind(null, false)).always(ko.sync.test.done);
   });

   asyncTest('synchronization: observed field', start);

})();

