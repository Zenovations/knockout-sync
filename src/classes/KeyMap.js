/*! Index.js
 *************************************/
(function () {
   "use strict";
   ko.sync.KeyMap = function(store, observableArray) {
      this._subs = [];
      this._idx = {};
      this._init(store, observableArray);
   };

   ko.utils.extend(ko.sync.KeyMap.prototype, {
      indexOf: function(key) {
         return key && this.hasKey(key)? this._idx[key] : -1;
      },

      hasKey: function(key) {
         return _.has(this._idx, key);
      },

      _changed: function(changes) {
         var idx = this._idx;
         _.each(changes, function(c, k) {
            switch(c.status) {
               case 'delete':
                  delete idx[k];
                  break;
               case 'create':
               case 'update':
               case 'move':
                  idx[k] = c.idx;
                  break;
               default:
                  throw new Error('Invalid change status: '+ c.status);
            }
         });
      },

      _init: function(store, obsArray) {
         _.each(ko.sync.unwrapAll(obsArray), function(rec, i) {
            this._idx[ store.getKey(rec) ] = i;
         });
         this._subs.push(obsArray.watchChanges(store, this._changed.bind(this)));
      },

      dispose: function() {
         _.each(this._subs, function(s) {s.dispose()});
         this._idx = null;
         this._subs = null;
      }
   });
})();