
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

   module("Record");

   test("#getRecordId", function() {
      var model = new ko.sync.Model(ko.sync.TestData.genericModelProps),
         rec = new ko.sync.Record(model, ko.sync.TestData.genericData),
         id  = new ko.sync.RecordId(model.key, ko.sync.TestData.genericData);
      ok(id.equals(rec.getRecordId()), 'id ('+id+')should equal what we put in record ('+rec.getRecordId()+')');
   });

   test("#getSortPriority", function() {
      var data  = $.extend({}, ko.sync.TestData.genericDataWithoutId, {intRequired: 50}),
         model = new ko.sync.Model(ko.sync.TestData.genericModelPropsWithSort),
         rec   = new ko.sync.Record(model, data);
      strictEqual(rec.getSortPriority(), 50, 'sortPriority set correctly');

      model = new ko.sync.Model(ko.sync.TestData.genericModelProps);
      rec   = new ko.sync.Record(model, data);
      strictEqual(rec.getSortPriority(), false, 'sort priority not set');
   });

   test("#hasKey", function() {
      var rec;

      // without key
      strictEqual(_buildARecord().hasKey(), false, 'no key');

      // with key
      strictEqual(_buildARecord(true).hasKey(), true, 'has a key');

      // composite key missing
      rec = _buildARecord(null, false, {primaryKey: ['id', 'intRequired']});
      strictEqual(rec.hasKey(), false, 'no key on composite with null');

      // composite key set
      rec = _buildARecord({intRequired: 10}, true,
         {primaryKey: ['id', 'intRequired']});
      strictEqual(rec.hasKey(), true, 'key set on composite');
   });

   test("#getKey", function() {
      var rec;

      // without key
      rec = _buildARecord();
      ok(rec.hashKey().match(/^tmp[.][0-9]+/) && rec.hasKey() === false, 'no key');

      // with key
      strictEqual(_buildARecord(true).hashKey(), 'record123', 'has a key');

      // composite key with a null
      rec = _buildARecord(null, false, {primaryKey: ['id', 'intRequired']});
      ok(rec.hashKey().match(/^tmp[.][0-9]+/) && rec.hasKey() === false, 'no key on composite with null');

      // composite key set
      rec = _buildARecord({intRequired: 10}, true,
         {primaryKey: ['id', 'intRequired']});
      strictEqual(rec.hashKey(), 'record123|10', 'key set on composite');
   });

   test("#getData", function() {
      var model = _buildAModel(),
         defaults = _fullData(model, {}),
         genericData = _fullData(model, ko.sync.TestData.genericDataWithoutId),
         emptyRec = new ko.sync.Record(model, {});

      // make sure defaults are used
      deepEqual(emptyRec.getData(), defaults);

      // make sure setting data works
      deepEqual(_buildARecord().getData(), genericData);
   });

   test("#get/#set", function() {
      var model = _buildAModel();

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
      var args = _buildArgs(arguments), data;
      if( args.withId ) { data = $.extend({}, ko.sync.TestData.genericData, args.data); }
      else { data = $.extend({}, ko.sync.TestData.genericDataWithoutId, args.data); }
      return new ko.sync.Record(_buildAModel(args.model), data);
   }

   function _buildAModel(modelProps) {
      var props = $.extend({}, ko.sync.TestData.genericModelProps, modelProps);
      return new ko.sync.Model(props);
   }

   function _buildArgs(argList) {
      var args = $.makeArray(argList),
         i = -1,
         len = args.length,
         out = {withId: false, data: null, model: null};
      while(args.length && ++i < 3) {
         switch(typeof(args[0])) {
            case 'object':
               if( out.data ) { out.model = args.shift(); }
               else { out.data = args.shift(); }
               break;
            case 'boolean':
               out.withId = args.shift();
               break;
            default:
               throw new Error('Invalid argument type '+typeof(args[0]));
         }
      }
      return out;
   }

   function _fullData(model, addData) {
      var defaults = {};
      // build test data sets
      Object.keys(model.fields).forEach(function(k) {
         defaults[k] = model.fields[k].default;
      });
      return $.extend({}, defaults, addData);
   }

});

