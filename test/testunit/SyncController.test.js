
(function($) {
   "use strict";
   var undef;

   var FIREBASE_URL = 'http://wordspot.firebaseio.com/';
   var FIREBASE_TEST_URL = 'GitHub/firebase-sync';

   var TestData       = ko.sync.TestData,
       BigData        = TestData.bigData,
       RecordList     = ko.sync.RecordList,
       SyncController = ko.sync.SyncController,
       TABLE          = BigData.props.table,
       FIREBASE       = new Firebase(FIREBASE_URL+'/'+FIREBASE_TEST_URL);

   module('SyncController');

   asyncTest('#pushUpdates(record) manually push a record update', function() {
      var recs     = BigData.recs(3), record = recs[1];

      syncActivity(recs, function(sync, list) {
            // set some values and make sure they work
            record.isDirty(true);
            return sync.pushUpdates(record, 'updated');
         }, function(results) {
            deepEqual(results, [
               ['update', '2']
            ], 'correct events invoked on Store object');
         }, {rec: record, model: {auto: false}});
   });

   asyncTest('#pushUpdates(record) push update but record isn\'t dirty', function() {
      var recs     = BigData.recs(3), record = recs[1];
      syncActivity(recs, function(sync) {
         return sync.pushUpdates(record, 'updated');
      }, function(results) {
         deepEqual(results, [
         ], 'correct events invoked on Store object');
      }, {rec: record, model: {auto: false}});
   });

   asyncTest('#pushUpdates, test a host of pushed changes', function() {
      var recs     = BigData.recs(25), startRecs = recs.slice(0, 20);

      syncActivity(startRecs, function(sync, list) {
         console.log('running test');
         list.add(recs[21]);
         list.add(recs[22]);
         list.find('14').set('sort', 25);
         list.find('15').set('sort', 26);
         list.find('16').set('sort', 27);
         list.remove('16');
         list.remove('17');
         list.move(recs[18], '3');
         var promises = [];
         promises.push(sync.pushUpdates(_.values(list.added),   'added'));
         promises.push(sync.pushUpdates(_.values(list.changed), 'updated'));
         promises.push(sync.pushUpdates(_.values(list.deleted), 'deleted'));
         promises.push(sync.pushUpdates(_.values(list.moved),   'moved'));
         return $.when(promises);
      }, function(results) {
         deepEqual(results, [
            ['create', '22'],
            ['create', '23'],
            ['update', '14'],
            ['update', '15'],
//            ['update', '16'],
            ['delete', '16'],
            ['delete', '17']
         ], 'correct events invoked on Store object');
      }, {model: {auto: false}});
   });

   asyncTest('pull added (list)',   function() {
      var recs     = BigData.recs(25), startRecs = recs.slice(0, 20), rec = recs[20];
      syncActivity(startRecs, function(sync, list, model) {
         return model.store.fakeNotify('added', rec.hashKey(), rec.getData(), recs[19].hashKey());
      }, function(storeEvents, listEvents) {
         deepEqual(listEvents, [
            ['added', '21', '20']
         ]);
      })
   });

   asyncTest('push added (list)',   function() {
      var recs     = BigData.recs(5), startRecs = recs.slice(0, 4);
      syncActivity(startRecs, function(sync, list) {
         list.add(recs[4]);
      }, function(storeEvents, listEvents) {
         deepEqual(storeEvents, [
            ['create', '5']
         ]);
      })
   });

   asyncTest('pull updated (list)', function() {
      var recs     = BigData.recs(5), startRecs = recs.slice(0, 4);
      syncActivity(startRecs, function(sync, list, model) {
         return model.store.fakeNotify('updated', '3', {aBool: true});
      }, function(storeEvents, listEvents) {
         deepEqual(listEvents, [
            ['updated', '3', ['aBool']]
         ]);
      })
   });

   asyncTest('push updated (list)', function() {
      var recs = BigData.recs(5);
      syncActivity(recs, function(sync, list) {
         recs[0].set('aString', 'happy! happy! joy! joy!');
      }, function(storeEvents) {
         deepEqual(storeEvents, [
            ['update', '1']
         ]);
      });
   });

   asyncTest('pull deleted (list)', function() {
      var recs = BigData.recs(5);
      syncActivity(recs, function(sync, list, model) {
         return model.store.fakeNotify('deleted', '2');
      }, function(storeEvents, listEvents) {
         deepEqual(listEvents, [
            ['deleted', '2']
         ]);
      });
   });

   asyncTest('push deleted (list)', function() {
      var recs = BigData.recs(5);
      syncActivity(recs, function(sync, list, model) {
         list.remove('2');
      }, function(storeEvents, listEvents) {
         deepEqual(storeEvents, [
            ['delete', '2']
         ]);
      });
   });

   asyncTest('pull moved (list)',   function() {
      var recs = BigData.recs(5);
      syncActivity(recs, function(sync, list, model) {
         return model.store.fakeNotify('moved', '4', null, '1');
      }, function(storeEvents, listEvents) {
         deepEqual(listEvents, [
            ['moved', '4', '1']
         ]);
      });
   });

   asyncTest('push moved (list)',   function() {
      var recs = BigData.recs(5);
      syncActivity(recs, function(sync, list, model) {
         list.move(recs[2], 0);
      }, function(storeEvents, listEvents) {
         deepEqual(storeEvents, [
            ['update', '3']
         ]);
      });
   });

   asyncTest('push updated (record)', function() {
      var rec = BigData.record(5);
      syncActivity([rec], function(sync, list, model) {
         rec.set('aBool', true);
      }, function(storeEvents, listEvents) {
         deepEqual(storeEvents, [
            ['update', '5']
         ]);
      }, {rec: rec});
   });

   asyncTest('pull updated (record)', function() {
      var recs = BigData.recs(2);
      syncActivity(recs, function(sync, list, model) {
         return model.store.fakeNotify('updated', '2', {aString: 'oh joy!'});
      }, function(storeEvents, listEvents) {
         deepEqual(listEvents, [
            ['2', ['aString']]
         ]);
      }, {rec: recs[1]});
   });

   asyncTest('auto-sync off: push does not go through automatically', function() {
      var recs = BigData.recs(2);
      syncActivity(recs, function(sync, list, model) {
         list.remove(recs[0]);
      }, function(storeEvents, listEvents) {
         strictEqual(storeEvents.length, 0);
      }, {model: {auto: false}});
   });

   asyncTest('auto-sync off (record): push does not go through automatically', function() {
      var recs = BigData.recs(2);
      syncActivity(recs, function(sync, list, model) {
         recs[1].set('aString', 'oh joy!');
      }, function(storeEvents, listEvents) {
         strictEqual(storeEvents.length, 0);
      }, {rec: recs[1], model: {auto: false}});
   });

   asyncTest('hasTwoWay off: pull does not get monitored', function() {
      var recs = BigData.recs(2);
      syncActivity(recs, function(sync, list, model) {
         model.store.fakeNotify('updated', '1', {aString: 'oh joy!'});
      }, function(storeEvents, listEvents) {
         strictEqual(listEvents.length, 0);
      }, {hasTwoWaySync: false});
   });

   asyncTest('hasTwoWay: record does not exist at sync time', function() {
      var recs = BigData.recs(1, {id: null}), oldKey = recs[0].hashKey();
      syncActivity([], function(sync, list, model) {
         //recs[0].set('aString', 'It looks, not good.')
      }, function(storeEvents, listEvents) {
         console.log(listEvents);
         deepEqual(storeEvents, [
            ['create', oldKey]
         ])
      }, {rec: recs[0]});
   });

   asyncTest('target: an observable gets set up correctly', function() {
      start(); //todo-test
   });

   asyncTest('target: an observableArray gets set up correctly', function() {
      start(); //todo-test
   });

   asyncTest('target: an object gets set up correctly', function() {
      start(); //todo-test
   });

   asyncTest('isDirty: cleared after updates on Record', function() {
      start(); //todo-test
   });

   asyncTest('isDirty: checkpoint called on RecordList', function() {
      start(); //todo-test
   });

   function syncActivity(recs, fx, analyzeFx, conf) {
      conf = _.extend({}, conf);
      return $.Deferred(function(def) {
         var storeEvents = [], listEvents = [], to = TestData.startTimeout(def);

         function monitorStore() {
            if( arguments[0] in {hasTwoWaySync: 1, watch: 1, watchRecord: 1} ) { return; } // suppress this event which we don't care about
//            console.log('store: ', $.makeArray(arguments));
            storeEvents.push($.makeArray(arguments));
         }

         function monitorList() {
//            console.log('list: ', $.makeArray(arguments));
            var args = $.makeArray(arguments);
            $.each(args, function(i,v) {
               if( v && v instanceof ko.sync.Record ) { args[i] = v.hashKey(); }
            });
            listEvents.push(args);
         }

         // set up the sync controller
         var model      = BigData.model($.extend({store: new TestData.TestStore(conf.twoWaySync, monitorStore, recs), auto: true}, conf.model)),
             list       = new RecordList(model, recs),
             target     = conf.target? conf.target : (conf.rec? ko.observable() : ko.observableArray()),
             sync       = new ko.sync.SyncController(model, target, conf.rec? conf.rec: list);

         if( conf.rec ) {
            conf.rec.subscribe(monitorList);
         }
         else {
            list.subscribe(monitorList);
         }

         // invoke the test
         var res = fx(sync, list, model);

         // callback to resolve and invoke the test analysis
         function _resolve() {
            clearTimeout(to);
            analyzeFx(storeEvents, listEvents, target);
            def.resolve(storeEvents, listEvents);
         }

         if( res && res.then ) {
            // the test returned a deferred so wait for it to finish up
            res.then(_resolve).fail(function() {
               clearTimeout(to);
               def.reject.apply(def, $.makeArray(arguments));
            });
         }
         else {
            // test did not return deferred, just wait long enough for notifications to resolve
            _.delay(_resolve, 100);
         }

         // make sure our async test restarts and rejects are handled
         def
            .fail(function(e) {
               ok(false, e||'syncActivity failed to resolve');
            })
            .always(start);
      });
   }

})(jQuery);

