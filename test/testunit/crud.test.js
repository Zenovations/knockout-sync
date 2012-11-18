(function($) {
   "use strict";

   var undef, Crud = ko.sync.Crud, TestData = ko.sync.TestData;

   module('Crud');

   test('#isDirty', function() {
      expect(2);
      var model = _model();
      var view = TestData.genericData();
      model.sync(view);
      view.intOptional(5);
      strictEqual(view.crud.isDirty(), true, 'is dirty after update');
      view.crud.record.isDirty(false);
      strictEqual(view.crud.isDirty(), false, 'not dirty after record cleared');
   });

   test('#create', function() {
      //todo-test
   });

   test('#read', function() {
      //todo-test
   });

   test('#update', function() {
      //todo-test
   });

   test('#delete', function() {
      //todo-test
   });

   test('#promise', function() {
      //todo-test
   });

   test('remote update', function() {
      //todo-test
   });

   test('local update', function() {
      //todo-test
   });

   test('chained commands', function() {
      //todo-test
   });


   function _model() {
      return TestData.model({store: new TestData.TestStore(true, function() {}, {})});
   }

})(jQuery);

