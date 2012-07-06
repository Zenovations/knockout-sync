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
   var FirebaseStore = ko.sync.Store.extend({
      init: function(url, base) {
         this.base = _base(new Firebase(url), base);
      }
   });

   /**
    * Writes a new record to the database. If the record exists, then it will be overwritten (does not check that
    * id is not in database).
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
    * @return {Promise} resolves to the record's {string} id
    */
   FirebaseStore.prototype.create = function(model, record) {
      //todo sort priorities
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
    * @return {Promise} resolves to the Record object
    */
   FirebaseStore.prototype.read         = function(model, recOrId) {
      return ko.sync.handle(this, function(cb) {
         var table = this.base.child(model.table),
            key   = _keyFor(recOrId),
            ref;
         if( !key.isSet() ) {
            return null;
         }
         else {
            ref = _buildRecord(table, key);
            ref.once('value', function(snapshot) {
               var val = snapshot.val();
               cb(val === null? val : model.newRecord(val));
            });
         }
      });
   };

   /**
    * Update an existing record in the database. If the record does not already exist, the promise is rejected.
    * @param {Model}  model
    * @param {Record} rec
    * @return {Promise} resolves to callback({string}id, {boolean}updated), where updated is true if an update occurred or false if data was not dirty
    */
   FirebaseStore.prototype.update       = function(model, rec) {
      //todo sort priorities
      var table = this.base.child(model.table);
      return ko.sync.handle(this, function(cb, eb) {
         if( !rec.hasKey() ) { eb('Invalid key'); }
         this.read(model, rec).done(function(origRec) {
            if( origRec === null ) { eb('Record does not exist'); }
            else {
               origRec.updateAll(rec);
               if( origRec.isDirty() ) {
                  var key = _keyFor(origRec), ref = _buildRecord(table, key);
                  ref.set(cleanData(model.fields, rec.getData()), function(success) {
                     (success && cb(ref.name(), true)) || eb('Synchronize failed');
                  });
               }
               else {
                  cb(origRec.getRecordId().valueOf(), false);
               }
            }
         }).fail(function(e) { eb(e); });
      });
   };

   /**
    * Delete a record from the database. If the record does not exist, then it is considered already deleted (no
    * error is generated)
    *
    * @param {Model}           model
    * @param {Record|RecordId} recOrId
    * @return {Promise} resolves with record's {string}id
    */
   FirebaseStore.prototype.delete       = function(model, recOrId) {
      return ko.sync.handle(this, function(cb, eb) {
         var ref = _buildRecord(this.base.child(model.table), _keyFor(recOrId));
         ref.remove(function(success) {
            (success && cb(ref.name())) || eb(ref.name());
         })
      });
   };

   /**
    * Perform a query against the database. The options for query are fairly limited:
    *
    * - limit:   {int=100}      number of records to return, use 0 for all
    * - offset:  {int=0}        start after this record, e.g.: {limit: 100, offset: 100} would return records 101-200
    * - filter:  {function}     filter returned results using this function (true=include, false=exclude)
    * - sort:    {array|string} Sort returned results by this field or fields. Each field specified in sort
    *                           array could also be an object in format {field: 'field_name', desc: true} to obtain
    *                           reversed sort order
    *
    * The use of `filter` is applied by stores after `limit`. Thus, when using `filter` it is important to note that
    * less results may (and probably will) be returned than `limit`.
    *
    * Each record received is handled by the progressFxn, not by the fulfilled promise. The fulfilled promise simply
    * notifies listeners that it is done retrieving records.
    *
    * There are no guarantees on how a store will optimize the query. It may apply the constraints before or after
    * retrieving data, depending on the capabilities and structure of the data layer. To ensure high performance
    * for very large data sets, and maintain store-agnostic design, implementations should use some sort of
    * pre-built query data in an index instead of directly querying records (think NoSQL databases like
    * DynamoDB and Firebase, not MySQL queries)
    *
    * Alternately, very sophisticated queries could be done external to the knockout-sync module and then
    * injected into the synced data after.
    *
    * @param {Function} progressFxn called once for each record received
    * @param {Model}  model
    * @param {object} [params]
    * @return {Promise} fulfilled with callback('tableName', limit) if limit is reached
    */
   FirebaseStore.prototype.load = function(progressFxn, model, params) {
      var def = $.Deferred();
      var opts = ko.utils.extend({limit: 100, offset: 0, filter: null, sort: null}, params);
      var table = this.base.child(model.table);
      var count = 0, offset = ~~opts.offset, limit = opts.limit? ~~opts.offset + ~~opts.limit : 0;
      //todo if the model has a sort priority, we can use that with startAt() and endAt()
      if( limit ) { table.limit(limit); }
      table.forEach(function(snapshot) {
         var data = snapshot.val();
         if( data !== null ) {
            count++;
            if( count <= start ) { return; }
            else if( count > limit ) {
               def.resolve(model.table, opts.limit);
               return true;
            }
            if( !opts.filter || opts.filter(data) ) {
               progressFxn(data);
            }
         }
      });
      return def.promise();
   };

   FirebaseStore.prototype.sync = function(location, callback) {}; //todo

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

})(ko, window.Firebase);