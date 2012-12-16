/*******************************************
 * RecordId class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

//   ko.sync || (ko.sync = {});

   /**
    * @param {Array|string} fields
    * @param {object} [data]
    * @param {string} [separator]
    * @constructor
    */
   ko.sync.RecordId = function(fields, data, separator) {
      _.isArray(fields) || (fields = fields? [fields] : []);
      this.separator = separator || RecordId.DEFAULT_SEPARATOR;
      this.multi     = fields.length > 1;
      this.fields    = fields;
      this.hash      = _createHash(this.separator, fields, data);
      this.tmpId     = RecordId.isTempId(this.hash);
   };
   var RecordId = ko.sync.RecordId;

   RecordId.prototype.isSet              = function() { return !this.tmpId; };
   RecordId.prototype.isComposite        = function() { return this.multi; };
   RecordId.prototype.hashKey            = function() { return this.hash; };
   RecordId.prototype.toString           = function() { return this.hashKey(); };
   RecordId.prototype.getCompositeFields = function() { return this.fields; };

   /**
    * @param {String|Object} hashOrData
    */
   RecordId.prototype.update = function(hashOrData) {
      var h = typeof(hashOrData)==='string'? hashOrData : _createHash(this.separator, this.fields, hashOrData);
      if( !RecordId.isTempId(h) ) {
         this.hash = h;
         this.tmpId = false;
      }
      else {
         console.log('tried to replace hashKey with a bad ID; ignored', hashOrData);
      }
      return this;
   };

   RecordId.prototype.equals = function(o) {
      // it is possible to match a RecordId even if it has no key, because you can check the Record's ID
      // against this one to see if they are actually the same instance this has some limitations but it
      // can work as long as one is careful to always use the ID off the record and never grow new ones
      if( !this.isSet() ) { return o === this; }
      // assuming they are not the same instance, it's easiest to check the valueOf() attribute
      return (o instanceof RecordId && o.hashKey() === this.hashKey())
         || (typeof(o) === 'string' && o === this.hashKey());
   };

   /**
    * @return {object} the field/value pairs used to create this key.
    * @static
    */
   RecordId.prototype.parse = function() {
      return RecordId.parse(this.hash, this.fields, this.separator);
   };

   RecordId.DEFAULT_SEPARATOR = '|||';

   /**
    * @param {Model} model
    * @param {ko.sync.Record|Object|String} record a Record, data for a record, or a hash key
    * @return {ko.sync.RecordId}
    */
   RecordId.for = function(model, record) {
      var data;
      if( typeof(record) === 'string' ) {
         data = RecordId.parse(record, model.key);
      }
      else {
         data = record instanceof ko.sync.Record? record.getData() : ko.sync.unwrapAll(record);
      }
      return new RecordId(model.key, data);
   };

   /**
    * @param {String} hashKey
    * @param {Array|String} fields
    * @param [separator]
    * @return {Object}
    */
   RecordId.parse = function(hashKey, fields, separator) {
      _.isArray(fields) || (fields = [fields]);
      var out = {}, vals;
      if( !RecordId.isTempId(hashKey) ) {
         if( fields.length > 1 ) {
            separator || (separator = RecordId.DEFAULT_SEPARATOR);
            vals = hashKey.split(separator);
            _.each(fields, function(k, i) {
               out[k] = vals[i];
            });
         }
         else {
            out[fields[0]] = hashKey;
         }
      }
      return out;
   };
   RecordId.isTempId = function(hashKey) {
      // the parts of a temporary id are "tmp" followed by the ko.sync.instanceId (a timestamp, a colon,
      // and a random number), and a uuid all joined by "."
      return (hashKey && hashKey.match(/^tmp[.][0-9]+:[0-9]+[.]/))? true : false;
   };

   /**
    * @param {Object} [data]
    * @return {String}
    */
   RecordId.createTempHashKey = function(data) {
      var kf = ko.sync.KeyFactory.HASHKEY_FIELD;
      if( _.isObject(data) && RecordId.isTempId(data[kf]) ) {
         return data[kf];
      }
      else {
         return _.uniqueId('tmp.'+ko.sync.instanceId+'.');
      }
   };

   function _createHash(separator, fields, data) {
      if( _.isObject(data) && !_.isEmpty(data) ) {
         var s = '', f, i = -1, len = fields.length;
         while(++i < len) {
            f = fields[i];
            // if any of the composite key fields are missing, there is no key value
            if( !exists(data[f]) ) {
               return RecordId.createTempHashKey(data);
            }
            if( i > 0 ) { s += separator; }
            s += data[f];
         }
         return s;
      }
      else {
         return RecordId.createTempHashKey(data);
      }
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

})(ko);

