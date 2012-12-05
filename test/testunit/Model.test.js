
(function($) {
   "use strict";
   var undef;
   var TestData = ko.sync.TestData;

   module("Model");

   test("#newRecord (with loaded data)", function() {
      expect(2);
      var model   = TestData.model(),
         baseData = TestData.genericData(),
         rec      = model.newRecord(baseData),
         data     = TestData.forCompare(TestData.fullData(baseData));
      ok(rec instanceof ko.sync.Record, 'is a Record object');
      deepEqual(TestData.forCompare(rec.getData()), TestData.forCompare(data), 'create record has all fields set');
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
            baseData    = TestData.recs(5, {astring: 'hello world'}),
            list        = model.newList(baseData),
            compareData = [], actualData = [];
      _.each(baseData, function(v) {
         var data = v.getData();
         actualData.push(TestData.forCompare(data));
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
      strictEqual(ko.sync.RecordList.ids(list).length, 0, 'list has no data');
   });

   test("#sync, observable (empty)", function() {
      expect(2);
      var obs = ko.observable();
      var model = TestData.model();
      var defaults = TestData.defaults(model);
      model.sync(obs);
      var crud = obs.crud;
      ok(crud instanceof ko.sync.Crud, 'is a Crud instance');
      deepEqual(TestData.forCompare(crud.record.getData()), TestData.forCompare(defaults), 'contains default data');
   });

   test("#sync, observable (with data)", function() {
      expect(2);
      var genericData = TestData.fullData();
      var obs = ko.observable(genericData);
      var model = TestData.model();
      model.sync(obs);
      var crud = obs.crud;
      ok(crud instanceof ko.sync.Crud, 'is a Crud instance');
      console.log();
      deepEqual(TestData.forCompare(crud.record.getData(true)), TestData.forCompare(ko.sync.unwrapAll(genericData)), 'contains default data');
   });

   test("#sync, observableArray (empty)", function() {
      expect(2);
      var obs = ko.observableArray();
      var model = TestData.model();
      model.sync(obs);
      var crud = obs.crud;
      ok(crud instanceof ko.sync.CrudArray, 'is CrudArray instance');
      strictEqual(ko.sync.RecordList.ids(crud.list).length, 0, 'contains no records');
   });

   test("#sync, observableArray (with data)", function() {
      expect(2);
      // create observable array and put some pre-populated data into it
      var obs = ko.observableArray();
      $.each(TestData.recs(5), function(i,v) {
         obs.push(v.getData());
      });
      var model = TestData.model();
      model.sync(obs);
      var crud = obs.crud, ids = ko.sync.RecordList.ids(crud.list);
      ok(crud instanceof ko.sync.CrudArray, 'is CrudArray instance');
      strictEqual(ids.length, 5, 'contains correct number of records');
   });

   test('#observedFields', function() {
      var model = TestData.model();
      var fields = model.observedFields();
      var exp = _.chain(model.fields).map(function(v,k) {return v.observe? k : null;}).compact().value();
      deepEqual(fields, exp);
   });

   //todo-test data sorting

})(jQuery);
