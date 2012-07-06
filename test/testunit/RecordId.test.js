
jQuery(function($) {
   "use strict";
   var undef;

   module("RecordId");
   test("#isSet (not set)", function() {
      // vanilla
      var id = new ko.sync.RecordId('id');
      strictEqual(id.isSet(), false);

      // missing values
      id = new ko.sync.RecordId(['id', 'intRequired'], ko.sync.TestData.genericData);
      strictEqual(id.isSet(), false);
   });
   test("#isSet (set)", function() {
      // vanilla
      var id = new ko.sync.RecordId('id', {id: 'hello'});
      strictEqual(id.isSet(), true);

      // composite
      id = new ko.sync.RecordId(['id', 'intRequired'], ko.sync.TestData.genericDataWithId);
      strictEqual(id.isSet(), true);
   });

   test("#isComposite", function() {
      // vanilla
      var id = new ko.sync.RecordId(['id']);
      strictEqual(id.isComposite(), false);

      // composite
      id = new ko.sync.RecordId(['id', 'intRequired'], ko.sync.TestData.genericDataWithId);
      strictEqual(id.isComposite(), true);
   });

   test("#valueOf", function() {
      // vanilla
      var id = new ko.sync.RecordId(['id'], {id: 'hello'});
      strictEqual(id.valueOf(), 'hello');

      // composite
      id = new ko.sync.RecordId(['id', 'stringRequired'], ko.sync.TestData.genericDataWithId);
      strictEqual(id.valueOf(), 'record123|required');
   });

   test("#toString", function() {
      // vanilla
      var id = new ko.sync.RecordId(['id'], {id: 'hello'});
      strictEqual(id.toString(), 'hello');

      // composite
      id = new ko.sync.RecordId(['id', 'stringRequired'], ko.sync.TestData.genericDataWithId);
      strictEqual(id.toString(), 'record123|required');
   });

   test('#equals', function() {
      var id1 = new ko.sync.RecordId(['id'], {id: 'record123'});
      var id2 = new ko.sync.RecordId(['id'], ko.sync.TestData.genericDataWithId);
      var id3 = new ko.sync.RecordId(['id', 'stringRequired'], ko.sync.TestData.genericDataWithId);
      ok(id1.equals(id2), 'ids are equal');
      ok(!id1.equals(null), "works with null");
      ok(!id1.equals(undef), "works with undefined");
      ok(!id3.equals(id1), "not equal to a different id");
      ok(!id1.equals('not id 1'), 'not equal to random string');
      ok(id1.equals('record123'), 'is equal to string "record123"');
   });

   test("#getCompositeFields", function() {
      // vanilla
      var id = new ko.sync.RecordId('id');
      deepEqual(id.getCompositeFields(), ['id']);

      // composite
      id = new ko.sync.RecordId(['id', 'intOptional']);
      deepEqual(id.getCompositeFields(), ['id', 'intOptional']);
   });

});

