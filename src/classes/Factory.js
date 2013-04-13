/*! Factory.js
 *************************************/
(function ($) {
   "use strict";
   ko.sync.Factory = Class.extend({
      init: function(store, opts) {
         this.store = store;
         this.opts = opts || {};
      },
      make: function(key, data) {
         var dat = _.pick(data, this.store.getFieldNames());
         if( this.opts.observedFields ) {
            ko.utils.arrayForEach(this.opts.observedFields, function(f) {
               dat[f] = _.isArray(dat[f]? ko.observableArray(f) : ko.observable(f));
            });
         }
         if( this.opts.isObservable ) {
            return ko.observable(dat);
         }
         else {
            return dat;
         }
      }
   });
})(jQuery);