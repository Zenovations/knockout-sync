
jQuery(function($) {
   "use strict";
   var undef;

   module("Model");
   test("#applyTo", function() {
      //todo
   });

   test("#newRecord", function() {
      //todo
   });

   //todo data sorting
   var TestData = ko.sync.TestData;

   module("RecordFactory");
   test("#create", function() {
      var model = TestData.model(), factory = model.factory,
         baseData = TestData.genericData(),
         rec = factory.create(baseData),
         data = TestData.forCompare(TestData.fullData(baseData));
         Object.keys(data).forEach(function(k) {
            strictEqual(rec.get(k), data[k], k);
         });
   });

});
