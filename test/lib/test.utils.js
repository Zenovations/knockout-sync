/*! test.utils.js.js
 *************************************/
(function () {
   "use strict";
   ko.sync.test = {
      MAX_WAIT: 5000,
      MAX_INTERVAL: 500,

      update: function(observable, values) {
         observable(_.extend({}, observable(), values));
      },

      def: function(cb, timeout) {
         var def = _.Deferred(cb);
         var to = setTimeout(def.reject.bind(def, 'timed out'), timeout||ko.sync.test.MAX_WAIT);
         def.always(function() { clearTimeout(to) });
         return def;
      },

      afterDone: function(def) {
         return _.debounce(_.once(def.resolve), ko.sync.test.MAX_INTERVAL);
      },

      done: function() {
         _.each(ko.sync.test.subs, function(s) {
            if(s.dispose)     { s.dispose(); }
            else if(s.unbind) { s.unbind(); }
            else if(s.off)    { s.off(); }
         });
         ko.sync.test.subs = [];
         start();
      },

      disposable: function(o) {
         this.subs.push(o)
      },

      subs: []
   };

})();