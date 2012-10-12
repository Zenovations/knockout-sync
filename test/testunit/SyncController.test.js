
jQuery(function($) {
   "use strict";
   var undef;

   var FIREBASE_URL = 'http://gamma.firebase.com/wordspot';
   var FIREBASE_TEST_URL = 'GitHub/firebase-sync';

   var TestData   = ko.sync.TestData,
       BigData    = TestData.bigData,
       RecordList = ko.sync.RecordList,
       TABLE      = BigData.props.table,
       FIREBASE   = new Firebase(FIREBASE_URL+'/'+FIREBASE_TEST_URL),
       BYPASS     = new Firebase(FIREBASE_URL+'/'+FIREBASE_TEST_URL+'/BigData');

   module('SyncController');

   test('#pushUpdates, record', function() {
   });

   asyncTest('#pushUpdates, list', function() {
      var results = [];
      function monitor(action, id) {
         results.push([action, id]);
      }
      var recs     = BigData.recs(FIREBASE, 25),
          model    = BigData.model({store: new ko.sync.TestData.TestStore(true, monitor, recs.slice(0, 20))}),
          list     = new ko.sync.RecordList(model, recs.slice(0, 20)),
          criteria = {limit: 25, start: 100},
          sync     = new ko.sync.SyncController(model, list, criteria);

      list.add(recs[21]);
      list.add(recs[22]);
      list.find('14').set('sort', 25);
      list.find('15').set('sort', 26);
      list.find('16').set('sort', 27);
      list.remove('16');
      list.remove('17');
      list.move(recs[18], '3');
      sync.pushUpdates(_.values(list.added),   'added');
      sync.pushUpdates(_.values(list.changed), 'updated');
      sync.pushUpdates(_.values(list.deleted), 'deleted');
      sync.pushUpdates(_.values(list.moved),   'moved');

      _.delay(function() {
         deepEqual(results, [
            ['hasTwoWaySync', undef],
            ['watch', {limit: 25, start: 100}],
            ['create', '22'],
            ['create', '23'],
            ['update', '14'],
            ['update', '15'],
//            ['update', '16'],
            ['delete', '16'],
            ['delete', '17']
         ], 'correct events invoked on Store object');
         start();
      }, 100);
   });

   test('pull added',   function() {});

   test('push added',   function() {});

   test('pull updated', function() {});

   test('push updated', function() {});

   test('pull deleted', function() {});

   test('push deleted', function() {});

   test('pull moved',   function() {});

   test('push moved',   function() {});

   test('auto-sync off', function() {});

   test('hasTwoWay off', function() {});

});

