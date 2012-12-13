
(function(ko, $){
   "use strict";

   var TestData = ko.sync.TestData;
   var Change = ko.sync.Change;

   module('Change');

   test('#equals, true', function() {
      var ch1 = _change();
      var ch2 = _change();
      ok(ch1.equals(ch2));
   });

   test('#equals, true with data', function() {
      var ch1 = _change({data: {apples: 'oranges'}});
      var ch2 = _change({data: {apples: 'oranges'}});
      ok(ch1.equals(ch2));
   });

   test('#equals, false data', function() {
      var ch1 = _change({action: 'update', data: {apples: 'oranges'}});
      var ch2 = _change({action: 'update', data: {apples: 'bananas'}});
      ok(!ch1.equals(ch2));
   });

   test('#equals, false to', function() {
      var ch1 = _change({to: 'store'});
      var ch2 = _change({to: 'rec'});
      ok(!ch1.equals(ch2));
   });

   test('#equals, false action', function() {
      var ch1 = _change({action: 'create'});
      var ch2 = _change({action: 'update'});
      ok(!ch1.equals(ch2));
   });

   test('#equals, false prevId', function() {
      var ch1 = _change({action: 'move', prevId: 'record-2'});
      var ch2 = _change({action: 'move', prevId: null});
      ok(!ch1.equals(ch2));
   });

   test('#equals, false key', function() {
      var ch1 = _change();
      var ch2 = _change({rec: TestData.rec(12)});
      ok(!ch1.equals(ch2));
   });

   test('#key', function() {
      var ch = _change(12);
      strictEqual(ch.key(), 'record-12');
   });

   test('#run, returns a promise', function() {
      var promise = _change().run();
      ok( promise.then && promise.always && promise.fail && promise.done, 'returned a promise');
   });

   asyncTest('#run, create in store', function() {
      expect(2);
      _runChangeWithTimeout({action: 'create', to: 'store'})
         .done(function(change, id) {
            strictEqual(id, 'record-5', 'record id is correct');
            deepEqual(change.model.store.eventsFiltered(), [
               ['create', 'record-5']
            ]);
         })
         .fail(function(e) { throw e; })
         .always(start);
   });

   test('#run, create in obs', function() {
      expect(1);
      var obs = ko.observable();
      _runChangeWithTimeout({obs: obs, action: 'create', to: 'obs', data: TestData.dat(5)}, 5)
         .done(function() {
            strictEqual(obs().id, 'record-5', 'record id is correct');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });


   test('#run, create in observableArray', function() {
      expect(2);
      var obs = ko.observableArray();
      _runChangeWithTimeout({obs: obs, action: 'create', to: 'obs', data: TestData.dat(3), rec: TestData.rec(3)})
         .done(function() {
            var recs = obs();
            strictEqual(recs.length, 1);
            strictEqual(recs[0].id, 'record-3', 'record id is correct');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });

   test('#run, create in object', function() {
      expect(1);
      var obs = {};
      _runChangeWithTimeout({obs: obs, action: 'create', to: 'obs', data: TestData.dat(5)}, 5)
         .done(function(change, id) {
               console.log(obs);
            strictEqual(obs.data.id, id, 'record id is correct');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });

   asyncTest('#run, update in store', function() {
      expect(2);
      var rec = TestData.rec(3);
      rec.set('intOptional', -999);
      _runChangeWithTimeout({action: 'update', to: 'store', rec: rec}, rec.hashKey())
            .done(function(change) {
               strictEqual(change.key(), rec.hashKey(), 'record id is correct');
               deepEqual(change.model.store.eventsFiltered(), [
                  ['update', rec.hashKey()]
               ])
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   test('#run, update in obs', function() {
      expect(1);
      var origData = TestData.dat(4), data = {intOptional: -999}, target = ko.observable(origData);
      _runChangeWithTimeout({obs: target, action: 'update', to: 'obs', data: data}, 4)
            .done(function(change) {
               deepEqual(ko.sync.unwrapAll(target()), _.extend(origData, {intOptional: -999}));
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   test('#run, update in obsArray', function() {
      expect(2);
      var origData = TestData.dat(4), data = {intOptional: -999}, target = ko.observableArray([origData]);
      _runChangeWithTimeout({obs: target, action: 'update', to: 'obs', data: data}, 4)
            .done(function(change) {
               strictEqual(target().length, 1, 'has one record');
               deepEqual(ko.sync.unwrapAll(target()[0]), _.extend(origData, {intOptional: -999}));
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   test('#run, update in object', function() {
      expect(1);
      var origData = TestData.dat(4), data = {intOptional: -999}, target = { data: origData };
      _runChangeWithTimeout({obs: target, action: 'update', to: 'obs', data: data}, 4)
            .done(function(change) {
               deepEqual(ko.sync.unwrapAll(target.data), _.extend(origData, {intOptional: -999}));
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   asyncTest('#run, delete in store', function() {
      expect(1);
      var rec = TestData.rec(2);
      _runChangeWithTimeout({action: 'delete', to: 'store', rec: rec})
            .done(function(change) {
               deepEqual(change.model.store.eventsFiltered(), [
                     ['delete', rec.hashKey()]
               ]);
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   test('#run, delete in obsArray', function() {
      expect(2);
      var obs = ko.observableArray();
      TestData.pushRecsToObservableArray(obs, TestData.recs(5));
      _runChangeWithTimeout({obs: obs, action: 'delete', to: 'obs', rec: TestData.rec(3)})
            .done(function() {
               var recs = obs();
               strictEqual(recs.length, 4);
               deepEqual(_.pluck(obs(), 'id'),
                     ['record-1', 'record-2', 'record-4', 'record-5']);
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   asyncTest('#run, move in store', function() {
      expect(1);
      var recs = TestData.recs(5), recToMove = recs[3], moveAfter = recs[1].hashKey();
      _runChangeWithTimeout({action: 'move', to: 'store', rec: recToMove, prevId: moveAfter})
            .done(function(change) {
               deepEqual(change.model.store.eventsFiltered(), [
                  ['update', recToMove.hashKey()]
               ]);
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   test('#run, move in obsArray', function() {
      expect(1);
      var recs = TestData.recs(5), obs = ko.observableArray(), recToMove = recs[4], moveAfter = recs[1].hashKey();
      TestData.pushRecsToObservableArray(obs, recs);
      _runChangeWithTimeout({obs: obs, action: 'move', to: 'obs', rec: recToMove, prevId: moveAfter})
            .done(function(change) {
               var obsKeys = _.pluck(obs(), 'id');
               deepEqual(obsKeys, ['record-1', 'record-2', 'record-5', 'record-3', 'record-4']);
            })
            .fail(function(e) { throw e; })
            .always(start);
   });

   asyncTest('#run, timeout', function() {
      start();
   });

   test('#fromChangeList', function() {
      var rec = TestData.rec(1), afterKey = TestData.rec(4).hashKey(),
          change = ko.sync.Change.fromChangeList(
            'store',
            TestData.model(),
            [ 'added', rec, afterKey ],
            {}
      );

      strictEqual(change.key(), rec.hashKey(), 'key set correctly');
      strictEqual(change.prevId, afterKey, 'prevId set correctly');
      strictEqual(change.to, 'store', 'to set correctly');
   });

   test('#invalidate', function() {
      var obs = {}, change = _change({obs: obs, action: 'create', to: 'obs', data: TestData.dat(5)});
      change.invalidate();
      var def = change.run();
      TestData.expires(def);
      def
         .done(function(change) {
            deepEqual(obs, {}, 'change did not run');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });

   function _change(opts, id) {
      if( typeof(opts) === 'number' ) {
         id = opts;
         opts = null;
      }
      id || (id = 5);
      var model = getModelWithStore();
      var rec = TestData.rec(id, opts && opts.data, model);
      return new Change(_.extend({
         to:     'store',
         action: 'create',
         prevId: 'record-4',
         data:   null,
         model:  model,
         rec:    rec,
         obs:    opts && opts.obs? null : rec.applyData()
      }, opts));
   }

   function _runChangeWithTimeout(opts, id) {
      var def = _change(opts, id).run();
      TestData.expires(def);
      return def;
   }

   function getModelWithStore() {
      return TestData.model({store: getFakeStore()});
   }

   function getFakeStore(recs) {
      return new TestData.TestStore(recs || TestData.recs(5));
   }

})(ko, jQuery);

