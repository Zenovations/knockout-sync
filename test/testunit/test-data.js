
(function(ko) {
   "use strict";

   var exports = ko.sync.TestData = {}, Model = ko.sync.Model;

   var genericModelProps = {
      dataTable: 'TableKeyed',
      primaryKey: 'id',
      fields: {
         id:             { required: true,  persist: true, type: 'string' },
         stringOptional: { required: false, persist: true, type: 'string' },
         stringRequired: { required: true,  persist: true, type: 'string' },
         dateOptional:   { required: false, persist: true, type: 'date' },
         dateRequired:   { required: true,  persist: true, type: 'date' },
         intOptional:    { required: false, persist: true, type: 'int' },
         intRequired:    { required: true,  persist: true, type: 'int' },
         boolOptional:   { required: false, persist: true, type: 'boolean' },
         boolRequired:   { required: true,  persist: true, type: 'boolean' },
         floatOptional:  { required: false, persist: true, type: 'float' },
         floatRequired:  { required: true,  persist: true, type: 'float' },
         emailOptional:  { required: false, persist: true, type: 'email' },
         emailRequired:  { required: true,  persist: true, type: 'email' }
      }
   };

   var genericModelPropsWithSort = ko.utils.extend(
      {sortField: 'intRequired'}, genericModelProps);

   var genericDataWithoutId = {
      stringRequired: 'required',
      dateRequired:   moment().utc().format(),
      intRequired:    -25,
      boolRequired:   true,
      floatRequired:  2.5,
      emailRequired:  'two@five.com'
   };

   var genericDataWithId = ko.utils.extend({id: 'record123'}, genericDataWithoutId);

   /**
    * @param {object}  [moreOpts]
    * @param {boolean} [withSort]
    * @return {ko.sync.Model}
    */
   exports.model = function(moreOpts, withSort) {
      if( arguments.length == 1 && _.isBoolean(moreOpts) ) {
         withSort = moreOpts;
         moreOpts = null;
      }
      var props = $.extend({}, (withSort? genericModelPropsWithSort : genericModelProps), moreOpts);
      return new Model(props);
   };

   /**
    * @param {boolean} [unkeyed]
    * @param {object}  [moreData]
    * @return {object}
    */
   exports.genericData = function(unkeyed, moreData) {
      if( arguments.length == 1 && _.isObject(unkeyed) ) {
         moreData = unkeyed;
         unkeyed = false;
      }
      return $.extend({}, unkeyed? genericDataWithoutId : genericDataWithId, moreData);
   };

   /**
    * @param {boolean} [unkeyed]
    * @return {object}
    */
   exports.fullData = function(unkeyed, moreData) {
      //todo-sort
      return $.extend(
         {},
         exports.defaults(exports.model()),
         exports.genericData.apply(null, $.makeArray(arguments))
      );
   };

   /**
    * Ensures dates are converted to compatible formats for comparison
    * @param {object} data
    * @return {object}
    */
   exports.forCompare = function(data) {
      var out = $.extend({}, data);
      if( 'dateOptional' in out && out.dateOptional ) {
         out.dateOptional = moment.utc(out.dateOptional).toDate();
      }
      if( 'dateRequired' in out && out.dateRequired ) {
         out.dateRequired = moment.utc(out.dateRequired).toDate();
      }
      return out;
   };

   exports.defaults = function(model) {
      //todo-sort
      var defaults = {};
      _.each(model.fields, function(field, key) {
         defaults[key] = field.default;
      });
      return defaults;
   };


   /**
    * Creates records using ko.sync.TestData.makeRecord()
    *
    * @param {int}           len    how many records to create?
    * @param {object}        [data] adjust the default data object
    * @return {Array}
    */
   exports.makeRecords = function(len, data) {
      var recs = [], base = $.extend({}, genericDataWithId, data);
      for(var i = 1; i <= len; i++) {
         recs.push(exports.makeRecord(exports.model(), base, i));
      }
      return recs;
   };

   /**
    * @param {ko.sync.Model} model
    * @param {object}        base   a data template
    * @param {int}           i      used to build id, requiredInt, requiredFloat, and requiredString values
    * @return {ko.sync.Record}
    */
   exports.makeRecord = function(model, base, i) {
      var data = $.extend({}, base);
      data.id = 'record-'+i;
      data.requiredInt = i;
      data.requiredFloat = i + (i * .01);
      data.requiredString = 'string-'+i;
      return model.newRecord(data);
   };

   /**
    * Create a non-composite ID keyed by the `id` field with value specified. If no value is specified, the
    * ID gets a temporary ID.
    * @param {string} [value]
    */
   exports.makeRecordId = function(value) {
      return new ko.sync.RecordId(['id'], {'id': value});
   };

   var bigDataTemplate = {
      id:             'record123',
      aString:        'a big string',
      sortField:      10,
      aBool:          false
   };

   exports.bigData = {
      COUNT: 200,
      props: {
         dataTable: 'BigData',
         primaryKey: 'id',
         sortField:  'sortField',
         fields: {
            id:        { required: true,  persist: true, type: 'string'  },
            aString:   { required: false, persist: true, type: 'string'  },
            sortField: { required: false, persist: true, type: 'int'     },
            aBool:     { required: false, persist: true, type: 'boolean' }
         }
      },

      /**
       * @param {int} id
       * @param {object} [moreData]
       * @param {ko.sync.Model} [model] must be a model of bigData!
       * @return {ko.sync.Record}
       */
      record: function(id, moreData, model) {
         model || (model = exports.bigData.model());
         var rec = model.newRecord(exports.bigData.data(id, moreData));
         if( moreData ) { rec.isDirty(true); }
         return rec;
      },

      /**
       * @param {int} id
       * @param {object} [moreData]
       * @return {object}
       */
      data: function(id, moreData) {
         return $.extend(
            {id: id, aString: 'string-'+id, sortField: id, aBool: (id%2 === 0)},
            moreData
         )
      },

      /**
       * @param firebaseRoot
       * @param {int} [numrecs]
       * @return {jQuery.Deferred}
       */
      reset: function(firebaseRoot, numrecs) {
         var i, def = $.Deferred(), count = 0, ref = firebaseRoot.child('BigData');
         ref.set(null, function() {
            var ref = firebaseRoot.child('BigData'), max = numrecs || exports.bigData.COUNT;
            for(i=1; i <= max; i++) {
               ref.child(i).setWithPriority(
                  {id: i, aString: 'string-'+i, sortField: i, aBool: (i%2 === 0)},
                  i,
                  function() { if( ++count == max ) { def.resolve(ref); } }
               );
            }
         });
         return def.promise();
      },

      /**
       * @param {object} [moreOpts]
       * @return {ko.sync.Model}
       */
      model: function(moreOpts) {
         var props = $.extend({}, exports.bigData.props, moreOpts);
         return new Model(props);
      }
   };

})(ko);

