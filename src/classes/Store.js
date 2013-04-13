/*! Store.js
 *************************************/
(function (ko) {
   "use strict";

   /**
    * A Store is any place that the data referenced in knockout can be retrieved from and saved back into.
    * This can be a database connection, localStorage, a third party library, or even an array that you
    * push and pull from. Knockout-sync doesn't care.
    *
    * To create a Store, simply extend ko.sync.Store and implement all the methods below. We're using John Resig's
    * Class inheritance () so put your constructor in the `init` method.
    *
    * For a quick example of a Store, see stores/LocalStore.js
    *
    * All the CRUD methods in Store have the option of returning a value, returning an Error, or returning
    * a Promise (a Deferred object for async lookups). Knockout-sync does all the dirty work, so that if
    * you have the data available you may simply return it immediately without the pretense of wrapping
    * everything in a Promise first.
    *
    * @constructor
    * @interface
    */
   ko.sync.Store = Class.extend({

      /**
       * The key (record id) must somehow be retrievable based on the data in the object that is given to
       * Knockout. The simplest answer is to store the id in the record. However, you could also generate
       * ids by combining values in some meaningful way or looking up the matching record--that's entirely
       * up to you.
       *
       * @param {Object} data  the data record
       * @returns {String}
       */
      getKey: function(data) {
         throw new Error('Implementations must declare getKey method');
      },

      /**
       * Returns a list of fields that are stored in the data record. This is to help with observables that have
       * their own properties attached.
       *
       * @returns {Array}
       */
      getFieldNames: function() {
         throw new Error('Implementations must declare getFieldNames method');
      },

      /**
       * Create a new record in the data Store. In the case that the record already exists, it is up to the Store's
       * discretion on how it should be handled; updating the record or ignoring the create operation are both valid
       * and should work fine, but it should not reject or return an Error.
       *
       * Return an Error or reject the Deferred for failed operations or invalid data.
       *
       * @param {Object} data  the new data record
       * @returns {Deferred|String} returns or resolves to the new record id (key)
       */
      create: function(data) {
         throw new Error('Implementations must declare create method');
      },

      /**
       * Fetch a record from the Store. If it doesn't exist, return null. If this method is called without a key,
       * then the store should load all records and invoke child_added events for them.
       *
       * Reject or return Error for operational errors.
       *
       * @param {String} [key]
       * @returns {Deferred|Object|null} returns or resolves to the record data
       */
      read: function(key) {
         throw new Error('Implementations must declare read method');
      },

      /**
       * Save changes to the Store. Reject or return an Error if the operation fails. If the record does not exist,
       * the Store may return/resolve false or create the record at its discretion. Reject or return an Error if the
       * data is invalid.
       *
       * @param {String} key
       * @param {Object} data
       * @returns {Deferred|String|Error|boolean} returns or resolves to the key (record id)
       */
      update: function(key, data) {
         throw new Error('Implementations must declare update method');
      },

      /**
       * Removes a record from the store. If the record doesn't exist, simply returns the key (behaves exactly
       * as if it was deleted).
       *
       * Reject or return Error if there is a problem with the operation.
       *
       * @param {String} key
       * @returns {Deferred|String} returns or resolves to the key (record id)
       */
      'delete': function(key) {
         throw new Error('Implementations must declare delete method');
      },

      /**
       * Listens for push events from the Store. The possible events are create, update, delete. The callback
       * will always be passed {String}key, {Object}data, and {String}event for every event. An optional
       * {String}prevId may be included with create events.
       *
       * Example:
       * <pre><code>
       *    // monitor both create and delete ops
       *    store.on('create delete', function(key, data, event, prevId) {
       *       alert('record ' + key);
       *    });
       * </code></pre>
       *
       * It is also possible to monitor events for a specific record by passing a key as the second argument. The only
       * valid event for monitoring a record is "update"
       *
       * Example:
       * <pre><code>
       *    // listen to one record only
       *    store.on('update', 'record123', function(key, data) {
       *       // note that the key is still passed to the callback
       *       alert('this record changed');
       *    });
       * </code></pre>
       *
       * Note that when a listener is attached to the 'create' event for the first time, it should immediately receive
       * all records (or in the case that key was passed exactly one record) from the data Store.
       *
       * @param {String} event  space delimited list of events to monitor
       * @param {String} [key] if provided, event defaults to "update"
       * @param {Function} callback
       * @return {Object} with a dispose function that can be invoked to cancel the listener
       */
      on: function(event, key, callback) {
         throw new Error('Implementations must declare on events for add, remove, and change');
      },

      /**
       * Close any opened sockets, connections, and notifications. Perform any cleanup needed in prep
       * for discarding the store and avoiding memory leaks.
       */
      dispose: function() {
         throw new Error('Implementations must declare dispose method');
      }

   });

})(window.ko);