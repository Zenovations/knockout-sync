/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var modelInst = 1; // just a counter to make models unique

   /**
    * @param {object} props
    * @constructor
    */
   ko.sync.Model = function(props) {
      var defaults    = ko.utils.extend(ko.sync.Model.FIELD_DEFAULTS, props.defaults);
      /** @var {ko.sync.Store} */
      this.store      = props.store;
      this.table      = props.table;
      this.key        = props.key;
      this.sort       = props.sort;
      this.validator  = props.validator;
      this.auto       = props.auto;
      this.inst       = modelInst++;
      this.fields     = processFields(defaults, props.fields);
      this.factory    = props.recordFactory || new RecordFactory(this);
   };

   /**
    * @param {ko.observableArray|object} target an observable array we'll store a list of records in or an object to sync to a single record
    * @param {object} [criteria] only used for observableArray to tell it which table records to monitor/sync
    * @return {ko.sync.Model} this
    */
   ko.sync.Model.prototype.sync = function(target, criteria) {
      if( ko.sync.isObservableArray(target) ) {
         target.crud = new ko.sync.CrudArray(target, this, criteria);
      }
      else {
         target.crud = new ko.sync.Crud(target, this);
      }
      return this;
   };

   /**
    * @param {object} [data]
    * @return {Record}
    */
   ko.sync.Model.prototype.newRecord = function(data) {
      return this.factory.create(data);
   };

   /**
    * @param {object} data
    * @return {*}
    */
   ko.sync.Model.prototype.newList = function( data ) {
      return new ko.sync.RecordList(this, data);
   };

   ko.sync.Model.prototype.toString = function() {
      return this.table+'['+this.inst+']';
   };

   ko.sync.Model.prototype.equal = function(o) {
      return o instanceof ko.sync.Model && this.inst == o.inst;
   };

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

   function processFields(defaults, fields) {
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

})(ko);