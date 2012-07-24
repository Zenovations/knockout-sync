
(function(ko) {
   "use strict";

   ko.sync.TestData = {};

   ko.sync.TestData.genericModelProps = {
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

   ko.sync.TestData.genericModelPropsWithSort = ko.utils.extend(
      {sortField: 'intRequired'}, ko.sync.TestData.genericModelProps);

   ko.sync.TestData.genericDataWithoutId = {
      stringRequired: 'required',
      dateRequired:   new Date(),
      intRequired:    -25,
      boolRequired:   true,
      floatRequired:  2.5,
      emailRequired:  'two@five.com'
   };

   ko.sync.TestData.genericData = ko.utils.extend(
      {id: 'record123'}, ko.sync.TestData.genericDataWithoutId);


   /**
    * Creates records using ko.sync.TestData.makeRecord()
    *
    * @param {ko.sync.Model} model
    * @param {object}        base   a data template
    * @param {int}           len    how many records to create?
    * @return {Array}
    */
   ko.sync.TestData.makeRecordList = function(model, base, len) {
      var recs = [];
      for(var i = 1; i <= len; i++) {
         recs.push(ko.sync.TestData.makeRecord(model, base, i));
      }
      return recs;
   };

   /**
    * @param {ko.sync.Model} model
    * @param {object}        base   a data template
    * @param {int}           i      used to build id, requiredInt, requiredFloat, and requiredString values
    * @return {ko.sync.Record}
    */
   ko.sync.TestData.makeRecord = function(model, base, i) {
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
   ko.sync.TestData.makeRecordId = function(value) {
      return new ko.sync.RecordId(['id'], {'id': value});
   };

   ko.sync.TestData.bigData = {
      COUNT: 200,
      props: {
         dataTable: 'BigData',
         primaryKey: 'id',
         //sortField:  'sortField',
         fields: {
            id:        { required: true,  persist: true, type: 'string'  },
            aString:   { required: false, persist: true, type: 'string'  },
            sortField: { required: false, persist: true, type: 'int'     },
            aBool:     { required: false, persist: true, type: 'boolean' }
         }
      },
      /**
       * @param firebaseRoot
       * @param {int} [numrecs]
       * @return {jQuery.Deferred}
       */
      reset: function(firebaseRoot, numrecs) {
         var i, def = $.Deferred(), count = 0, ref = firebaseRoot.child('BigData');
         ref.set(null, function() {
            var ref = firebaseRoot.child('BigData'), max = numrecs || ko.sync.TestData.bigData.COUNT;
            for(i=1; i <= max; i++) {
               ref.child(i).setWithPriority(
                  {id: i, aString: 'string-'+i, sortField: i, aBool: (i%2 === 0)},
                  i,
                  function() { if( ++count == max ) { def.resolve(ref); } }
               );
            }
         });
         return def.promise();
      }
   };

})(ko);

