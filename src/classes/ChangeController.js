
(function(ko, $) {

   /**
    * @constructor
    */
   ko.sync.ChangeController = function() {
      this.changes = []; // used to run the changes in order
      this.changesIndexed = {}; // used to find the changes by key
      this.listeners = [];
   };

   /**
    * @return {Array} each element contains [ Change, Promise ]
    */
   ko.sync.ChangeController.prototype.process = function() {
      //todo change to the server could be applied using update() in Firebase, add a new method to
      //todo Store which allows for multiple updates to be committed and send store updates in one batch
      //todo maybe with a StoreQueue of some sort? maybe just a list of Change objects?
      var promises = [], changes = this.changes, failed = this.failed, listeners = this.listeners;
      var results = [];
      this.changes = [];
      this.changesIndexed = {};
      _.each(changes, function(change) {
         notify(listeners, 'started', change);
         var pos = results.length;
         results.push({
            key:    change.key(),
            change: change,
            state:  'pending'
         });
         var def = change.run()
               .fail(function(e) {
                  results[pos].state = 'rejected';
                  notify(listeners, 'failed', change, e);
               })
               .done(function(change, id) {
                  results[pos].state = 'resolved';
                  notify(listeners, 'completed', change, id);
               });
         promises.push(def);
      });
      // wait for all the items to succeed or for any to fail and return the promises for every change
      return $.Deferred(function(def) {
         $.whenAll.apply($, promises)
            .done(function() { def.resolve(results); })
            .fail(function() { def.reject(results);  })
      });
   };

   /**
    * @param {ko.sync.Change} change
    * @return {ko.sync.ChangeController} this
    */
   ko.sync.ChangeController.prototype.addChange = function(change) {
      addOrReconcileChange(this.changesIndexed, this.changes, change);
      return this;
   };

   /**
    * @param {string} destination one of 'store' or 'obs'
    * @param {ko.sync.RecordList} recList
    * @param {Object|ko.observable|ko.observableArray} target
    * @return {ko.sync.ChangeController} this
    */
   ko.sync.ChangeController.prototype.addList = function(destination, recList, target) {
      //todo-mass come up with a way to handle mass updates at the store level
      //todo-mass and implement that here
      var self = this;
      _.each(recList.changeList(), function(changeListEntry) {
         self.addChange(ko.sync.Change.fromChangeList(
            destination,
            recList.model,
            changeListEntry,
            target,
            function(change) {
               recList.clearEvent(translateActionToChangeListEvent(change.action), change.key());
            }));
      });
      return this;
   };

   /**
    * @param {string} hashKey
    * @return {boolean}
    */
   ko.sync.ChangeController.prototype.findChange = function(hashKey) {
      return hashKey in this.changesIndexed && this.changesIndexed[hashKey];
   };

   /**
    * @param {Function} callback
    * @return {Object} with a dispose method
    */
   ko.sync.ChangeController.prototype.observe = function(callback) {
      var listeners = this.listeners;
      listeners.push(callback);
      return {
         dispose: function() {
            _.remove(listeners, callback);
         }
      };
   };

   var INVERT_ACTIONS = {
      'create': 'added',
      'update': 'updated',
      'move': 'moved',
      'delete': 'deleted'
   };

   function notify(list, action, change) {
      var args = _.toArray(arguments).slice(1);
      _.each(list, function(fx) {
         fx.apply(null, args);
      });
   }

   function translateActionToChangeListEvent(changeActionType) {
      if( !_.has(INVERT_ACTIONS, changeActionType) ) {
         throw new Error('invalid action: '+changeActionType);
      }
      return INVERT_ACTIONS[changeActionType];
   }

   /**
    * @param {Object} changeListIndex
    * @param {Array} changeListOrdered
    * @param {ko.sync.Change} change
    * @private
    */
   function addOrReconcileChange(changeListIndex, changeListOrdered, change){
      var key = change.key();
      if( key in changeListIndex ) {
         changeListIndex[key].reconcile(change);
      }
      else {
         changeListIndex[key] = change;
         changeListOrdered.push(change);
      }
   }

})(ko, jQuery);
