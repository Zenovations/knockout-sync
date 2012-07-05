(function($, ko) {
   /** IDE CLUES
    **********************/
   /** @var {jQuery.Deferred}  */ var Promise;
   /** @var {ko.sync.Model}    */ var Model;
   /** @var {ko.sync.Record}   */ var Record;
   /** @var {ko.sync.RecordId} */ var RecordId;

   /**
    * Store interface describing how Store implementations should work and providing instanceof and extensibility
    *
    * @interface
    */
   var Store = Class.extend({
      init: function(properties) { throw new Error('Interface'); },

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
       * @param {Model} model
       * @param {Record} record
       * @return {Promise} a jQuery.Deferred().promise() object
       */
      create: function(model, record) { throw new Error('Interface'); },

      /**
       * Retrieves a record from the database by its unique ID. If a record does not exist, all Stores should return
       * a null value (not an error).
       *
       * Temporary connectivity or database errors should be handled internally by the Store and the queries retried until
       * they are successful.
       *
       * Rejecting the promise should be reserved for non-recoverable errors and connectivity issues.
       *
       * @param {Model}     model
       * @param {RecordId}  recordId
       * @return {Promise} a jQuery.Deferred().promise() object
       */
      read: function(model, recordId) { throw new Error('Interface'); },

      /**
       * Given a record id, update that record in the database.
       */
      update: function() { throw new Error('Interface'); },

      //todo
      delete: function() { throw new Error('Interface'); },

      //todo
      query: function() { throw new Error('Interface'); },

      //todo
      sync: function() { throw new Error('Interface'); },

      //todo
      onDisconnect: function() { throw new Error('Interface'); },

      //todo
      onConnect: function() { throw new Error('Interface'); }

   });

})(jQuery, ko);