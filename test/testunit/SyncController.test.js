
(function($) {
   "use strict";

   var TestData       = ko.sync.TestData,
       RecordList     = ko.sync.RecordList,
       SyncController = ko.sync.SyncController,
       Record         = ko.sync.Record;

   module('SyncController');

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
      var listEvents  = [],
          model       = TestData.model($.extend({auto: true}, conf.model), conf.twoWaySync, conf.recs),
          list        = new RecordList(model, conf.recs),
          target      = conf.target? conf.target : (conf.rec? ko.observable() : ko.observableArray()),
          sync        = new ko.sync.SyncController(model, target, conf.rec? conf.rec: list);

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
            var msg = typeof(e) === 'object' && e.stack? e.stack : e||'promise rejected without error message';
            ok(false, msg);
         })
         .always(start);

      // callback to resolve and invoke the test analysis
      function _resolve() {
         conf.results && conf.results(model.store.eventsFiltered(), listEvents, target, list);
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
         return rec.getData(true);
      });
   }

   /**
    * @param {ko.observableArray} obsArray
    * @param {Array} observedFields
    * @return {Array}
    */
   function unwrapList(obsArray, observedFields) {
      return _.map(obsArray() , function(v) {
         var copy = _.extend({}, v);
         _.each(observedFields, function(f) {
            copy[f] = ko.utils.unwrapObservable(copy[f]);
         });
         return copy;
      });
   }

})(jQuery);

