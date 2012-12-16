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
    * @param {Object|string} [criteria] for a record this is a (string)id, for a list this is (object)criteria
    * @return {ko.sync.Model} this
    */
   ko.sync.Model.prototype.sync = function(target, criteria) {
      if( ko.sync.isObservableArray(target) ) {
         target.crud = new ko.sync.CrudArray(target, this, criteria);
      }
      else {
         target.crud = new ko.sync.Crud(target, this, criteria);
      }
      return target;
   };

   /**
    * This is not intended for use outside of the knockout-sync module.
    *
    * @param {Object|String} [data]
    * @return {ko.sync.Record}
    * @protected
    */
   ko.sync.Model.prototype.newRecord = function(data) {
      if( typeof(data) === 'string' ) {
         data = ko.sync.RecordId.parse(data, this.key);
      }
      return this.factory.create(data);
   };

   ko.sync.Model.prototype.toString = function() {
      return this.table+'['+this.inst+']';
   };

   ko.sync.Model.prototype.equal = function(o) {
      return o instanceof ko.sync.Model && this.inst == o.inst;
   };

   ko.sync.Model.prototype.observedFields = function() {
      return _.chain(this.fields).map(function(v, k) {
         return v.observe? k : null;
      }).compact().value();
   };

   ko.sync.Model.prototype.getComparator = function() {
      return comparator;
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

   /**
    * Creates an optimized comparator function based on the sort field's data type
    *
    * Children with no priority (a null priority) come first. They are ordered lexicographically by name.
    * Children with a priority that is parsable as a number come next. They are sorted numerically by priority first (small to large) and lexicographically by name second (A to z).
    * Children with non-numeric priorities come last. They are sorted lexicographically by priority first and lexicographically by name second.
    *
    * @param {ko.sync.Record} a
    * @param {ko.sync.Record} b
    * @return {int}
    */
   function comparator(a, b) {
      var aPri = a.getSortPriority();
      var bPri = b.getSortPriority();
      if( aPri !== bPri ) {
         // if a and b are the same,
         if( aPri === null ) { return -1; }
         else if( bPri === null ) { return 1; }
         var aNum = parseFloat(aPri);
         var bNum = parseFloat(bPri);
         if( isNaN(aNum) ) {
            if( !isNaN(bNum) ) {
               // b is a number, a is not
               return 1;
            }
            else {
               // both are non-numeric, make them strings
               aPri = aPri + '';
               bPri = bPri + '';
               return aPri > bPri? 1 : -1;
            }
         }
         else if( isNaN(bNum) ) {
            // a is a number, b is not
            return -1;
         }
         else {
            // they are both numbers
            return aNum === bNum? compareKeys(a, b) : (aNum > bNum? 1 : -1);
         }
      }
      else {
         return compareKeys(a, b);
      }
   }

   function compareKeys(a, b) {
      var aKey = a.hashKey();
      var bKey = b.hashKey();
      return aKey === bKey? 0 : (aKey > bKey? 1 : -1);
   }

})(ko);