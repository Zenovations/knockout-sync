/*! ko.sync.test.js.js
 *************************************/
(function ($) {
   "use strict";

   module('ko.sync');

   var Store = ko.sync.stores.TestStore;

   test('ko.extend(crud), observable', function() {
      expect(1);
      var o = ko.observable().extend({ sync: { store: new Store(), key: 'three' } });
      ok(o.crud instanceof ko.sync.Crud, 'created a Crud object');
   });

   asyncTest('ko.extend(crud), observable with key', function() {
      expect(2);
      var store = new Store();
      var o = ko.observable();
      var def = ko.sync.test.def(function(def) {
         o.subscribe(function(data) {
            strictEqual(data, store.data['three']);
            def.resolve();
         });
      });
      o.extend({ sync: { store: store, key: 'three' } });
      ok(o.crud instanceof ko.sync.Crud, 'created a Crud object');
      def.always(start);
   });

   asyncTest('ko.extend(crud), observable with data', function() {
      expect(3);
      var store = new Store(), dat = { _key: 'five', name: 'Fiver', email: 'fiver@five.com' };
      var def = ko.sync.test.def(function(def) {
         store.on('create', function(key, data) {
            strictEqual(key, 'five');
            deepEqual(data, dat);
            def.resolve();
         });
      });
      var o = ko.observable(dat).extend({ sync: { store: store } });
      ok(o.crud instanceof ko.sync.Crud, 'created a Crud object');
      def.always(start);
   });

   test('ko.extend(crud), observableArray', function() {
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

})(jQuery);