/*! ko.sync.test.js.js
 *************************************/
(function () {
   "use strict";

   module('ko.sync');

   var Store = ko.sync.stores.TestStore;

   var fieldsOnlyStore = {
      getFieldNames: function() { return ['one', 'two', 'three', 'four', 'five']; }
   };

   test('ko.extend(sync), observable', function() {
      expect(1);
      var o = ko.observable().extend({ sync: { store: new Store() } });
      ok(o.crud instanceof ko.sync.Crud, 'created a Crud object');
   });

   asyncTest('ko.extend(sync), observable with key', function() {
      expect(2);
      var store = new Store();
      var o = ko.observable();
      ko.sync.test.def(function(def) {
         o.subscribe(function(data) {
            deepEqual(data, store.data['three']);
            def.resolve();
         });
      }).fail(ok.bind(null, false)).always(start);
      o.extend({ sync: { store: store, key: 'three' } });
      ok(o.crud instanceof ko.sync.Crud, 'created a Crud object');
   });

   asyncTest('ko.extend(sync), observable with data', function() {
      expect(3);
      var store = new Store({noData: true}), dat = { _key: 'five', name: 'Fiver', email: 'fiver@five.com' };
      var def = ko.sync.test.def(function(def) {
         store.on('create', function(key, data) {
            strictEqual(key, 'five');
            deepEqual(data, dat);
            def.resolve();
         });
      });
      var o = ko.observable(dat).extend({ sync: { store: store } });
      ok(o.crud instanceof ko.sync.Crud, 'created a Crud object');
      def.fail(ok.bind(null, false)).always(start);
   });

   test('ko.extend(sync), observableArray', function() {
      expect(1);
      var o = ko.observableArray().extend({ sync: { store: new Store() } });
      ok(o.crud instanceof ko.sync.CrudArray, 'created a Crud object');
   });

   test('#isObservableArray, null', function() {
      expect(1);
      strictEqual(ko.sync.isObservableArray(null), false);
   });

   test('#isObservableArray, number', function() {
      expect(1);
      strictEqual(ko.sync.isObservableArray(5), false);
   });

   test('#isObservableArray, array', function() {
      expect(1);
      strictEqual(ko.sync.isObservableArray([1]), false);
   });

   test('#isObservableArray, observable', function() {
      expect(1);
      strictEqual(ko.sync.isObservableArray(ko.observable()), false);
   });

   test('#isObservableArray, observableArray', function() {
      expect(1);
      strictEqual(ko.sync.isObservableArray(ko.observableArray()), true);
   });

   test('#applyUpdates', function() {
      expect(4);
      var obs = ko.observable({
         one: 1,
         two: ko.observable(2),
         three: ko.observableArray([3]),
         four: 4,
         five: ko.observable(5)
      });

      var out = ko.sync.applyUpdates(obs, {one: 11, three: [33], five: 55});

      deepEqual(ko.sync.unwrapAll(obs), { one: 11, two: 2, three: [33], four: 4, five: 55 });
      strictEqual(obs, out, 'observable record not replaced or pointed to a new reference');
      strictEqual(obs().two, out().two, 'observable pointer not broken');
      strictEqual(obs().three, out().three, 'observableArray pointer not broken');
   });

   test('#unwrapAll', function() {
      expect(1);
      var obs = ko.observable({
         one: 1,
         two: ko.observable(2),
         three: ko.observableArray([3]),
         four: 4,
         five: ko.observable(5)
      });
      deepEqual(ko.sync.unwrapAll(obs), { one: 1, two: 2, three: [3], four: 4, five: 5 });
   });

   test('#watchRecord', function() {
      expect(1);
      var obs = {
         one: 1,
         two: ko.observable(2),
         three: ko.observableArray([3]),
         four: 4,
         five: ko.observable(5)
      };

      function watchFor(fn) {
         var d = ko.sync.watchRecord(fieldsOnlyStore, obs, function(v) {
            fn(v);
            d.dispose();
         });
      }

      watchFor(function(v) { deepEqual(ko.sync.unwrapAll(v), {one: 1, two: 2, three: [3], four: 4, five: 55}, 'updating nested value invokes update') });
      obs.five(55);
   });

   test('#watchRecord, observable', function() {
      expect(2);
      var obs = ko.observable({
         one: 1,
         two: ko.observable(2),
         three: ko.observableArray([3]),
         four: 4,
         five: ko.observable(5)
      });

      function watchFor(fn) {
         var d = ko.sync.watchRecord(fieldsOnlyStore, obs, function(v) {
            fn(v);
            d.dispose();
         });
      }

      watchFor(function(v) { deepEqual(ko.sync.unwrapAll(v), {one: 1, two: 2, three: [3], four: 44, five: 5}, 'updating invokes callback') });
      obs(_.extend({}, obs(), {four: 44}));

      watchFor(function(v) { deepEqual(ko.sync.unwrapAll(v), {one: 1, two: 2, three: [3], four: 44, five: 55}, 'updating nested value invokes update') });
      obs().five(55);
   });

   test('#watchFields', function() {
      expect(2);
      var obs = ko.observable({
         one: 1,
         two: ko.observable(2),
         three: ko.observableArray([3]),
         four: 4,
         five: ko.observable(5)
      }), ct = 0, lastVal;

      ko.sync.watchFields(fieldsOnlyStore, obs, function(v) {
         ct++;
         lastVal = v;
      });

      obs(_.extend({}, obs(), {four: 44}));
      obs().five(55);

      strictEqual(ct, 1, 'invoked callback once');
      deepEqual(ko.sync.unwrapAll(lastVal), ko.sync.unwrapAll(obs), 'invoked with correct values');
   });

   test('#isEqual', function() {
      var obs = ko.observable({
         one: 1,
         two: ko.observable(2),
         three: ko.observableArray([3]),
         four: 4,
         five: ko.observable(5)
      });

      strictEqual(ko.sync.isEqual(fieldsOnlyStore.getFieldNames(), obs, {
         one: 1, two: 2, three: [3], four: 4, five: 5, six: 66
      }), true);
   });

})();