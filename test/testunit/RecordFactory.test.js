
(function($) {
   "use strict";
   var undef;

   var TestData = ko.sync.TestData;

   module("RecordFactory");
   test("#create", function() {
      var model = TestData.model(), factory = model.factory,
         baseData = TestData.genericData(),
         rec = factory.create(baseData),
         data = TestData.forCompare(TestData.fullData(baseData));
      ok(rec instanceof ko.sync.Record, 'is a Record object');
      deepEqual(rec.getData(), data, 'create record has all fields set');
   });

});

