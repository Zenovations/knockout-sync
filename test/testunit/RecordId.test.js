
(function($) {
   "use strict";
   var undef, S = ko.sync.RecordId.DEFAULT_SEPARATOR;

   module("RecordId");
   test("#isSet (not set)", function() {
      // vanilla
      var id = new ko.sync.RecordId('id');
      strictEqual(id.isSet(), false, 'isSet() === false for '+id);

      // missing values
      id = new ko.sync.RecordId(['id', 'intRequired'], ko.sync.TestData.genericData(true));
      strictEqual(id.isSet(), false, 'isSet() === false for '+id);
   });
   test("#isSet (set)", function() {
      // vanilla
      var id = new ko.sync.RecordId('id', {id: 'hello'});
      strictEqual(id.isSet(), true);

      // composite
      id = new ko.sync.RecordId(['id', 'intRequired'], ko.sync.TestData.genericData());
      strictEqual(id.isSet(), true);
   });

   test("#isComposite", function() {
      // vanilla
      var id = new ko.sync.RecordId(['id']);
      strictEqual(id.isComposite(), false);

      // composite
      id = new ko.sync.RecordId(['id', 'intRequired'], ko.sync.TestData.genericData());
      strictEqual(id.isComposite(), true);
   });

   test("#valueOf", function() {
      // vanilla
      var id = new ko.sync.RecordId(['id'], {id: 'hello'});
      strictEqual(id.hashKey(), 'hello');

      // composite
      id = new ko.sync.RecordId(['id', 'stringRequired'], ko.sync.TestData.genericData());
      strictEqual(id.hashKey(), 'record123'+S+'required');
   });

   test("#toString", function() {
      // vanilla
      var id = new ko.sync.RecordId(['id'], {id: 'hello'});
      strictEqual(id.toString(), 'hello');

      // composite
      id = new ko.sync.RecordId(['id', 'stringRequired'], ko.sync.TestData.genericData());
      strictEqual(id.toString(), 'record123'+S+'required');
   });

   test('#equals', function() {
      var id1 = new ko.sync.RecordId(['id'], {id: 'record123'});
      var id2 = new ko.sync.RecordId(['id'], ko.sync.TestData.genericData());
      var id3 = new ko.sync.RecordId(['id', 'stringRequired'], ko.sync.TestData.genericData());
      ok(id1.equals(id2),         'ids are equal');
      ok(!id1.equals(null),       "works with null");
      ok(!id1.equals(undef),      "works with undefined");
      ok(!id3.equals(id1),        "not equal to a different id");
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

})(jQuery);

