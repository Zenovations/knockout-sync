/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   var modelInst = 1;
   ko.sync.Model = Class.extend({
      /**
       * @param {object} props
       * @constructor
       */
      init: function(props) {
         var defaults    = ko.utils.extend(ko.sync.Model.FIELD_DEFAULTS, props.defaults);
         this.store      = props.store;
         this.table      = props.table;
         this.key        = props.key;
         this.sort       = props.sort;
         this.validator  = props.validator;
         this.auto       = props.auto;
         this.inst       = modelInst++;
         this.fields     = _processFields(defaults, props.fields);
         this.factory    = props.recordFactory || new RecordFactory(this);
      },

      /**
       *
       * @param {Object} view
       * @param {Object} [initialData]
       * @return {Object} the view for chaining
       */
      sync: function(view, initialData) {
         //todo
         //todo
         //todo
         //todo
         //todo
         return view;
      },

      /**
       *
       * @param {Object} [data]
       * @return {Object} a new view
       */
      newView: function(data) {

      },

      /**
       * @param {object} [data]
       * @return {Record}
       */
      newRecord: function(data) {
         return this.factory.create(data);
      },

      /**
       * @param {object} [data]
       * @return {*}
       */
      newList: function(data) {
         //todo
         //todo
         //todo
         //todo

      },

      toString: function() {
         return this.table+'['+this.inst+']';
      },

      mapping: function() {
         var out = { key: this.key, copy: [] }, fields = this.fields, f, k;
         for (var key in fields) {
            if (fields.hasOwnProperty(key)) {
               if( !fields[key].observe ) {
                  out.copy.push(key);
               }
               //todo apply validate or format here??
            }
         }
      },

      reverseMapping: function() {
         
      }

   });
   ko.sync.Model.FIELD_DEFAULTS = {
      type:      'string',
      required:  false,
      persist:   true,
      observe:   true,
      minLength: 0,
      maxLength: 0,
      sort: null, //todo unused?
      valid:     null, //todo tie this to this.validator?
      updateCounter: 'update_counter',
      auto:  false,
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

})(ko);