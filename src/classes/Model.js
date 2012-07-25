/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   var Model = Class.extend({
      /**
       * @param {object} props
       * @constructor
       */
      init: function(props) {
         var defaults    = ko.utils.extend(Model.FIELD_DEFAULTS, props.defaults);
         this.store      = props.dataStore;
         this.table      = props.dataTable;
         this.key        = props.primaryKey;
         this.sort       = props.sortField;
         this.validator  = props.validator;
         this.auto       = props.autoSync;
         this.fields     = _processFields(defaults, props.fields);
         this.factory    = props.recordFactory || new RecordFactory(this);
      },

      applyTo: function(viewOrObject, initialData) { }, //todo

      /**
       * @param {object} [data]
       * @return {*}
       */
      newRecord: function(data) {
         return this.factory.create(data);
      }
   });
   Model.FIELD_DEFAULTS = {
      type:      'string',
      required:  false,
      persist:   true,
      observe:   true,
      minLength: 0,
      maxLength: 0,
      sortField: null,
      valid:     null, //todo tie this to this.validator?
      updateCounter: 'update_counter',
      autoSync:  false,
      format:    function(v) { return v; } //todo
   };

   function _processFields(defaults, fields) {
      var out = {}, o, k;
      _.keys(fields).forEach(function(k) {
         o = ko.utils.extend({}, defaults);
         o = ko.utils.extend(o, fields[k]);
         _applyDefault(o);
         out[k] = o;
      });
      return out;
   }

   function _applyDefault(o) {
      if( !o.hasOwnProperty('default') || !_.has(o, 'default') ) {
         switch(o.type) {
            case 'boolean':
               o.default = false;
               break;
            case 'int':
            case 'float':
               o.default = 0;
               break;
            case 'date':
            case 'string':
            case 'email':
            default:
               o.default = null;
         }
      }
   }

   function RecordFactory(model) {
      this.model = model;
   }
   RecordFactory.prototype.create = function(data) {
      return new ko.sync.Record(this.model, data);
   };


   ko.sync || (ko.sync = {});

   /**
    * @param {object} props
    * @constructor
    */
   ko.sync.Model = Model;

})(this.ko);