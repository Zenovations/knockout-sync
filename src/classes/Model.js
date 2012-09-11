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
       * @param {Object} viewOrList
       * @return {Object} the view for chaining
       */
      sync: function(viewOrList) {
         var isArray = ko.isObservable(viewOrList) && 'destroyAll' in viewOrList;
         viewOrList.crud = isArray? new ko.sync.CrudArray(new ko.sync.RecordList(this, viewOrList)) : new ko.sync.Crud(viewOrList, this);
         return viewOrList;
      },

      /**
       * @return {Object|String} data fields to load into the record or a record ID to load from the database
       */
      newView: function(data) {
         //todo
         //todo
         //todo
         //todo
      },

      /**
       * @param {object} [data]
       * @return {Record}
       */
      newRecord: function(data) {
         return this.factory.create(data);
      },

      /**
       * @param {object} readFilter
       * @return {*}
       */
      newList: function( readFilter ) {
         //todo
         //todo
         //todo
         //todo
      },

      toString: function() {
         return this.table+'['+this.inst+']';
      },

      mapping: function() {
         var keyFx = _.bind(function(rec) {
            return rec.hashKey? rec.hashKey() : rec[this.key];
         }, this);
         var out = { key: keyFx, copy: [] }, fields = this.fields;
         for (var key in fields) {
            if (fields.hasOwnProperty(key)) {
               if( !fields[key].observe ) {
                  out.copy.push(key);
               }
               //todo apply validate or format here??
            }
         }
         return out;
      },

      reverseMapping: function() {
         //todo
         //todo
         //todo
         //todo
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