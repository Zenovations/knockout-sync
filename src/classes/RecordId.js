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
         this.hash = _createHash(this.separator, fields, data);
         this.tmpId = _isTempId(this.hash);
      },
      isSet:              function() { return !this.tmpId; },
      isComposite:        function() { return this.multi; },
      hashKey:            function() { return this.hash; },
      toString:           function() { return this.hashKey(); },
      getCompositeFields: function() { return this.fields; },
      equals:             function(o) {
         // it is possible to match a RecordId even if it has no key, because you can check the Record's ID
         // against this one to see if they are actually the same instance this has some limitations but it
         // can work as long as one is careful to always use the ID off the record and never grow new ones
         if( !this.isSet() ) { return o === this; }
         // assuming they are not the same instance, it's easiest to check the valueOf() attribute
         return (o instanceof RecordId && o.hashKey() === this.hashKey())
               || (typeof(o) === 'string' && o === this.hashKey());
      }
   });
   RecordId.DEFAULT_SEPARATOR = '|';
   RecordId.for = function(model, record) {
      return new RecordId(model.primaryKey, record.getData());
   };

   function _isTempId(hash) {
      return (hash && hash.match(/^tmp[.][0-9]+:[0-9]+[.]/))? true : false;
   }

   function _createTempHash() {
      return _.uniqueId('tmp.'+ko.sync.instanceId+'.');
   }

   function _createHash(separator, fields, data) {
      if( typeof(data) === 'object' && !_.isEmpty(data) ) {
         var s = '', f, i = fields.length;
         while(i--) {
            f = fields[i];
            // if any of the composite key fields are missing, there is no key value
            if( !exists(data[f]) ) {
               return _createTempHash();
            }
            // we're iterating in reverse (50% faster in IE) so prepend
            s = data[ f ] + (s.length? separator+s : s);
         }
         return s;
      }
      else {
         return _createTempHash();
      }
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

})(this.ko);

