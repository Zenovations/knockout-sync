
jQuery(function($) {
   "use strict";
   var undef;

   module("Model");

   test("#newRecord (with loaded data)", function() {
      expect(2);
      var model   = TestData.model(),
         baseData = TestData.genericData(),
         rec      = model.newRecord(baseData),
         data     = TestData.forCompare(TestData.fullData(baseData));
      ok(rec instanceof ko.sync.Record, 'is a Record object');
      deepEqual(rec.getData(), data, 'create record has all fields set');
   });

   test('#newRecord (empty)', function() {
      // try an empty record
      var model    = TestData.model(),
          rec      = model.newRecord(),
          data     = TestData.defaults(model);
      ok(rec instanceof ko.sync.Record, 'is a Record object');
      deepEqual(rec.getData(), data, 'record has proper defaults');
   });

   test("#newList (with loaded data)", function() {
      expect(2);
      var model         = TestData.model(),
            baseData    = TestData.makeRecords(5, {aString: 'hello world'}),
            list        = model.newList(baseData),
            compareData = [], actualData = [];
      _.each(baseData, function(v) {
         var data = v.getData();
         actualData.push(data);
         compareData.push(TestData.forCompare(TestData.fullData(data)));
      });
      ok(list instanceof ko.sync.RecordList, 'is a RecordList object');
      deepEqual(actualData, compareData, 'create record has all fields set');
   });

   test("#newList (empty)", function() {
      expect(2);
      var model         = TestData.model(),
            list        = model.newList();
      ok(list instanceof ko.sync.RecordList, 'is a RecordList object');
      strictEqual(list.obs().length, 0, 'list has no data');
   });

   test("#sync, observable (empty)", function() {
      expect(2);
      var obs = ko.observable();
      var model = TestData.model({store: new TestData.TestStore(true, function() {}, {})});
      model.sync(obs);
      var crud = obs.crud;
      ok(crud instanceof ko.sync.Crud, 'is a Crud instance');
      deepEqual(crud.rec.data, {}, 'contains no data');
   });

   test("#sync, observable (with data)", function() {
      //todo
   });

   test("#sync, observableArray (empty)", function() {
      //todo
   });

   test("#sync, observableArray (with data)", function() {
      //todo
   });

   //todo-test data sorting

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
