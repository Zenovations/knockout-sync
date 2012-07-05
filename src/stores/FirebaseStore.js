/*******************************************
 * FirebaseStore for knockout-sync
 *******************************************/
(function(ko, Firebase) {
   var undef;

   /** IDE CLUES
    **********************/
   /** @var {jQuery.Deferred}  */ var Promise;
   /** @var {ko.sync.Model}    */ var Model;
   /** @var {ko.sync.Record}   */ var Record;
   /** @var {ko.sync.RecordId} */ var RecordId;

   /**
    * Creates a new FirebaseStore for use as the dataStore component in models.
    *
    * @param {string} url    the Firebase database
    * @param {string} [base] the child under the Firebase URL which is the root level of our data
    * @constructor
    */
   function FirebaseStore(url, base) {
      //todo extend Store
      this.base = _base(new Firebase(url), base);
   }

   /**
    * Writes a new record to the database. It does not check to make sure the record doesn't exist, so if it
    * is keyed and has an ID already in the database, that record will be overwritten.
    *
    * The Firebase store accepts both keyed and unkeyed records. For keyed records, models should normally set
    * the `model.priorityField` property, as records would otherwise be ordered lexicographically. The model
    * properties used by this method are as follows:
    *   - model.table:   the table name is appended to the Firebase root folder to obtain the correct data
    *                    bucket for this model.
    *   - model.fields:  used to parse and prepare fields for insertion
    *   - model.sort:    provides a field in the record to use for setting priority (sorting) the data
    *
    * @param {Model}  model   the schema for a data model
    * @param {Record} record  the data to be inserted
    * @return {Promise} a jQuery.Deferred().promise() object
    */
   FirebaseStore.prototype.create = function(model, record) {
      return ko.sync.handle(this, function(cb, eb) { // creates a promise
         var table = this.base.child(model.table),
             // fetch the record using .child()
             ref = _buildRecord(table, record.getKey());
         ref.set(cleanData(model.fields, record.getData()), function(success) {
            (success && cb(ref.name())) || eb(ref.name());
         });
      });
   };

   /**
    * Read a record from the database. If the record doesn't exist, a null will be returned.
    *
    * The model is used for the following fields:
    *   - model.table:  the table name is appended to the Firebase root folder to obtain the correct data
    *                   bucket for this model.
    *
    * @param {Model}           model
    * @param {RecordId|Record} recOrId
    * @return {Promise}
    */
   FirebaseStore.prototype.read         = function(model, recOrId) {
      return ko.sync.handle(this, function(cb) {
         var table = this.base.child(model.table),
             key   = _keyFor(recOrId),
             ref   = _buildRecord(table, key);
         ref.once('value', function(snapshot) {
            cb(model.newRecord(snapshot.val()));
         });
      });
   };

   FirebaseStore.prototype.update       = function(model, rec) {}; //todo
   FirebaseStore.prototype.delete       = function(model, recOrId) {}; //todo
   FirebaseStore.prototype.query        = function(model, params) {}; //todo

   FirebaseStore.prototype.sync         = function(callback) {}; //todo
   FirebaseStore.prototype.onDisconnect = function(callback) {}; //todo
   FirebaseStore.prototype.onConnect    = function(callback) {}; //todo

   /** UTILITIES
    *****************************************************************************************/

   /**
    * Create or load a record to receive data. If `key` is provided, then the record is created
    * with the unique id of `key`, otherwise an ID is generated automagically (and chronologically)
    * by Firebase.
    *
    * @param table
    * @param {RecordId}  [key]
    * @return {Firebase}
    * @private
    */
   function _buildRecord(table, key) {
      return key.isSet()? table.child(key.valueOf()) : table.push();
   }

   function exists(data, key) {
      var val = data && key && data.hasOwnProperty(key)? data[key] : undef;
      return  val !== null && val !== undef;
   }

   function cleanData(fields, data) {
      var k, cleaned = {};
      for(k in fields) {
         if( fields.hasOwnProperty(k) ) {
            cleaned[k] = cleanValue(fields[k].type, data, k);
         }
      }
      return cleaned;
   }

   function getDefaultValue(type) {
      switch(type) {
         case 'boolean':
            return false;
         case 'int':
            return 0;
         case 'float':
            return 0;
         case 'string':
         case 'email':
         case 'date':
            return null;
         default:
            throw new Error('Invaild field type '+type);
      }
   }

   function cleanValue(type, data, k) {
      if( !exists(data, k) ) {
         return getDefaultValue(type);
      }
      else {
         var v = data[k];
         switch(type) {
            case 'boolean':
               return v? true : false;
            case 'int':
               v = parseInt(v);
               return isNaN(v)? getDefaultValue(type) : v;
            case 'float':
               v = parseFloat(v);
               return isNaN(v)? getDefaultValue(type) : v;
            case 'date':
               return _formatDate(v);
            case 'string':
            case 'email':
               return v + '';
            default:
               throw new Error('Invaild field type '+type);
         }
      }
   }

   function _formatDate(v) {
      if( typeof(v) === 'object' ) {
         if( v.toISOString ) {
            return v.toISOString();
         }
         else if( typeof(moment) === 'object' && moment.isMoment && moment.isMoment(v) ) {
            return moment.defaultFormat()
         }
      }
      return getDefaultValue('date');
   }

   function _keyFor(recOrId) {
      if( typeof(recOrId) === 'object' && recOrId.getKey ) {
         return recOrId.getKey();
      }
      else {
         return recOrId;
      }
   }

   if (!Date.prototype.toISOString) {
      Date.prototype.toISOString = function() {
         function pad(n) { return n < 10 ? '0' + n : n }
         return this.getUTCFullYear() + '-'
               + pad(this.getUTCMonth() + 1) + '-'
               + pad(this.getUTCDate()) + 'T'
               + pad(this.getUTCHours()) + ':'
               + pad(this.getUTCMinutes()) + ':'
               + pad(this.getUTCSeconds()) + 'Z';
      };
   }

   /**
    * @param root
    * @param base
    * @return {Firebase}
    * @private
    */
   function _base(root, base) {
      if( base ) {
         var curr = root;
         base.split('/').forEach(function(p) {
            curr = curr.child(p);
         });
         return curr;
      }
      else {
         return root;
      }
   }

//
//   function isTempId(data, key) {
//      var v = data && key && data.hasOwnProperty(key)? data[key] : null;
//      return typeof(v) === 'number' && v < 0;
//   }
//
//   function isPermanentId(data, key) {
//      var v = data && key && data.hasOwnProperty(key)? data[key] : null;
//      return v && typeof(v) === 'string';
//   }

   /** ADD TO NAMESPACE
    ******************************************************************************/

   ko.sync || (ko.sync = {stores: []});
   ko.sync.stores.FirebaseStore = FirebaseStore;

})(ko, Firebase);