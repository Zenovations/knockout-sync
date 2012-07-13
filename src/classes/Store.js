/*******************************************
 * Store interface for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

   /**
    * Store interface describing how Store implementations should work and providing instanceof and extensibility
    *
    * @interface
    */
   var Store = ko.sync.Store = Class.extend({
      init: function(properties) { throw new Error('Interface not implemented'); },

      /**
       * Create a record in the database.
       *
       * The store guarantees that values will be converted to valid entries. For instance, the model stores dates as
       * a JavaScript Date object, but each Store will convert these to an appropriate storage type (e.g. ISO 8601 string,
       * unix timestamp, etc).
       *
       * No guarantees are made that existing records will not be overwritten, although some stores may enforce this and
       * return an error if the record is found.
       *
       * @param {ko.sync.Model} model
       * @param {ko.sync.Record} record
       * @return {Promise} a jQuery.Deferred().promise() object
       */
      create: function(model, record) { throw new Error('Interface not implemented'); },

      /**
       * Retrieves a record from the database by its unique ID. If a record does not exist, all Stores should return
       * a null value (not an error).
       *
       * Temporary connectivity or database errors should be handled internally by the Store and the queries retried until
       * they are successful.
       *
       * Rejecting the promise should be reserved for non-recoverable errors and permanent connectivity issues.
       *
       * @param {ko.sync.Model}     model
       * @param {ko.sync.RecordId}  recordId
       * @return {Promise}  resolves to the Record object or null if it is not found
       */
      read: function(model, recordId) { throw new Error('Interface not implemented'); },

      /**
       * Given a record id, update that record in the database. If the record does not exist, the promise is rejected.
       *
       * @param {ko.sync.Model}  model
       * @param {ko.sync.Record} rec
       * @return {Promise} resolves to true if an update occurred or false if data was not dirty
       */
      update: function(model, rec) { throw new Error('Interface not implemented'); },

      /**
       * Delete a record from the database. If the record does not exist, then it is considered already deleted (no
       * error is generated)
       *
       * @param {ko.sync.Model}           model
       * @param {ko.sync.Record|ko.sync.RecordId} recOrId
       * @return {Promise} resolves with record's {string}id
       */
      delete: function(model, recOrId) { throw new Error('Interface not implemented'); },

      /**
       * Perform a query against the database. The options for query are fairly limited:
       *
       * - limit:   {int=100}      number of records to return, use 0 for all
       * - offset:  {int=0}        starting point in records, e.g.: {limit: 100, start: 101} would return records 101-200
       * - filter:  {function|object}  filter rows using this function or value map
       * - sort:    {array|string} Sort returned results by this field or fields. Each field specified in sort
       *                           array could also be an object in format {field: 'field_name', desc: true} to obtain
       *                           reversed sort order
       *
       * USE OF FILTER
       * -------------
       * When `filter` is a function, it is always applied after the results are returned. Thus, when used in conjunction
       * with `limit`, there may (and probably will) be less results than `limit` en toto.
       *
       * When `filter` is a hash (key/value pairs), the application of the parameters is left up to the discretion of
       * the store. For SQL-like databases, it may be part of the query. For data stores like Simperium, Firebase, or
       * other No-SQL types, it could require fetching all results from the table and filtering them on return. So
       * use this with discretion.
       *
       * THE PROGRESS FUNCTION
       * ---------------------
       * Each record received is handled by `progressFxn`. When no limit is set, stores may never fulfill
       * the promise. This is a very important point to keep in mind.
       *
       * Additionally, even if a limit is set, if the number of results is less than limit, the promise may
       * still never fulfill (as stores will not fulfill until the required number of results is reached).
       *
       * In the case of a failure, the fail() method on the promise will always be notified immediately, and the load
       * operation will end immediately.
       *
       * PERFORMANCE
       * -----------
       * There are no guarantees on how a store will optimize a query. It may apply the constraints before or after
       * retrieving data, depending on the capabilities and structure of the data layer. To ensure high performance
       * for very large data sets, and maintain store-agnostic design, implementations should use some sort of
       * pre-built query data in an index instead of directly querying records (think NoSQL databases like
       * DynamoDB and Firebase, not MySQL queries)
       *
       * Alternately, very sophisticated queries could be done external to the knockout-sync module and then
       * injected into the synced data after.
       *
       * @param {Function} progressFxn
       * @param {ko.sync.Model}  model
       * @param {object} [parms]
       * @return {Promise}
       */
      query: function(progressFxn, model, parms) { throw new Error('Interface not implemented'); },

      /**
       * Given a particular data model, get notifications of any changes to the data. The change notifications will
       * come in the form:
       *
       *   - callback('added', {string}record_id, {object}hash_of_name_value_pairs)
       *   - callback('deleted', {string}record_id)
       *   - callback('updated', {string}record_id, {object}hash_of_name_value_pairs)
       *
       * @param {ko.sync.Model} model
       * @param {Function} callback
       * @return {Store} this
       */
      sync: function(model, callback) { throw new Error('Interface not implemented'); }

   });

})(this.ko);