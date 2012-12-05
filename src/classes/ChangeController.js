
(function(ko, $) {

   /**
    * @constructor
    */
   ko.sync.ChangeController = function() {
      this.changes = []; // used to run the changes in order
      this.changesIndexed = {}; // used to find the changes by key
      this.failed = [];
   };

   ko.sync.ChangeController.prototype.process = function() {
      //todo change to the server could be applied using update() in Firebase, add a new method to
      //todo Store which allows for multiple updates to be committed and send store updates in one batch
      //todo maybe with a StoreQueue of some sort? maybe just a list of Change objects?
      var promises = [], changes = this.changes, failed = this.failed;
      this.changes = [];
      this.changesIndexed = {};
      _.each(changes, function(change) {
         console.log('process', change.key(), change.action, change.to); //debug
         promises.push(change.run().fail(function(e) {
            //todo what to do with failed changes? we need some form of error recovery here
            console.error(e);
            failed.push(change);
         })
            .done(function(change, id) { console.log('done', id); })); //debug
      });
      // wait for all the items to succeed or for any to fail and return the promises for every change
      return $.Deferred(function(def) {
         $.when.apply($, promises)
            .done(function() { def.resolve(promises); })
            .fail(function() { def.reject(promises);  })
      });
   };

   /**
    * @param {ko.sync.Change} change
    * @return {ko.sync.ChangeController} this
    */
   ko.sync.ChangeController.prototype.addChange = function(change) {
      _addOrReconcileChange(this.changesIndexed, this.changes, change);
      return this;
   };

   /**
    * @param {string} destination one of 'store' or 'obs'
    * @param {ko.sync.RecordList} recList
    * @param {Object|ko.observable|ko.observableArray} target
    * @return {jQuery.Deferred} promise
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
               recList.clearEvent(_translateActionToChangeListEvent(change.action), change.key());
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

   var INVERT_ACTIONS = {
      'create': 'added',
      'update': 'updated',
      'move': 'moved',
      'delete': 'deleted'
   };

   function _translateActionToChangeListEvent(changeActionType) {
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
   function _addOrReconcileChange(changeListIndex, changeListOrdered, change){
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
