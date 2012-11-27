(function($) {
   "use strict";

   var undef, Crud = ko.sync.Crud, TestData = ko.sync.TestData;

   module('Crud');

   test('#isDirty', function() {
      expect(2);
      var model = _model({auto: false});
      var view = {data: TestData.genericData()};
      model.sync(view);
      view.data.intOptional(5);
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

   /**
    * @param {Function} [fx]
    * @param {Object} [moreOpts]
    * @return {ko.sync.Model}
    * @private
    */
   function _model(moreOpts, fx) {
      if(_.isFunction(moreOpts) ) {
         fx = moreOpts;
         moreOpts = {};
      }
      fx || (fx = function() {});
      return TestData.model(_.extend({store: new TestData.TestStore(true, TestData.model(), fx, {})}, moreOpts||{}));
   }

})(jQuery);

