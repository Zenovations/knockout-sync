
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

   module("Model");
   test("#applyTo", function() {
      //todo
   });

   test("#newRecord", function() {
      //todo
   });

   //todo data sorting

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
   });

   test("#getCompositeFields", function() {
      // vanilla
      var id = new ko.sync.RecordId('id');
      deepEqual(id.getCompositeFields(), ['id']);

      // composite
      id = new ko.sync.RecordId(['id', 'intOptional']);
      deepEqual(id.getCompositeFields(), ['id', 'intOptional']);
   });

   module("Record");

   test("#getRecordId", function() {
      var model = new ko.sync.Model(ko.sync.TestData.genericModelProps),
          rec = new ko.sync.Record(model, ko.sync.TestData.genericData),
          id  = new ko.sync.RecordId(model.fields, ko.sync.TestData.genericData);
      ok(id.equals(rec.getRecordId()));
   });

   test("#getSortPriority", function() {
      var data  = $.extend({}, ko.sync.TestData.genericData, {intRequired: 50}),
          model = new ko.sync.Model(ko.sync.TestData.genericModelWithSort),
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
      strictEqual(_buildARecord().getKey().valueOf(), null, 'no key');

      // with key
      strictEqual(_buildARecord(true).getKey().valueOf(), 'record123', 'has a key');

      // composite key with a null
      rec = _buildARecord(null, false, {primaryKey: ['id', 'intRequired']});
      strictEqual(rec.getKey().valueOf(), null, 'no key on composite with null');

      // composite key set
      rec = _buildARecord({intRequired: 10}, true,
         {primaryKey: ['id', 'intRequired']});
      strictEqual(rec.getKey().valueOf(), 'record123|10', 'key set on composite');
   });

   test("#getData", function() {
      var model = _buildAModel(),
          defaults = _fullData(model, {}),
          genericData = _fullData(model, ko.sync.TestData.genericData),
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

   test("#isValid", function() {
      //todo-test
   });

   module("RecordFactory");
   test("#create", function() {
      var model = _buildAModel(), factory = model.recordFactory,
         baseData = ko.sync.TestData.genericData,
         rec = factory.create(baseData),
         data = _fullData(model, baseData);
      Object.keys(data).forEach(function(k) {
         strictEqual(rec.get(k), data[k]);
      });
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
      if( args.withId ) { data = $.extend({}, ko.sync.TestData.genericDataWithId, args.data); }
      else { data = $.extend({}, ko.sync.TestData.genericData, args.data); }
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
