
(function($) {
   var undefined;
   var TD = ko.sync.TestData;

   module("knockout bindings");

   asyncTest('observableArray.watchChanges, add', function() {
      var obs = ko.observableArray();
      var events = [];
      _watch(obs, events);

      _add(obs, TD.rec(1));
      _add(obs, TD.rec(2));
      _add(obs, TD.rec(3), 0);

      _.delay(function() {
         deepEqual(events, [
            ['add', 'record-1'],
            ['add', 'record-2', 'record-1'],
            ['add', 'record-3']
         ]);
         start();
      }, 100);
   });

   asyncTest('observableArray.watchChanges, update field', function() {
      var obs = ko.observableArray();
      var events = [];
      TD.pushRecsToObservableArray(obs, TD.recs(2));
      _watch(obs, events);

      obs()[1].stringOptional('happy happy! joy joy!');
      obs()[0].intOptional(909);

      _.delay(function() {
         deepEqual(events, [
            ['update', 'record-2'],
            ['update', 'record-1']
         ]);
         start();
      }, 100);
   });

   asyncTest('observableArray.watchChanges, move', function() {
      var obs = ko.observableArray();
      var events = [];
      TD.pushRecsToObservableArray(obs, TD.recs(5));
      _watch(obs, events);

      obs.splice(0, 0, obs.splice(2,1)[0]);
      obs.splice(2, 0, obs.pop());
      obs.splice(5, 0, obs.splice(0,1)[0]);

      _.delay(function() {
         deepEqual(events, [
            ['move', 'record-3'],
            ['move', 'record-5', 'record-1'],
            ['move', 'record-3', 'record-4']
         ]);
         start();
      }, 100);
   });

   asyncTest('observableArray.watchChanges, delete', function() {
      var obs = ko.observableArray();
      var events = [];
      TD.pushRecsToObservableArray(obs, TD.recs(5));
      _watch(obs, events);

      obs.splice(0, 1);
      obs.pop();
      obs.splice(2, 1);

      _.delay(function() {
         deepEqual(events, [
            ['delete', 'record-1'],
            ['delete', 'record-5'],
            ['delete', 'record-4']
         ]);
         start();
      }, 100);
   });

   asyncTest('observableArray.watchChanges, add then update', function() {
      var obs = ko.observableArray();
      var events = [];
      _watch(obs, events);

      var dat = _add(obs, TD.rec(1));
      dat.intOptional(-22);

      _.delay(function() {
         deepEqual(events, [
            ['add', 'record-1'],
            ['update', 'record-1']
         ]);
         start();
      }, 100);
   });

   asyncTest('observableArray.watchChanges, delete then update', function() {
      var obs = ko.observableArray();
      TD.pushRecsToObservableArray(obs, TD.recs(5));
      var events = [];
      _watch(obs, events);

      var rec = obs()[2];
      rec.stringOptional('this should cause an update');
      obs.splice(2, 1);
      rec.stringOptional('this should not cause an update');

      _.delay(function() {
         deepEqual(events, [
            ['update', 'record-3'],
            ['delete', 'record-3']
         ]);
         start();
      }, 100);
   });

   asyncTest('observable.watchChanges, update observable', function() {
      var rec = TD.rec(1), obs = rec.applyData(ko.observable());
      var events = [];
      obs.watchChanges(TD.model().observedFields(), function(newData) {
         events.push(newData);
      });

      rec.set('intRequired', -111);
      rec.applyData(obs);

      _.delay(function() {
         deepEqual(events, [
            {intRequired: -111}
         ]);
         start();
      }, 100);
   });

   asyncTest('observable.watchChanges, update field', function() {
      var obs = TD.rec(1).applyData(ko.observable());
      var events = [];
      obs.watchChanges(TD.model().observedFields(), function(newData) {
         events.push(newData);
      });

      obs().stringOptional('hai!');
      obs().stringOptional('hai!!');

      _.delay(function() {
         deepEqual(events, [
            {stringOptional: 'hai!'},
            {stringOptional: 'hai!!'}
         ]);
         start();
      }, 100);
   });

   function _watch(target, events) {
      target.watchChanges(TD.keyFactory(), {
         add: function(key, data, prevId) {
            events.push( ['add', key].concat(prevId? [prevId] : []) );
         },
         update: function(key) {
            events.push( ['update', key] );
         },
         move: function(key, data, prevId) {
            events.push( ['move', key].concat(prevId? [prevId] : []) );
         },
         delete: function(key) {
            events.push( ['delete', key] );
         }
      }, TD.model().observedFields());
   }

   function _add(obsArray, rec, pos) {
      var data = rec.applyData();
      if( pos !== undefined ) {
         obsArray.splice(pos, 0, data);
      }
      else {
         obsArray.push(data);
      }
      return data;
   }

})(jQuery);

