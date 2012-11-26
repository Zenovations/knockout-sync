
(function($) {

   module('KeyFactory');

   var KeyFactory = ko.sync.KeyFactory;
   var RecordId = ko.sync.RecordId;
   var TestData = ko.sync.TestData;
   var SEP = ko.sync.RecordId.DEFAULT_SEPARATOR;

   function makeData(data, tempId) {
      var out = $.extend({apples: 'apples', oranges: 'oranges'}, data);
      out[KeyFactory.HASHKEY_FIELD] = tempId||null;
      return out;
   }

   /**
    * @param [tempId]
    * @param [modelProps]
    * @return {*}
    */
   function newFactory(tempId, modelProps) {
      return new KeyFactory(TestData.model(modelProps), tempId);
   }

   test('#make, not composite', function() {
      var id = newFactory().make( makeData({id: 'test_not_composite'}) );
      strictEqual(id, 'test_not_composite');
   });

   test('#make, composite', function() {
      var id = newFactory(true, {key: ['a', 'b']}).make( makeData({a: 'aa', b: 'bb'}));
      strictEqual(id, 'aa'+SEP+'bb');
   });

   test('#make, with tmp field', function() {
      var id = newFactory(true, {key: ['a', 'b', 'c']}).make( makeData({a: 'aa', b: 'bb'}, 'tempy tempy temp') );
      strictEqual(id, 'tempy tempy temp', 'set to temporary id');
   });

   test('#make, with no tmp field', function() {
      var id = newFactory().make( makeData({}, 'no no no') );
      ok(RecordId.isTempId(id), 'is a temporary id, but not from temp field')
   });

   test('#make, with empty tmp field', function() {
      var id = newFactory(true).make( makeData({}, null) );
      ok(RecordId.isTempId(id), 'is a temporary id, but not from temp field')
   });

})(jQuery);

