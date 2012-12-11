
(function(ko, $){

   module('ChangeController');

   var TD = ko.sync.TestData;

   asyncTest('#process, create store', function() {
      expect(1);
      var rec10 = TD.rec(10);
      var rec11 = TD.rec(11);
      var con = _controller();
      var def = $.Deferred(function(def) {
         var promises = [];
         promises.push(processRecord(con, 'store', 'create', rec10));
         promises.push(processRecord(con, 'store', 'create', rec11, {prevId: 0}));
         $.when.apply($, promises)
            .done(def.resolve)
            .fail(def.reject);
      });
      TD.expires(def);
      def
         .done(function() {
            deepEqual(_storeEvents(con), [
               ['create', rec10.hashKey()],
               ['create', rec11.hashKey()]
            ]);
         })
         .fail(function(e) { ok(false, e); })
         .always(start);
   });

   asyncTest('#process, update store', function() {
      expect(1);
      var rec1 = TD.rec(1);
      var rec2 = TD.rec(2);
      var con = _controller();
      var def = $.Deferred(function(def) {
         var promises = [];
         promises.push(processRecord(con, 'store', 'update', rec1));
         promises.push(processRecord(con, 'store', 'update', rec2));
         $.when.apply($, promises)
            .done(def.resolve)
            .fail(def.reject);
      });
      TD.expires(def);
      def
         .done(function() {
            deepEqual(_storeEvents(con), [
               ['update', rec1.hashKey()],
               ['update', rec2.hashKey()]
            ]);
         })
         .fail(function(e) { ok(false, e); })
         .always(start);
   });

   asyncTest('#process, move store', function() {
      expect(1);
      var rec1 = TD.rec(1);
      var rec2 = TD.rec(2);
      var con = _controller();
      var def = $.Deferred(function(def) {
         var promises = [];
         promises.push(processRecord(con, 'store', 'move', rec1, {prevId: 'record-3'}));
         promises.push(processRecord(con, 'store', 'move', rec2));
         $.when.apply($, promises)
            .done(def.resolve)
            .fail(def.reject);
      });
      TD.expires(def);
      def
         .done(function() {
            deepEqual(_storeEvents(con), [
               ['update', rec1.hashKey()],
               ['update', rec2.hashKey()]
            ]);
         })
         .fail(function(e) { ok(false, e); })
         .always(start);
   });

   asyncTest('#process, delete store', function() {
      expect(1);
      var rec2 = TD.rec(2);
      var rec4 = TD.rec(4);
      var con = _controller();
      var def = $.Deferred(function(def) {
         var promises = [];
         promises.push(processRecord(con, 'store', 'delete', rec2));
         promises.push(processRecord(con, 'store', 'delete', rec4));
         $.when.apply($, promises)
            .done(def.resolve)
            .fail(def.reject);
      });
      TD.expires(def);
      def
         .done(function() {
            deepEqual(_storeEvents(con), [
               ['delete', rec2.hashKey()],
               ['delete', rec4.hashKey()]
            ]);
         })
         .fail(function(e) { ok(false, e); })
         .always(start);
   });

   asyncTest('#process, multiple changes to store', function() {
      expect(1);
      var rec1 = TD.rec(1);
      var rec2 = TD.rec(2);
      var rec10 = TD.rec(10);
      var rec11 = TD.rec(11);
      var con = _controller();
      var def = $.Deferred(function(def) {
         var promises = [];
         promises.push(processRecord(con, 'store', 'create', rec10));
         promises.push(processRecord(con, 'store', 'create', rec11));
         promises.push(processRecord(con, 'store', 'update', rec1));
         promises.push(processRecord(con, 'store', 'update', rec2));
         promises.push(processRecord(con, 'store', 'move',   rec1));
         promises.push(processRecord(con, 'store', 'move',   rec2));
         promises.push(processRecord(con, 'store', 'delete', rec1));
         promises.push(processRecord(con, 'store', 'delete', rec2));
         $.when.apply($, promises)
               .done(def.resolve)
               .fail(def.reject);
      });
      TD.expires(def);
      def
            .done(function() {
               var key1 = rec1.hashKey();
               var key2 = rec2.hashKey();
               deepEqual(_storeEvents(con), [
                  ['create', rec10.hashKey()],
                  ['create', rec11.hashKey()],
                  ['update', key1],
                  ['update', key2],
                  ['update', key1],
                  ['update', key2],
                  ['delete', key1],
                  ['delete', key2]
               ]);
            })
            .fail(function(e) { ok(false, e); })
            .always(start);
   });

   asyncTest('#process, create obs', function() {
      var con      = _controller();
      var obs      = ko.observableArray();
      var expected = [];
      var events   = [];
      var recs     = TD.recs(6);
      var list     = con._testModel.newList(recs.slice(0,4));
      TD.pushRecsToObservableArray(obs, recs.slice(0,4));
      _watch(obs, events, con._testModel, con._testModel.observedFields());

      _do('create', expected, list, recs[4], 0);
      _do('create', expected, list, recs[5], recs[2].hashKey());

      con.addList('obs', list, obs).process();

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 250);
   });

   asyncTest('#process, update obs', function() {
      var con      = _controller();
      var obs      = ko.observableArray([TD.rec(1).applyData()]);
      var expected = [];
      var events   = [];
      var list     = con._testModel.newList(TD.rec(1));
      _watch(obs, events, con._testModel, con._testModel.observedFields());

      _do('update', expected, list, TD.rec(1), {'stringOptional': 'hai bai'});

      con.addList('obs', list, obs).process();

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 250);
   });

   asyncTest('#process, move obs', function() {
      var con      = _controller();
      var obs      = TD.pushRecsToObservableArray(ko.observableArray(), TD.recs(5));
      var expected = [];
      var events   = [];
      var list     = con._testModel.newList(TD.recs(5));

      _watch(obs, events, con._testModel, con._testModel.observedFields());
      _do('move', expected, list, TD.rec(1), 'record-2');
      con.addList('obs', list, obs).process();

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 250);
   });

   asyncTest('#process, delete obs', function() {
      var con      = _controller();
      var obs      = TD.pushRecsToObservableArray(ko.observableArray(), TD.recs(5));
      var expected = [];
      var events   = [];
      var list     = con._testModel.newList(TD.recs(5));

      _watch(obs, events, con._testModel, con._testModel.observedFields());
      _do('delete', expected, list, TD.rec(2));
      con.addList('obs', list, obs).process();

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 250);
   });

   asyncTest('#process, multiple updates obs', function() {
      var recs     = TD.recs(12);
      var con      = _controller();
      var model    = con._testModel;
      var obs      = ko.observableArray();
      var expected = [];
      var events   = [];
      var list     = model.newList(recs.slice(0,10));
      TD.pushRecsToObservableArray(obs, recs.slice(0,10));
      _watch(obs, events, model, model.observedFields());

      _do('update', expected, list, recs[1], {intOptional: 5});
      _do('delete', expected, list, recs[2]);
      _do('create', expected, list, recs[11], recs[0].hashKey());
      _do('update', expected, list, recs[4], {stringOptional: 'hello'});
      _do('move',   expected, list, recs[5], recs[7].hashKey());
      _do('move',   expected, list, recs[6]);
      _do('delete', expected, list, recs[8]);

      con.addList('obs', list, obs).process();

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(_.sortBy(events, eventSorter), _.sortBy(expected, eventSorter));
         start();
      }, 250);
   });

   asyncTest('#process, isDirty cleared', function() {
      expect(5);
      var recs     = TD.recs(5);
      var con      = _controller();
      var model    = con._testModel;
      var obs      = ko.observableArray();
      var list     = model.newList(recs.slice(0,4));
      TD.pushRecsToObservableArray(obs, recs.slice(0,4));

      list.remove(recs[3]);
      list.add(recs[4]);
      recs[1].set('intOptional', -250);
      list.updated(recs[1]);
      con.addList('obs', list, obs).process();

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         var i = recs.length;
         while(i--) {
            strictEqual(recs[i].isDirty(), false, recs[i].hashKey());
         }
         start();
      }, 100);
   });

   test('#listen', function() {}); //todo-test

   function _do(action, expected, list, rec, meta) {
      switch(action) {
         case 'create':
            expected.push(['create', rec.hashKey(), meta]);
            list.add(rec, meta);
            break;
         case 'update':
            _.each(meta, function(v,k) { rec.set(k, v); });
            expected.push(['update', rec.hashKey()]);
            list.updated(rec);
            break;
         case 'move':
            rec.isDirty(true);
            expected.push(['move', rec.hashKey(), meta|| _.last(ko.sync.RecordList.ids(list))]);
            list.move(rec, meta);
            break;
         case 'delete':
            expected.push(['delete', rec.hashKey()]);
            list.remove(rec);
            break;
         default:
            throw new Error('invalid action: '+action);
      }
   }

   function _watch(obsArray, events, model, fields) {
      obsArray.watchChanges(new ko.sync.KeyFactory(model, true), fields, {
         add: function(key, data, prev) {
            events.push(['create', key, prev]);
         },
         update: function(key) {
            events.push(['update', key]);
         },
         move: function(key, data, prev) {
            events.push(['move', key, prev]);
         },
         delete: function(key) {
            events.push(['delete', key]);
         }
      });
   }

   function _controller(model) {
      model || (model = TD.model(null, true, TD.recs(5)));
      var con = new ko.sync.ChangeController();
      con._testModel = model;
      return con;
   }

   function _storeEvents(con) {
      return con._testModel.store.eventsFiltered();
   }

   function processRecord(cont, dest, action, rec, meta) {
      meta || (meta = {});
      rec.isDirty(true);
      var change = new ko.sync.Change({
         model:   cont._testModel,
         obs:     meta.target||{},
         to:      dest,
         action:  action,
         rec:     rec,
         prevId:  meta.prev,
         data:    meta.data,
         success: meta.callback
      });
      return cont.addChange(change).process();
   }

   function eventSorter(v) {
      return v[0]+v[1];
   }

})(ko, jQuery);
