
(function($) {
   "use strict";

   var TestData       = ko.sync.TestData,
       RecordList     = ko.sync.RecordList,
       SyncController = ko.sync.SyncController,
       Record         = ko.sync.Record;

   module('SyncController');

   asyncTest('#construct, load record from id', function() {
      start();
   });

   asyncTest('#construct, create record from object', function() {
      syncActivity({
         criteria: TestData.dat(2),
         target:   {},
         results: function(x) {
            console.log(x.sync.queue);
         }
      });
   });

   asyncTest('#construct, sync record from object', function() {
      start();
   });

   asyncTest('#construct, load list from criteria', function() {
      start();
   });

   asyncTest('#construct, load list from all available', function() {
      start();
   });

   test('#pushUpdates', function() {});

   test('#dispose', function() {});

   asyncTest('obs: updated', function() {
      start();
   });

   asyncTest('field: updated', function() {
      start();
   });

   asyncTest('obsArray: create', function() {
      start();
   });

   asyncTest('obsArray: delete', function() {
      start();
   });

   asyncTest('obsArray: move', function() {
      start();
   });

   asyncTest('store: create', function() {
      start();
   });

   asyncTest('store: update', function() {
      start();
   });

   asyncTest('store: move', function() {
      start();
   });

   asyncTest('store: delete', function() {
      start();
   });

   asyncTest('handles failures', function() {
      start();
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
      conf = _.extend({twoWaySync: true, recs: []}, conf);
      var listEvents  = [],
          model       = TestData.model($.extend({auto: true}, conf.model), conf.twoWaySync, conf.recs),
          target      = conf.target? conf.target : ko.observableArray(),
          sync        = new ko.sync.SyncController(model, target, conf.criteria);

      if( ko.isObservable(target) ) {
         target.watchChanges(_monitorList);
      }

      var props = {
         events: {
            store: model.store.eventsFiltered(),
            obs:   listEvents
         },
         target: target,
         model:  model,
         sync:   sync
      };

      // invoke the test
      var def = $.Deferred(function(def) {
         TestData.expires(def);
         $.when( (conf.fx || function() { return true })(props) ).then(def.resolve, def.reject);
      });

      // make sure our async test restarts and rejects are handled
      return def
         .then(_resolve)
         .fail(function(e) {
            var msg = typeof(e) === 'object' && e.stack? e.stack : e||'promise rejected without error message';
            ok(false, msg);
         })
         .always(start);

      // callback to resolve and invoke the test analysis
      function _resolve() {
         conf.results && conf.results(props);
      }

      function _monitorList() {
//            console.log('list: ', $.makeArray(arguments));
         var args = $.makeArray(arguments);
         _.each(args, function(v, i) {
            if( v instanceof ko.sync.Record ) { args[i] = v.hashKey(); }
         });
         listEvents.push(args);
      }

   }

   function dataFromRecs(recs) {
      return _.map(recs, function(rec) {
         return rec.getData(true);
      });
   }

})(jQuery);

