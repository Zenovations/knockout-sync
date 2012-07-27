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
       * - limit:   {int=100}         number of records to return, use 0 for all
       * - offset:  {int=0}           exclusive starting point in records, e.g.: {limit: 100, offset: 100} would return records 101-200 (the first record is 1 not 0)
       * - where:   {function|object} filter rows using this function or value map
       * - sort:    {array|string}    Sort returned results by this field or fields. Each field specified in sort
       *                              array could also be an object in format {field: 'field_name', desc: true} to obtain
       *                              reversed sort order
       *
       * USE OF WHERE
       * -------------
       * If `where` is a function, it is always applied after the results are returned. Thus, when used in conjunction
       * with `limit`, there may (and probably will) be less results than `limit` en toto.
       *
       * If `where` is a hash (key/value pairs), the application of the parameters is left up to the discretion of
       * the store. For SQL-like databases, it may be part of the query. For data stores like Firebase, or
       * other No-SQL types, it could require fetching all results from the table and filtering them on return. So
       * use this with discretion.
       *
       * THE ITERATOR
       * ---------------------
       * Each record received is handled by `iterator`. When no limit is set, all records in the database
       * are guaranteed to be loaded. However, even with limit set, some data layers may load all the records,
       * particularly when using `where` parameters. This is a very important point to keep in mind.
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
       * @param {Function} iterator
       * @param {ko.sync.Model}  model
       * @param {object} [parms]
       * @return {Promise}
       */
      query: function(model, iterator, parms) { throw new Error('Interface not implemented'); },

      /**
       * Given a particular data model, get a count of all records in the database matching
       * the parms provided. Parms is the same as query() method. This could be a very high-cost
       * operation depending on the data size and the data source (it could require iterating
       * every record in the table) for some data layers.
       *
       * @param {ko.sync.Model} model
       * @param {object}        [parms]
       */
      count: function(model, parms) { throw new Error('Interface not implemented'); },

      /**
       * True if this data layer provides push updates that can be monitored by the client.
       * @return {boolean}
       */
      hasTwoWaySync: function() { throw new Error('Interface not implemented'); },

      /**
       * Given a particular data model, apply any changes to the observableArray provided.
       *
       * If the data layer provides two-way sync, then it will also send any updates to the
       * server, assuming the model's autoSync property is set to true.
       *
       * @param {ko.sync.Model} model
       * @param  observableArray
       * @return {Store} this
       */
      syncModel: function(model, observableArray) { throw new Error('Interface not implemented'); },

      /**
       * Stop monitoring a data model, do not apply any more changes to the observableArray.
       *
       * @param {ko.sync.Model} model
       * @param observableArray
       * @return {Store} this
       */
      unsyncModel: function(model, observableArray) { throw new Error('Interface not implemented'); },

      /**
       * Given a particular data model, apply any changes to the observableArray provided. If the data layer
       * provides two-way sync, then it will also send any updates to the server, assuming the model's
       * autoSync property is set to true.
       *
       * @param {ko.sync.Model} model
       * @param  observableArray
       * @return {Store} this
       */
      syncRecord: function(model, record, observable) { throw new Error('Interface not implemented'); },

      /**
       * Stop monitoring a data model, do not apply any more changes to the observableArray.
       *
       * @param {ko.sync.Model} model
       * @param observableArray
       * @return {Store} this
       */
      unsyncRecord: function(model, record, observable) { throw new Error('Interface not implemented'); }
   });

   Store.EVENT_TYPES = 'added deleted moved updated connected disconnected';

})(this.ko);