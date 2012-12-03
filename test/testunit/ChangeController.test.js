
(function(ko, $){

   module('ChangeController');

   var TD = ko.sync.TestData;

   asyncTest('#processRecord', function() {
      expect(1);
      var rec1 = TD.rec(1);
      var rec2 = TD.rec(2);
      var con = _controller();
      var def = $.Deferred(function(def) {
         var promises = [];
         promises.push(con.processRecord('store', 'create', rec1, {}));
         promises.push(con.processRecord('store', 'create', rec2, {}));
         promises.push(con.processRecord('store', 'update', rec1, {}));
         promises.push(con.processRecord('store', 'update', rec2, {}));
         promises.push(con.processRecord('store', 'move',   rec1, {}));
         promises.push(con.processRecord('store', 'move',   rec2, {}));
         promises.push(con.processRecord('store', 'delete', rec1, {}));
         promises.push(con.processRecord('store', 'delete', rec2, {}));
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
                  ['create', key1],
                  ['create', key2],
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

   asyncTest('#process, create', function() {
      var con      = _controller();
      var obs      = ko.observableArray();
      var expected = [];
      var events   = [];
      var recs     = TD.recs(6);
      var list     = con.model.newList(recs.slice(0,4));
      TD.pushRecsToObservableArray(obs, recs.slice(0,4));
      _watch(obs, events, con.model, con.model.observedFields());

      _do('create', expected, list, recs[4], 0);
      _do('create', expected, list, recs[5], recs[2].hashKey());

      con.process('obs', list, obs);

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 500);
   });

   asyncTest('#process, update', function() {
      var con      = _controller();
      var obs      = ko.observableArray([TD.rec(1).applyData()]);
      var expected = [];
      var events   = [];
      var list     = con.model.newList(TD.rec(1));
      _watch(obs, events, con.model, con.model.observedFields());

      _do('update', expected, list, TD.rec(1), {'stringOptional': 'hai bai'});

      con.process('obs', list, obs);

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 500);
   });

   asyncTest('#process, move', function() {
      var con      = _controller();
      var obs      = TD.pushRecsToObservableArray(ko.observableArray(), TD.recs(5));
      var expected = [];
      var events   = [];
      var list     = con.model.newList(TD.recs(5));

      _watch(obs, events, con.model, con.model.observedFields());
      _do('move', expected, list, TD.rec(1), 'record-2');
      con.process('obs', list, obs);

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 500);
   });

   asyncTest('#process, delete', function() {
      var con      = _controller();
      var obs      = TD.pushRecsToObservableArray(ko.observableArray(), TD.recs(5));
      var expected = [];
      var events   = [];
      var list     = con.model.newList(TD.recs(5));

      _watch(obs, events, con.model, con.model.observedFields());
      _do('delete', expected, list, TD.rec(2));
      con.process('obs', list, obs);

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 500);
   });

   asyncTest('#process, multiple updates', function() {
      var recs     = TD.recs(5);
      var con      = _controller();
      var obs      = ko.observableArray();
      var expected = [];
      var events   = [];
      var list     = con.model.newList(recs.slice(0,4));
      TD.pushRecsToObservableArray(obs, recs.slice(0,4));
      _watch(obs, events, con.model, con.model.observedFields());

//      _do('update', expected, list, recs[1], {intOptional: 5});
//      _do('delete', expected, list, recs[2]);
      _do('create', expected, list, recs[4], recs[3].hashKey());
//      _do('update', expected, list, recs[0], {stringOptional: 'hello'});
//      _do('move',   expected, list, recs[0], recs[3].hashKey());
//      _do('move',   expected, list, recs[1], recs[2].hashKey());
//      _do('delete', expected, list, recs[3]);

      con.process('obs', list, obs);

      _.delay(function() {
         // the delete events will not occur instantly; we need to wait for everything to process
         deepEqual(events, expected);
         start();
      }, 1000);
   });

   function _do(action, expected, list, rec, meta) {
      switch(action) {
         case 'create':
            list.add(rec, meta);
            expected.push(['create', rec.hashKey(), meta]);
            break;
         case 'update':
            _.each(meta, function(v,k) { rec.set(k, v); });
            list.updated(rec);
            expected.push(['update', rec.hashKey()]);
            break;
         case 'move':
            rec.isDirty(true);
            list.move(rec, meta);
            expected.push(['move', rec.hashKey(), meta]);
            break;
         case 'delete':
            list.remove(rec);
            expected.push(['delete', rec.hashKey()]);
            break;
         default:
            throw new Error('invalid action: '+action);
      }
   }

   function _watch(obsArray, events, model, fields) {
      obsArray.watchChanges(new ko.sync.KeyFactory(model, true), {
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
      }, fields);
   }

   function _controller() {
      return new ko.sync.ChangeController(TD.model());
   }

   function _storeEvents(con) {
      return con.model.store.eventsFiltered();
   }

})(ko, jQuery);



