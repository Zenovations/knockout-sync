
(function(ko) {

   ko.sync || (ko.sync = {});

   function Model(props) {
      var defaults = ko.utils.extend({
         type: 'string',
         required: false,
         persist: true,
         observe: true,
         minLength: 0,
         maxLength: 0,
         valid:     null, //todo tie this to this.validator?
         format:    function(v) { return v; }
      }, props.defaults);

      this.store     = props.dataStore;
      this.table     = props.dataTable;
      this.key       = props.primaryKey;
      this.validator = props.validator;
      this.fields    = _processFields(defaults, props.fields);
      this.recordFactory = new RecordFactory(this);
   }

   Model.prototype.new = function(data) {}; //todo

   function _processFields(defaults, fields) {
      var out = [], o;
      for (var k in fields) {
         if (fields.hasOwnProperty(k)) {
            o = ko.utils.extend(defaults, fields[k]);
            _applyDefault(o);
            out.push(o);
         }
      }
      return out;
   }

   function _applyDefault(o) {
      if( !o.hasOwnProperty('default') || !o.default ) {
         switch(o.type) {
            case 'boolean':
               o.default = false;
               break;
            case 'int':
            case 'float':
            case 'date':
               o.default = 0;
               break;
            case 'time':
               o.default = '00:00';
               break;
            case 'string':
            case 'email':
            default:
               o.default = null;
         }
      }
   }

   function RecordFactory(model) {} //todo
   RecordFactory.create = function(data) {};

   function Record() {} //todo

})(ko);