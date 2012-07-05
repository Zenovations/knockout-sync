/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

   var Model = ko.sync.Model = Class.extend({
      /**
       * @param {object} props
       * @constructor
       */
      init: function(props) {
         var defaults       = ko.utils.extend(Model.FIELD_DEFAULTS, props.defaults);
         this.store         = props.dataStore;
         this.table         = props.dataTable;
         this.key           = props.primaryKey;
         this.sort          = props.sortField;
         this.validator     = props.validator;
         this.counter       = props.updateCounter;
         this.fields        = _processFields(defaults, props.fields);
         this.recordFactory = props.recordFactory || new RecordFactory(this);
      },

      applyTo: function(viewOrObject, initialData) { }, //todo

      /**
       * @param {object} [data]
       * @return {*}
       */
      newRecord: function(data) {
         return this.recordFactory.create(data);
      }
   });
   Model.FIELD_DEFAULTS = {
      type:      'string',
      required:  false,
      persist:   true,
      observe:   true,
      minLength: 0,
      maxLength: 0,
      valid:     null, //todo tie this to this.validator?
      updateCounter: 'update_counter',
      format:    function(v) { return v; }
   };

   function _processFields(defaults, fields) {
      var out = {}, o, k;
      Object.keys(fields).forEach(function(k) {
         o = ko.utils.extend({}, defaults);
         o = ko.utils.extend(o, fields[k]);
         _applyDefault(o);
         out[k] = o;
      });
      return out;
   }

   function _applyDefault(o) {
      if( !o.hasOwnProperty('default') || !exists(o.default) ) {
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
      return new Record(this.model, data);
   };

   var RecordId = ko.sync.RecordId = Class.extend({
      /**
       * @param {Array|string} fields
       * @param {object} [data]
       * @param {string} [separator]
       * @constructor
       */
      init: function(fields, data, separator) {
         var i;
         Array.isArray(fields) || (fields = [fields]);
         this.separator = separator || RecordId.DEFAULT_SEPARATOR;
         this.multi = fields.length > 1;
         this.fields = fields;
         this.id = _buildRecordId(this.separator, fields, data);
      },
      isSet:              function() { return this.id !== null; },
      isComposite:        function() { return this.multi; },
      valueOf:            function() { return this.id; },
      toString:           function() { return this.valueOf(); },
      getCompositeFields: function() { return this.fields; },
      equals:             function(o) {
         return o instanceof RecordId && o.valueOf() === this.valueOf();
      }
   });
   RecordId.DEFAULT_SEPARATOR = '|';
   RecordId.for = function(model, record) {
      return new RecordId(model.primaryKey, record.getData());
   };

   function _buildRecordId(separator, fields, data) {
      if( typeof(data) === 'object' && Object.keys(data).length ) {
         var s = '', f, i = fields.length;
         while(i--) {
            f = fields[i];
            // if any of the composite key fields are missing, there is no key value
            if( !exists(data[f]) ) {
               return null;
            }
            // we're iterating in reverse (50% faster in IE) so prepend
            s = data[ f ] + (s.length? separator+s : s);
         }
         return s;
      }
      return null;
   }

   var Record = ko.sync.Record = Class.extend({
      /**
       * @param {Model}  model
       * @param {object} [data]
       * @constructor
       */
      init:            function(model, data) {
         data || (data = {});
         this.data      = _setFields(model.fields, data);
         this.id        = new RecordId(model.key, data);
         this.sort      = model.sort;
         this.changed   = false;
         this.validator = model.validator;
      },

      getRecordId:     function() {
         return this.id;
      },
      getSortPriority: function() {
         return this.sort? this.get(this.sort) : false;
      },
      hasKey:          function() {
         return this.getKey().isSet();
      },
      getKey:          function() {
         return this.id;
      },
      getData:         function() {
         return ko.utils.extend({}, this.data);
      },
      get:             function(field) {
         return this.data[field];
      },
      set:             function(field, val) {
         if( this.data.hasOwnProperty(field) ) {
            this.changed = true;
            //todo validate this!
            this.data[field] = val;
            return true;
         }
         return false;
      },
      isDirty:         function() {
         return this.changed;
      },
      clearDirty:      function() {
         this.changed = false;
      },
      isValid:         function() {
         return !this.validator || this.validator.validate(this);
      }
   });

   function _setFields(fields, data) {
      var k, out = {}, keys = Object.keys(fields), i = keys.length;
      while(i--) {
         k = keys[i];
         if( data.hasOwnProperty(k) && exists(data[k]) ) {
            out[k] = data[k];
         }
         else {
            out[k] = fields[k].default;
         }
      }
      return out;
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

})(ko);