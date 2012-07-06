/*******************************************
 * RecordId class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

   var RecordId = ko.sync.RecordId = Class.extend({
      /**
       * @param {Array|string} fields
       * @param {object} [data]
       * @param {string} [separator]
       * @constructor
       */
      init: function(fields, data, separator) {
         _.isArray(fields) || (fields = [fields]);
         this.separator = separator || RecordId.DEFAULT_SEPARATOR;
         this.multi = fields.length > 1;
         this.fields = fields;
         this.id = _buildRecordId(this.separator, fields, data);
      },
      isSet:              function() { return !_isTempId(this.id); },
      isComposite:        function() { return this.multi; },
      valueOf:            function() { return this.id; },
      toString:           function() { return this.valueOf(); },
      getCompositeFields: function() { return this.fields; },
      equals:             function(o) {
         // it is possible to match a RecordId even if it has no key, because you can check the Record's ID
         // against this one to see if they are actually the same instance this has some limitations but it
         // can work as long as one is careful to always use the ID off the record and never grow new ones
         if( !this.isSet() ) { return o === this; }
         // assuming they are not the same instance, it's easiest to check the valueOf() attribute
         return (o instanceof RecordId && o.valueOf() === this.valueOf())
               || (typeof(o) === 'string' && o === this.valueOf());
      }
   });
   RecordId.DEFAULT_SEPARATOR = '|';
   RecordId.for = function(model, record) {
      return new RecordId(model.primaryKey, record.getData());
   };

   function _isTempId(id) {
      return id && id.match(/^[0-9]+:[0-9]+[.]tmp[.][0-9]+$/);
   }

   function _createTempId() {
      return 'tmp.'+ko.sync.instanceId+'.'+(_.uniqueId());
   }

   function _buildRecordId(separator, fields, data) {
      if( typeof(data) === 'object' && !_.isEmpty(data) ) {
         var s = '', f, i = fields.length;
         while(i--) {
            f = fields[i];
            // if any of the composite key fields are missing, there is no key value
            if( !exists(data[f]) ) {
               return _createTempId();
            }
            // we're iterating in reverse (50% faster in IE) so prepend
            s = data[ f ] + (s.length? separator+s : s);
         }
         return s;
      }
      else {
         return _createTempId();
      }
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

})(ko);

