/*! Factory.js
 *************************************/
(function ($) {
   "use strict";
   ko.sync.Factory = Class.extend({
      init: function(store) {
         this.store = store;
      },
      make: function(key, data) {
         return _.pick(data, this.store.getFieldNames());
      }
   });
})(jQuery);