
(function($) {
   "use strict";
   var undefined;

   var TD             = ko.sync.TestData,
       RecordList     = ko.sync.RecordList,
       SyncController = ko.sync.SyncController,
       Record         = ko.sync.Record;

   module('SyncController');

   asyncTest('#construct, record from id', function() {
      syncActivity({
         criteria: TD.rec(2).hashKey(),
         model:    {auto: false},
         twoWaySync: false,
         target:   {},
         recs:     TD.recs(5),
         results: function(x) {
            deepEqual(ko.sync.unwrapAll(x.target), TD.rec(2).getData(true));
         }
      });
   });

   asyncTest('#construct, record from object', function() {
      syncActivity({
         criteria: TD.dat(2),
         model:    {auto: false},
         twoWaySync: false,
         target:   {},
         recs:     TD.recs(5),
         results: function(x) {
            deepEqual(ko.sync.unwrapAll(x.target), TD.rec(2).getData(true));
         }
      });
   });

   asyncTest('#construct, sync record from object', function() {
      syncActivity({
         criteria: TD.dat(2),
         model:    {auto: false},
         twoWaySync: true,
         target:   {},
         recs:     TD.recs(5),
         results: function(x) {
            deepEqual(ko.sync.unwrapAll(x.target), TD.rec(2).getData(true));
         }
      });
   });

   asyncTest('#construct, load list from criteria', function() {
      syncActivity({
         criteria: {limit: 2, offset: 1},
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         results: function(x) {
            deepEqual(ko.sync.unwrapAll(x.target), dataFromRecs(TD.recs(5).slice(1, 3)))
         }
      })
   });

   asyncTest('#construct, load entire table', function() {
      syncActivity({
         criteria: {},
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         results: function(x) {
            deepEqual(ko.sync.unwrapAll(x.target), dataFromRecs(TD.recs(5)))
         }
      })
   });

   asyncTest('#construct, local empty list', function() {
      syncActivity({
         criteria: null,
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         results: function(x) {
            deepEqual(ko.sync.unwrapAll(x.target), []);
         }
      })
   });

   asyncTest('#queue', function() {
      var tmp = TD.tempRec();
      syncActivity({
         criteria: {limit: 50},
         model: {auto: false},
         twoWaySync: false,
         fx: function(x) {
            x.sync.queue({action: 'delete', key: tmp.hashKey(), to: 'store', rec: tmp});
            x.sync.queue({action: 'create', key: TD.rec(1).hashKey(), data: TD.dat(1), prevId: null, to: 'store'});
         },
         results: function(x) {
            deepEqual(_unwrapChanges(x.sync.con.changes), [
               _expectedChange({action: 'delete', key: tmp.hashKey(), invalidated: true}),
               _expectedChange({action: 'create', key: TD.rec(1).hashKey(), data: TD.dat(1), prevId: null})
            ]);
         }
      });
   });

   asyncTest('#pushUpdates, empty', function() {
      var updates;
      syncActivity({
         criteria: {limit: 50},
         model: {auto: false},
         twoWaySync: false,
         fx: function(x) {
            return x.sync.pushUpdates().done(function(promises) {
               updates = promises;
            });
         },
         results: function(x) {
            deepEqual(updates, [], 'pushed successfully and there were no changes');
         }
      });
   });

   asyncTest('#pushUpdates, failure', function() {
      expect(1);
      var model   = TD.model({auto: false}),
          target  = {},
          sync    = new ko.sync.SyncController(model, target);

      sync.queue({action: 'delete', key: TD.rec(1).hashKey(), to: 'store', rec: TD.rec(1)});
      model.store.failNextCall();
      sync.pushUpdates()
         .done(function() {
            ok(false, 'should have been rejected');
         })
         .fail(function() {
            ok(true, 'deferred object rejected');
         })
         .always(function() {
            start();
         });
   });

   asyncTest('#pushUpdates, success', function() {
      expect(2);
      var model   = TD.model({auto: false}),
         target  = {},
         sync    = new ko.sync.SyncController(model, target);
      sync.queue({action: 'delete', key: TD.rec(1).hashKey(), to: 'store'});
      sync.pushUpdates()
         .done(function(promises) {
            strictEqual(promises.length, 1, 'returns correct number of promises');
            strictEqual(promises[0].state(), 'resolved', 'promise is resolved');
         })
         .fail(function() {
            ok(false, 'should resolve');
         })
         .always(function() {
            start();
         });
   });

   test('#dispose', function() {
      expect(2);
      syncActivity({
         criteria: null,
         model: {auto: false},
         twoWaySync: false,
         fx: function(x) {
            x.sync.dispose();
            x.sync.queue({action: 'create', rec: TD.rec(1), data: TD.dat(1), prevId: null, to: 'store'});
            return $.Deferred(function(def) {
               x.sync.pushUpdates()
                  .then(function () {
                     ok(false, 'should reject if disposed');
                  }, function () {
                     ok(true, 'should reject if disposed');
                  })
                  .always(def.resolve);
            });
         },
         results: function(x) {
            deepEqual(x.events.store, []);
         }
      })
   });

   asyncTest('obs: create', function() {
      expect(2);
      var model = TD.model(), tempRec = TD.tempRec(6, model), key;
      syncActivity({
         criteria: null,
         model: model,
         twoWaySync: true,
         target: ko.observable(),
         recs:  TD.recs(5, model),
         fx: function(x) {
            key = x.sync.rec.hashKey();
            x.target(tempRec.getData(true));
            deepEqual(x.changes, [
               _expectedChange({key: key, action: 'create'})
            ]);
            return x.sync.pushUpdates();
         },
         results: function(x) {
            deepEqual(x.events.store, [
               ['create', key]
            ]);
         }
      })
   });

   asyncTest('obs: update', function() {
      var obs = TD.rec(4).applyData(ko.observable());
      var data = TD.rec(4).applyData();
      syncActivity({
         criteria: 'record-4',
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         target: obs,
         fx: function(x) {
            data.floatRequired = 9.9;
            x.target(data);
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({key: 'record-4', action: 'update'})
            ]);
         }
      })
   });

   asyncTest('field: updated', function() {
      syncActivity({
         criteria: 'record-4',
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         target: {},
         fx: function(x) {
            x.target.emailOptional('doom@doomy.doom');
            x.target.stringRequired('hilo!');
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({key: 'record-4', action: 'update'}),
               _expectedChange({key: 'record-4', action: 'update'})
            ]);
         }
      })
   });

   asyncTest('obsArray: add', function() {
      syncActivity({
         criteria: null,
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         fx: function(x) {
            x.target.push(TD.rec(6).getData());
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({key: TD.rec(6).hashKey(), action: 'add', prevId: 0})
            ]);
         }
      })
   });

   asyncTest('obsArray: delete', function() {
      var key;
      syncActivity({
         criteria: {limit: 50},
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         fx: function(x) {
            key = x.target.splice(2, 1)[0].id;
            // delete events are tricky, so give it a bit before we check
            return $.Deferred(function(def) {
               _.delay(def.resolve, 25);
            });
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({key: key, action: 'delete'})
            ]);
         }
      })
   });

   asyncTest('obsArray: move', function() {
      var key, prevKey;
      syncActivity({
         criteria: {limit: 50},
         model: {auto: false},
         twoWaySync: false,
         recs:  TD.recs(5),
         fx: function(x) {
            key = x.target()[4]._hashKey;
            prevKey = x.target()[1]._hashKey;
            console.log('starting move'); //debug
            _.move(x.target, 4, 2);
            // delete events are tricky, so give it a bit before we check
            return $.Deferred(function(def) {
               _.delay(def.resolve, 25);
            });
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({key: key, action: 'move', prevId: prevKey})
            ]);
         }
      })
   });

   asyncTest('store: create', function() {
      var newRec = TD.rec(6), prevKey = TD.rec(5).hashKey();
      syncActivity({
         criteria: {limit: 2},
         model: {auto: false},
         recs: TD.recs(5),
         fx: function(x) {
            return x.store.create(x.model, newRec);
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({to: 'obs', key: newRec.hashKey(), prevId: prevKey, action: 'create'})
            ])
         }
      })
   });

   asyncTest('store: update', function() {
      var updatedRec = TD.rec(4);
      syncActivity({
         criteria: {limit: 2},
         model: {auto: false},
         recs: TD.recs(5),
         fx: function(x) {
            updatedRec.set('intOptional', 991);
            return x.store.update(x.model, updatedRec);
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({to: 'obs', key: updatedRec.hashKey(), action: 'update'})
            ])
         }
      })
   });

   asyncTest('store: move', function() {
      var movedRec = TD.rec(4), afterKey = TD.rec(1).hashKey();
      syncActivity({
         criteria: {limit: 2},
         model: {auto: false},
         recs: TD.recs(5),
         fx: function(x) {
            movedRec.update('intRequired', 1);
            return x.store.update(x.model, movedRec);
         },
         results: function(x) {
            deepEqual(x.changes, [
               _expectedChange({to: 'obs', key: movedRec.hashKey(), prevId: afterKey, action: 'move'})
            ])
         }
      })
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
    *    {Object}  model - properties passed directly to TD.model
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
          changes     = [],
          model       = conf.model instanceof ko.sync.Model? conf.model : TD.model($.extend({auto: true}, conf.model), conf.twoWaySync, conf.recs),
          target      = conf.target? conf.target : ko.observableArray(),
          sync        = new ko.sync.SyncController(model, target, conf.criteria);

      wrapChangeList(sync, changes);

      if( ko.sync.isObservableArray(target) ) {
         target.watchChanges(new ko.sync.KeyFactory(model, true), model.observedFields(), {
            add: _monitor, update: _monitor, delete: _monitor, move: _monitor
         });
      }
      else if( ko.isObservable(target) ) {
         target.watchChanges(model.observedFields(), _monitor);
      }

      var props = {
         events: {
            store: [],
            obs:   listEvents
         },
         target:  target,
         model:   model,
         store:   model.store,
         sync:    sync,
         changes: changes
      };

      // invoke the test
      var def = $.Deferred(function(def) {
         // wait for sync controller to reach ready state
         sync.ready().then(function() {

            // expire test case if it doesn't return
            TD.expires(def);

            // get a copy of the current store events
            _.extend(props.events, {store: model.store.eventsFiltered()});

            // invoke the test case
            $.when( (conf.fx || function(){})(props) ).then(def.resolve, def.reject);

         }, def.reject);
      });

      // make sure our async test restarts and rejects are handled
      return def
         .then(_resolve) // invoke results method
         .fail(function(e) {
            var msg = typeof(e) === 'object' && e.stack? e.stack : e||'promise rejected without error message';
            ok(false, msg);
         })
         .always(start);

      // callback to resolve and invoke the test analysis
      function _resolve() {
         // get a copy of the current store events
         _.extend(props.events, {store: model.store.eventsFiltered()});

         // invoke the results function
         conf.results && conf.results(props);
      }

      function _monitor() {
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

   function wrapChangeList(sync, changes) {
      var con = sync.con;
      var _addChange = con.addChange;
      con.addChange = function(change) {
         changes.push(_changeProps(change));
         _addChange.apply(con, _.toArray(arguments));
      };
   }

   var CHANGE_KEYS_FOR_COMPARE = ['to', 'action', 'prevId', 'invalidated', 'moved', 'status'];

   function _changeProps(change) {
      return _.extend({key: change.key()}, _.pick(change, CHANGE_KEYS_FOR_COMPARE));
   }

   function _expectedChange(props) {
      return _.pick(_.extend({
         to: 'store',
         action: 'update',
         prevId: undefined,
         invalidated: false,
         moved: false,
         status: 'pending'
      }, props? ko.sync.unwrapAll(props) : {}), CHANGE_KEYS_FOR_COMPARE.concat(['key']));
   }

   function _unwrapChanges(changes) {
      var out = [];
      _.each(changes, function(change) {
         out.push(_changeProps(change));
      });
      return out;
   }

})(jQuery);

