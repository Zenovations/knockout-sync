
jQuery(function($) {
   "use strict";
   var undef;

   var newData = {
      id:             'record456',
      stringOptional: 'string456',
      stringRequired: 'string123',
      dateOptional:   moment().add('days', 7),
      dateRequired:   moment().subtract('years', 2),
      intOptional:    951,
      intRequired:    -159,
      boolOptional:   true,
      boolRequired:   false,
      floatOptional:  1.1,
      floatRequired:  -2.2,
      emailOptional:  'email@optional.com',
      emailRequired:  'email@required.com'
   };

   var TestData = ko.sync.TestData;

   module("Record");

   test("#getRecordId", function() {
      var model = TestData.model(),
         rec = new ko.sync.Record(model, TestData.genericData()),
         id  = new ko.sync.RecordId(model.key, TestData.genericData());
      ok(id.equals(rec.getRecordId()), 'id ('+id+')should equal what we put in record ('+rec.getRecordId()+')');
   });

   test("#getSortPriority", function() {
      var data  = $.extend({}, TestData.genericData(true), {intRequired: 50}),
         model = TestData.model(true),
         rec   = new ko.sync.Record(model, data);
      strictEqual(rec.getSortPriority(), 50, 'sortPriority set correctly');

      model = new ko.sync.Model(TestData.model());
      rec   = new ko.sync.Record(model, data);
      strictEqual(rec.getSortPriority(), false, 'sort priority not set');
   });

   test("#hasKey", function() {
      var rec;

      // without key
      strictEqual(_buildARecord(false).hasKey(), false, 'no key');

      // with key
      strictEqual(_buildARecord(true).hasKey(), true, 'has a key');

      // composite key missing
      rec = _buildARecord(null, false, {key: ['id', 'intRequired']});
      strictEqual(rec.hasKey(), false, 'no key on composite with null');

      // composite key set
      rec = _buildARecord({intRequired: 10}, true,
         {key: ['id', 'intRequired']});
      strictEqual(rec.hasKey(), true, 'key set on composite');
   });

   test("#getKey", function() {
      var rec;

      // without key
      rec = _buildARecord(false);
      ok(rec.hashKey().match(/^tmp[.][0-9]+/) && rec.hasKey() === false, 'no key');

      // with key
      strictEqual(_buildARecord().hashKey(), 'record123', 'has a key');

      // composite key with a null
      rec = _buildARecord(null, false, {key: ['id', 'intRequired']});
      ok(rec.hashKey().match(/^tmp[.][0-9]+/) && rec.hasKey() === false, 'no key on composite with null');

      // composite key set
      rec = _buildARecord({intRequired: 10}, true,
         {key: ['id', 'intRequired']});
      strictEqual(rec.hashKey(), 'record123|10', 'key set on composite');
   });

   test("#getData", function() {
      var model = TestData.model(),
         defaults = TestData.defaults(model),
         genericData = TestData.fullData(),
         emptyRec = new ko.sync.Record(model, {});

      // make sure defaults are used
      // dates should be null in this case
      deepEqual(emptyRec.getData(), defaults);

      // make sure setting data works
      deepEqual(_buildARecord().getData(), TestData.forCompare(genericData));
   });

   test("#get/#set", function() {
      var rec = _buildARecord(), origData = rec.getData();
      Object.keys(newData).forEach(function(k) {
         strictEqual(rec.get(k), origData[k], 'orig: get('+k+')');
         ok(rec.set(k, newData[k]), 'set worked');
         strictEqual(rec.get(k), newData[k], 'updated: get('+k+')');
      });

      // try to set a field that doesn't exist
      ok(!rec.set('notAField', 10), 'can\'t set a field that doesn\'t exist');
   });

   test("#isDirty/#clearDirty", function() {
      var rec = _buildARecord();

      // set some valid fields and make sure isDirty/clearDirty works
      strictEqual(rec.isDirty(), false, 'not dirty before I change it');
      ok(rec.set('id', 'record456'), 'set a field successfully');
      strictEqual(rec.isDirty(), true, 'dirty after I change it');
      rec.clearDirty();
      strictEqual(rec.isDirty(), false, 'not dirty after clearDirty');

      // try to set an invalid field and make sure dirty is not triggered
      ok(!rec.set('notAField', 'abc'), 'can\'t set field that doesn\'t exist');
      strictEqual(rec.isDirty(), false, 'not dirty after setting non-existing field');
   });

   test('#hashKey', function() {
      var rec = _buildARecord(true);
      strictEqual(rec.hashKey(), rec.getKey().hashKey(), 'with temporary id');

      rec = _buildARecord();
      strictEqual(rec.hashKey(), rec.getKey().hashKey(), 'with permanent id');
   });

   test('#subscribe', function() {
      //todo-test
   });

   test("#isValid", function() {
      //todo-test
   });

   /**
    * @param {object} [addData]
    * @param {boolean} [withId]
    * @param {object} [modelProps]
    * @return {ko.sync.Record}
    * @private
    */
   function _buildARecord(addData, withId, modelProps) {
      var args = _buildArgs(arguments), data = TestData.genericData(args.unkeyed, args.data);
      return new ko.sync.Record(TestData.model(args.model), data);
   }

   function _buildArgs(argList) {
      var args = $.makeArray(argList),
         i = -1,
         len = args.length,
         out = {unkeyed: false, data: null, model: null};
      while(args.length && ++i < 3) {
         switch(typeof(args[0])) {
            case 'object':
               if( out.data ) { out.model = args.shift(); }
               else { out.data = args.shift(); }
               break;
            case 'boolean':
               out.unkeyed = !args.shift();
               break;
            default:
               throw new Error('Invalid argument type '+typeof(args[0]));
         }
      }
      return out;
   }

});

