
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
      expect(1);
      _runChangeWithTimeout({action: 'create', to: 'store'})
         .done(function(change, id) {
            strictEqual(id, 'record-5', 'record id is correct');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });

   test('#run, create in obs', function() {
      expect(1);
      var obs = ko.observable;
      _runChangeWithTimeout({obs: obs, action: 'create', to: 'obs'})
         .done(function() {
            strictEqual(obs().id, 'record-5', 'record id is correct');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });


   test('#run, create in observableArray', function() {
      expect(1);
      var obs = ko.observableArray();
      _runChangeWithTimeout({obs: obs, action: 'create', to: 'obs'})
         .done(function() {
            strictEqual(obs().id, 'record-5', 'record id is correct');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });

   test('#run, create in object', function() {
      expect(1);
      var obs = {};
      _runChangeWithTimeout({obs: obs, action: 'create', to: 'obs'})
         .done(function() {
            strictEqual(obs.data.id, 'record-5', 'record id is correct');
         })
         .fail(function(e) { throw e; })
         .always(start);
   });

   test('#run, update in store', function() {

   });

   test('#run, update in obs', function() {

   });

   test('#run, update in obsArray', function() {

   });

   test('#run, update in object', function() {

   });

   test('#run, delete in store', function() {

   });

   test('#run, delete in obs', function() {

   });

   test('#run, move in store', function() {

   });

   test('#run, move in obs', function() {

   });

   test('#run, obsArray modified on create', function() {

   });

   test('#run, obsArray modified on delete', function() {

   });

   test('#run, obsArray modified on move', function() {

   });

   test('#run, obs modified on update', function() {

   });

   test('#run, object modified on update', function() {

   });

   test('#run, id set correctly on record', function() {

   });

   test('#fromChangeList', function() {

   });

//   *    to {string} one of 'store', 'list', or 'data'
//   *    action {string} one of 'create', 'update', 'delete', or 'move'
//   *    prevId {string} required by move and add operations
//   *    data   {object} required by add and update, the data to be applied in the change
//   *    model  {ko.sync.Model}
//   *    rec    {ko.sync.Record} the reference record to determine changes
//   *    obs    {Object|ko.sync.observable} the knockout data being synced (observed)

   function _change(opts, id) {
      if( typeof(opts) === 'number' ) {
         id = opts;
         opts = null;
      }
      id || (id = 5);
      var rec = TestData.rec(id);
      var model = getModelWithStore();
      return new Change(_.extend({
         to:     'store',
         action: 'create',
         prevId: 'record-4',
         data:   null,
         model:  model,
         rec:    rec,
         obs:    ko.sync.Record.applyWithObservables(ko.observable(), rec.getData(true), model.observedFields())
      }, opts));
   }

   function _runChangeWithTimeout(opts, id) {
      var def = _change(opts, id).run({keyFactory: getKeyFactory()});
      TestData.expires(def);
      return def;
   }

   function getKeyFactory() {
      return new ko.sync.KeyFactory(TestData.model(), true);
   }

   function getModelWithStore() {
      return TestData.model({store: getFakeStore()});
   }

   function getFakeStore(recs) {
      var events = [];
      function callback() {
         events.push.apply(events, _.toArray(arguments));
      }
      var store = new TestData.TestStore(true, TestData.model(), callback, recs || TestData.recs(5));
      store._testEvents = events;
      return store;
   }

   function FakeChangeController() {
      this.expect = function(exp) {
         this.events.push(exp);
      };
      this.events = [];
   }
//         add: function(change) {
//            if( !(change instanceof ko.sync.Change) ) { throw new Error('not a Change instance'); }
//            changes.push(change);
//         },
//         process: function(store) {
//            var promises = [], self = this;
//            _.each(changes, function(change) {
//               promises.push(change.run(self, store));
//            });
//            return $.when.apply($, promises);
//         }
//   }

})(ko, jQuery);

