/*! Factory.js
 *************************************/
(function () {
   "use strict";
   ko.sync.Factory = Class.extend({
      init: function(store, opts) {
         this.store = store;
         this.opts = opts || {};
      },
      make: function(key, data) {
         var dat = _.pick(data, this.store.getFieldNames());
         if( this.opts.observeFields ) {
            ko.utils.arrayForEach(this.opts.observeFields, function(f) {
               dat[f] = _.isArray(dat[f])? ko.observableArray(dat[f]) : ko.observable(dat[f]);
            });
         }
         if( this.opts.observe ) {
            return ko.observable(dat);
         }
         else {
            return dat;
         }
      }
   });
})();