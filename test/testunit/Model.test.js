
jQuery(function($) {
   "use strict";
   var undef;

   module("Model");
   test("#applyTo", function() {
      //todo
   });

   test("#newRecord", function() {
      //todo
   });

   //todo data sorting

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
