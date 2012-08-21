
jQuery(function($) {
   "use strict";
   var undef;

   module("Model");

   test("#newRecord", function() {
      //todo
   });

   test("#newList", function() {
      //todo
   });

   test("#toString", function() {
      //todo
   });

   test("#sync (object)", function() {
      //todo
   });

   test("#sync (array)", function() {
      //todo
   });

   test("#sync (observableArray)", function() {
      //todo
   });

   test("#sync (observable)", function() {
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
         ok(rec instanceof ko.sync.Record, 'is a Record object');
         console.log({rec: rec.getData()});
         console.log({data: data});
         deepEqual(rec.getData(), data, 'create record has all fields set');
   });

});
