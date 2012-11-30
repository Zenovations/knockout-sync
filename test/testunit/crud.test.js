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

   asyncTest('#create', function() {
      expect(1);
      var model = _model({auto: false}, _callback);
      var view  = {data: TestData.rec(5).getData()};
      var events = [];

      function _callback() {
         if( arguments[0] in {hasTwoWaySync: 1, watch: 1, watchRecord: 1} ) { return; } // suppress this event which we don't care about
//            console.log('store: ', $.makeArray(arguments));
         events.push($.makeArray(arguments));
      }

      model.sync(view);
      var def = view.crud.create().promise();
      TestData.expires(def); // timeout

      def.then(function() {
            deepEqual(events, [
               ['create', view.data.id]
            ]);
         })
         .fail(function(e) { ok(false, e); })
         .always(start);
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

