(function($) {
   "use strict";

   var Crud = ko.sync.Crud, TD = ko.sync.TestData;

   module('Crud');

   asyncTest('#create', function() {
      expect(2);
      var model = TD.model({auto: false});
      var rec   = TD.tempRec();
      var view  = {data: rec.getData(true)};

      model.sync(view);
      var def = view.crud.create().promise();
      TD.expires(def); // timeout

      def.then(function() {
            var events = model.store.eventsFiltered();
            strictEqual(events.length, 1, 'created one event');
            strictEqual(events[0][0], 'create', 'it was a create event');
         })
         .fail(function(e) { ok(false, e); })
         .always(start);
   });

   asyncTest('#read', function() {
      var model = TD.model({}, true, TD.recs(5));
      var obs = ko.observable().extend({crud: model});
      obs.crud.read('record-2').promise().then(function() {
         deepEqual(TD.forCompare(obs), TD.forCompare(2));
         start();
      })
   });

   asyncTest('#update', function() {
      expect(2);
      var model = TD.model({}, true, TD.recs(5));
      var rec = TD.rec(2);
      var obs = ko.observable().extend({crud: [model, 'record-2']});
      deepEqual(TD.forCompare(obs), TD.forCompare(rec.getData()), 'begins with correct values');
      obs.crud.update({intOptional: 11}).promise().then(function() {
         var expData = TD.forCompare(_.extend(rec.getData(), {intOptional: 11}));
         deepEqual(TD.forCompare(obs), expData, 'ends with correct values');
         start();
      })
   });

   test('#delete', function() {
      //todo-test
   });

   test('#promise', function() {
      //todo-test
   });

   test('remote update', function() {
      //todo-test
   });

   test('local update', function() {
      //todo-test
   });

   test('chained commands', function() {
      //todo-test
   });

   test('Store.LAST', function() {
      //todo-test
   });

})(jQuery);

