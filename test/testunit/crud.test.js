(function($) {
   "use strict";

   var Crud = ko.sync.Crud, TD = ko.sync.TestData;

   module('Crud');

   asyncTest('#create', function() {
      expect(3);
      var model = TD.model({auto: false});
      var rec   = TD.tempRec();
      var view  = {data: rec.getData(true)};

      model.sync(view);
      // invoke the create operation
      var crud = view.crud.create();
      // cheat and get the deferred object directly, which we can reject with a timeout
      TD.expires(crud.def);

      crud.promise()
            .then(function() {
               var events = model.store.eventsFiltered();
               strictEqual(events.length, 1, 'created one event');
               strictEqual(events[0][0], 'create', 'it was a create event');
               var key = new ko.sync.KeyFactory(model, true).make(view.data);
               rec.updateHashKey(key);
               deepEqual(TD.forCompare(model.store.find(key)), TD.forCompare(rec), 'store has correct data');
            })
            .fail(function(e) { ok(false, e); })
            .always(start);
   });

   asyncTest('#read', function() {
      var model = TD.model({}, true, TD.recs(5));
      var obs = ko.observable().extend({crud: model});
      obs.crud.read('record-2').promise()
            .then(function() {
               deepEqual(TD.forCompare(obs), TD.forCompare(2));
            })
            .fail(function(e) {ok(false, e)})
            .always(start);
   });

   asyncTest('#update', function() {
      expect(4);
      var model = TD.model({}, true, TD.recs(5));
      var rec = TD.rec(2);
      var obs = ko.observable().extend({crud: [model, 'record-2']});
      obs.crud.update({intOptional: 11}).promise()
            .then(function() {
               var expected = TD.forCompare(_.extend(rec.getData(), {intOptional: 11}));
               var storeRec = model.store.find(rec.hashKey());
               var events   = model.store.eventsFiltered();
               strictEqual(events.length, 2, 'found two events');
               deepEqual(_.map(events, function(v) { return v[0]; }), ['read', 'update'], 'a read and an update event');
               deepEqual(TD.forCompare(obs), expected, 'obs has correct values');
               deepEqual(TD.forCompare(storeRec), expected, 'store has correct values');
            })
            .fail(function(e) {ok(false, e)})
            .always(start);
   });

   asyncTest('#delete', function() {
      expect(3);
      var model = TD.model({auto: false}, true, TD.recs(5));
      var rec   = TD.tempRec();
      var view  = {data: rec.getData(true)};

      model.sync(view);
      // invoke the create operation
      var crud = view.crud.read('record-2').delete();
      // cheat and get the deferred object directly, which we can reject with a timeout
      TD.expires(crud.def);

      crud.promise()
            .then(function() {
               var events = model.store.eventsFiltered();
               strictEqual(events.length, 2, 'found two events');
               deepEqual(_.map(events, function(v) { return v[0]; }), ['read', 'delete'], 'a read and delete event');
               var key = new ko.sync.KeyFactory(model, true).make(view.data);
               rec.updateHashKey(key);
               deepEqual(model.store.find(key), undefined, 'record not in store anymore');
            })
            .fail(function(e) {ok(false, e)})
            .always(start);
   });

   asyncTest('#promise', function() {
      expect(3);
      var model = TD.model({}, true, TD.recs(5));
      var crud = ko.observable().extend({crud: model}).crud;
      strictEqual(crud.promise().state(), 'resolved', 'initially promise is resolved');
      var promise = crud.read('record-4').promise();
      TD.expires(crud.def); // reject if it doesn't resolve
      strictEqual(promise.state(), 'pending', 'is pending after store update');
      promise.then(function() { ok(true, 'resolved'); }).always(start);
   });

})(jQuery);

