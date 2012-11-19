/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var modelInst = 1; // just a counter to make models unique


   ko.sync.Model = Class.extend({
      /**
       * @param {object} props
       * @constructor
       */
      init: function(props) {
         var defaults    = ko.utils.extend(ko.sync.Model.FIELD_DEFAULTS, props.defaults);
         /** @var {ko.sync.Store} */
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
       * @param {ko.observableArray|object} target an observable array we'll store a list of records in or an object to sync to a single record
       * @param {object} [criteria] only used for observableArray to tell it which table records to monitor/sync
       * @return {ko.sync.Model} this
       */
      sync: function(target, criteria) {
         var isObservable = ko.isObservable(target);
         if( ko.sync.isObservableArray(target) ) {
            target.crud = new ko.sync.CrudArray(target, this, criteria);
         }
         else {
            var data;
            if( !isObservable ) { target.data = data = target.data||{}; }
            else { data = target; }
            target.crud = new ko.sync.Crud(data, this);
         }
         return this;
      },

      /**
       * @param {object} [data]
       * @return {Record}
       */
      newRecord: function(data) {
         return this.factory.create(data);
      },

      /**
       * @param {object} data
       * @return {*}
       */
      newList: function( data ) {
         return new ko.sync.RecordList(this, data);
      },

      toString: function() {
         return this.table+'['+this.inst+']';
      },

      equal: function(o) {
         return o instanceof ko.sync.Model && this.inst == o.inst;
      }

   });
   ko.sync.Model.FIELD_DEFAULTS = {
      //todo make update_counter work?
      //todo add read-only property?
      type:      'string',
      required:  false,
      observe:   true,
      minLength: 0,
      maxLength: 0,
      sort:      null, //todo unused?
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
      data = ko.utils.unwrapObservable(data);
      data instanceof ko.sync.Record && (data = data.getData());
      return new ko.sync.Record(this.model, data);
   };


//   function _makeList(model, dataOrList) {
//      if( dataOrList instanceof ko.sync.RecordList ) {
//         return dataOrList;
//      }
//      else {
//         return model.newList(dataOrList);
//      }
//   }
//
//   function _makeRecord(model, dataOrRecord) {
//      if( dataOrRecord instanceof ko.sync.Record ) {
//         return dataOrRecord;
//      }
//      else {
//         return model.newRecord(dataOrRecord);
//      }
//   }

})(ko);