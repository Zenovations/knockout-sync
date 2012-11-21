
(function($) {
   "use strict";
   var undef;

   var FIREBASE_URL = 'http://wordspot.firebaseio.com/';
   var FIREBASE_TEST_URL = 'GitHub/firebase-sync';

   var TestData       = ko.sync.TestData,
       RecordList     = ko.sync.RecordList,
       SyncController = ko.sync.SyncController;

   module('SyncController');

   asyncTest('#pushUpdates(record) manually push a record update', function() {
      expect(1);
      var recs     = TestData.recs(3), record = recs[1];
      syncActivity({
         recs: recs,
         fx: function(sync, list) {
            // set some values and make sure they work
            record.isDirty(true);
            return sync.pushUpdates(record, 'updated');
         },
         results: function(results) {
            deepEqual(results, [
               ['update', 'record-2']
            ], 'correct events invoked on Store object');
         },
         rec: record,
         model: {auto: false}
      });
   });

   asyncTest('#pushUpdates(record) push update but record isn\'t dirty', function() {
      expect(1);
      var recs     = TestData.recs(3), record = recs[1];
      syncActivity({
         recs: recs,
         fx: function(sync) {
         return sync.pushUpdates(record, 'updated');
      },
      results: function(results) {
         deepEqual(results, [], 'correct events invoked on Store object');
      },
      rec: record,
            model: {auto: false}
      });
   });

   asyncTest('#pushUpdates, test a host of pushed changes', function() {
      expect(1);
      var recs     = TestData.recs(25), startRecs = recs.slice(0, 20);
      syncActivity({
         recs: startRecs,
         fx: function(sync, list) {
            list.add(recs[21]);
            list.add(recs[22]);
            list.find('record-14').set('intOptional', 25);
            list.find('record-15').set('intOptional', 26);
            list.find('record-16').set('intOptional', 27);
            list.remove('record-16');
            list.remove('record-17');
            list.move(recs[18], 'record-3');
            return sync.pushUpdates();
         },
         results: function(results) {
            deepEqual(results, [
               ['create', 'record-22'],
               ['create', 'record-23'],
               ['update', 'record-19'],
               ['update', 'record-14'],
               ['update', 'record-15'],
//            ['update', 'record-16'],
               ['delete', 'record-16'],
               ['delete', 'record-17']
            ], 'correct events invoked on Store object');
         }, model: {auto: false}
      });
   });

   asyncTest('pull added (list)',   function() {
      expect(1);
      var recs     = TestData.recs(25), startRecs = recs.slice(0, 20), rec = recs[20];
      syncActivity({
         recs: startRecs,
         fx: function(sync, list, model) {
            return model.store.fakeNotify('added', rec.hashKey(), rec.getData(), recs[19].hashKey());
         },
         results: function(storeEvents, listEvents) {
            deepEqual(listEvents, [
               ['added', 'record-21', 'record-20']
            ]);
         }
      })
   });

   asyncTest('push added (list)',   function() {
      expect(1);
      var recs     = TestData.recs(5), startRecs = recs.slice(0, 4);
      syncActivity({
         recs: startRecs,
         fx: function(sync, list) {
            list.add(recs[4]);
            return TestData.deferWait(); // wait for server replies
         },
         results: function(storeEvents, listEvents) {
            deepEqual(storeEvents, [
               ['create', 'record-5']
            ]);
         }
      })
   });

   asyncTest('pull updated (list)', function() {
      expect(1);
      var recs     = TestData.recs(5), startRecs = recs.slice(0, 4);
      syncActivity({
         recs: startRecs,
         fx: function(sync, list, model) {
            return model.store.fakeNotify('updated', 'record-3', {boolOptional: true});
         },
         results: function(storeEvents, listEvents) {
            deepEqual(listEvents, [
               ['updated', 'record-3', ['boolOptional']]
            ]);
         }
      })
   });

   asyncTest('push updated (list)', function() {
      expect(1);
      var recs = TestData.recs(5);
      syncActivity({
         recs: recs,
         fx: function(sync, list) {
            recs[0].set('stringOptional', 'happy! happy! joy! joy!');
            return TestData.deferWait(); // wait for a server response
         },
         results: function(storeEvents) {
            deepEqual(storeEvents, [
               ['update', 'record-1']
            ]);
         }
      });
   });

   asyncTest('pull deleted (list)', function() {
      expect(1);
      var recs = TestData.recs(5);
      syncActivity({
         recs: recs,
         fx: function(sync, list, model) {
            return model.store.fakeNotify('deleted', 'record-2');
         },
         results: function(storeEvents, listEvents) {
            deepEqual(listEvents, [
               ['deleted', 'record-2']
            ]);
         }
      });
   });

   asyncTest('push deleted (list)', function() {
      expect(1);
      var recs = TestData.recs(5);
      syncActivity({
         recs: recs,
         fx: function(sync, list, model) {
            list.remove('record-2');
            return TestData.deferWait(); // wait for server replies
         },
         results: function(storeEvents, listEvents) {
            deepEqual(storeEvents, [
               ['delete', 'record-2']
            ]);
         }
      });
   });

   asyncTest('pull moved (list)',   function() {
      expect(1);
      var recs = TestData.recs(5);
      syncActivity({
         recs: recs,
         fx: function(sync, list, model) {
            return model.store.fakeNotify('moved', 'record-4', null, 'record-1');
         },
         results: function(storeEvents, listEvents) {
            deepEqual(listEvents, [
               ['moved', 'record-4', 'record-1']
            ]);
         }
      });
   });

   asyncTest('push moved (list)',   function() {
      expect(1);
      var recs = TestData.recs(5);
      syncActivity({
         recs: recs,
         fx: function(sync, list, model) {
            list.move(recs[2], 0);
            return TestData.deferWait(); // wait for server replies
         },
         results: function(storeEvents, listEvents) {
            deepEqual(storeEvents, [
               ['update', 'record-3']
            ]);
         }
      });
   });

   asyncTest('push updated (record)', function() {
      expect(1);
      var rec = TestData.rec(5);
      syncActivity({
         recs: [rec],
         fx: function(sync, list, model) {
            rec.set('boolOptional', true);
            return TestData.deferWait(); // wait for server replies
         },
         results: function(storeEvents, listEvents) {
            deepEqual(storeEvents, [
               ['update', 'record-5']
            ]);
         },
         rec: rec
      });
   });

   asyncTest('pull updated (record)', function() {
      expect(1);
      var recs = TestData.recs(2);
      syncActivity({
         recs: recs,
         fx: function(sync, list, model) {
            return model.store.fakeNotify('updated', 'record-2', {stringOptional: 'oh joy!'});
         },
         results: function(storeEvents, listEvents) {
            deepEqual(listEvents, [
               ['record-2', ['stringOptional']]
            ]);
         },
         rec: recs[1]
      });
   });

   asyncTest('auto-sync off: push does not go through automatically', function() {
      expect(1);
      var recs = TestData.recs(2);
      syncActivity({
         recs: recs,
         fx: function(sync, list, model) {
            list.remove(recs[0]);
            return TestData.deferWait(); // wait for server replies
         },
         results: function(storeEvents, listEvents) {
            strictEqual(storeEvents.length, 0);
         },
         model: {auto: false}
      });
   });

   asyncTest('auto-sync off (record): push does not go through automatically', function() {
      expect(1);
      var recs = TestData.recs(2);
      syncActivity({
         recs: recs,
         fx: function (sync, list, model) {
            recs[1].set('stringOptional', 'oh joy!');
            return TestData.deferWait(); // wait for server replies
         },
         results: function (storeEvents, listEvents) {
            strictEqual(storeEvents.length, 0);
         },
         rec: recs[1],
         model: {auto:false}
      });
   });

   asyncTest('hasTwoWay off: pull on list not get monitored', function() {
      expect(1);
      var recs = TestData.recs(2);
      syncActivity({
         recs: recs,
         fx: function(sync, list, model) {
            model.store.fakeNotify('updated', 'record-1', {stringOptional: 'oh joy!'});
         },
         results: function(storeEvents, listEvents) {
            strictEqual(listEvents.length, 0);
         },
         twoWaySync: false
      });
   });

   asyncTest('hasTwoWay off: pull on rec not get monitored', function() {
      expect(1);
      var recs = TestData.recs(2);
      syncActivity({
         twoWaySync: false,
         rec: recs[0],
         recs: recs,
         fx: function(sync, list, model) {
            model.store.fakeNotify('updated', 'record-1', {stringOptional: 'oh joy!'});
         },
         results: function(storeEvents, listEvents) {
            strictEqual(listEvents.length, 0);
         }
      });
   });

   asyncTest('hasTwoWay: record does not exist at sync time', function() {
      expect(1);
      var rec = TestData.rec(null), oldKey = rec.hashKey(), recs = TestData.recs(3);
      syncActivity({
         fx: function() {},
         results: function(storeEvents) {
            deepEqual(storeEvents, [
               ['create', oldKey]
            ])
         },
         rec: rec
      });
   });

   asyncTest('target: an observable gets set with correct data', function() {
      expect(2);
      var rec = TestData.rec(1);
      syncActivity({
         fx: function(sync, list, model, target) {
            ok(ko.isObservable(target) && !ko.sync.isObservableArray(target), 'is an observable object');
            deepEqual(target(), rec.getData());
         },
         rec: rec
      });
   });

   asyncTest('target: an observableArray gets set with correct data', function() {
      expect(2);
      var recs = TestData.recs(3);
      syncActivity({
         fx: function(sync, list, model, target) {
            ok(ko.isObservable(target) && ko.sync.isObservableArray(target), 'is an observableArray');
            deepEqual(target(), dataFromRecs(recs));
         },
         recs: recs
      });
   });

   asyncTest('target: an object gets a data element with correct data', function() {
      expect(2);
      var rec = TestData.rec(10), target = {};
      syncActivity({
         target: target,
         fx: function(sync, list, model, target) {
            ok(!ko.isObservable(target), 'is not observable');
            deepEqual(target.data, rec.getData());
         },
         rec: rec
      });
   });

   asyncTest('#pushUpdates: isDirty cleared on Record', function() {
      expect(2);
      var rec = TestData.rec(5);
      syncActivity({
         rec: rec,
         model: {auto: false},
         fx: function(sync, list) {
            rec.set('stringOptional', 'memememe');
            strictEqual(rec.isDirty(), true, 'Record dirty after changes');
            return sync.pushUpdates();
         },
         results: function(storeEvents, listEvents, target, list) {
            strictEqual(rec.isDirty(), false, 'Record not dirty after pushing updates')
         }
      });
   });

   asyncTest('#pushUpdates: isDirty cleared on RecordList', function() {
      expect(2);
      var recs = TestData.recs(5);
      syncActivity({
         recs: recs,
         model: {auto: false},
         fx: function(sync, list) {
            _.each(recs, function(rec) { rec.set('stringOptional', 'wohoo!'); });
            strictEqual(list.isDirty(), true, 'list is dirty after changes');
            return sync.pushUpdates();
         },
         results: function(storeEvents, listEvents, target, list) {
            strictEqual(list.isDirty(), false, 'list is not dirty after pushing updates')
         }
      });
   });

   asyncTest('observable: modifying it propagates changes', function() {
      start(); //todo-test
   });

   asyncTest('observableArray: modifying it propagates changes', function() {
      start(); //todo-test
   });

   asyncTest('observable: change on server propagates down', function() {
      start(); //todo-test
   });

   asyncTest('observableArray: change on server propagates down', function() {
      start(); //todo-test
   });

   /**
    * Create a SyncController and run some tests on it, then evaluate results. Sets a timeout for tests which are overdue.
    *
    * The `conf` required keys:
    *    {Function} fx - the test function to invoke with signature function(SyncController, RecordList, Model, target)
    *
    * The `conf` optional keys:
    *    {Array}   recs - Record objects to "load" into the TestStore "database", they are also used to create a RecordList for SyncController
    *    {Object}  model - properties passed directly to TestData.model
    *    {boolean} twoWaySync - (defaults to true) set to false to disable two way sync in TestStore
    *    {Record}  rec - monitor exactly one Record to monitor in SyncController instead of the generated RecordList
    *    {Object|oservable|observableArray} target - override the default, which is observable if conf.rec is set or observableArray in all other cases
    *
    * @param conf
    * @return {*}
    */
   function syncActivity(conf) {
      //todo this method is ugly
      conf = _.extend({twoWaySync: true, recs: []}, conf);
      var storeEvents = [],
          listEvents  = [],
          model       = TestData.model($.extend({store: new TestData.TestStore(conf.twoWaySync, TestData.model(), _monitorStore, conf.recs), auto: true}, conf.model)),
          list        = new RecordList(model, conf.recs),
          target      = conf.target? conf.target : (conf.rec? ko.observable() : ko.observableArray()),
          sync        = new ko.sync.SyncController(model, target, conf.rec? conf.rec: list);

      console.log('model.auto', model.auto, conf);//debug

      if( conf.rec ) {
         conf.rec.subscribe(_monitorList);
      }
      else {
         list.subscribe(_monitorList);
      }

      // invoke the test
      var def = $.Deferred(function(def) {
         TestData.expires(def);
         $.when(conf.fx(sync, list, model, target)).then(def.resolve, def.reject);
      });

      // make sure our async test restarts and rejects are handled
      return def
         .then(_resolve)
         .fail(function(e) {
            ok(false, e||'syncActivity failed to resolve');
         })
         .always(start);

      // callback to resolve and invoke the test analysis
      function _resolve() {
         conf.results && conf.results(storeEvents, listEvents, target, list);
      }

      function _monitorStore() {
         if( arguments[0] in {hasTwoWaySync: 1, watch: 1, watchRecord: 1} ) { return; } // suppress this event which we don't care about
//            console.log('store: ', $.makeArray(arguments));
         storeEvents.push($.makeArray(arguments));
      }

      function _monitorList() {
//            console.log('list: ', $.makeArray(arguments));
         var args = $.makeArray(arguments);
         $.each(args, function(i,v) {
            if( v && v instanceof ko.sync.Record ) { args[i] = v.hashKey(); }
         });
         listEvents.push(args);
      }

   }

   function dataFromRecs(recs) {
      return _.map(recs, function(rec) {
         return rec.getData();
      });
   }

})(jQuery);

