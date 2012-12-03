
(function(ko, $) {

   /**
    * @param {ko.sync.KeyFactory} keyFactory
    * @constructor
    */
   ko.sync.ChangeController = function(keyFactory) {
      // KeyFactory is used to generate caches and find elements inside observableArray
      // context is used to store the cached ids for quickly searching observable arrays
      this.keyFactory = keyFactory;
      this.changes = [];
   };

   ko.sync.ChangeController.prototype.process = function() {
      var promises = [], changes = this.changes, keyFactory = this.keyFactory;
      this.changes = [];
      _.each(changes, function(change) {
         promises.push(change.run(keyFactory).then());
      });
      return $.when.apply($, promises);
   };

   /**
    * @param {ko.sync.Change} change
    * @return {ko.sync.ChangeController} this
    */
   ko.sync.ChangeController.prototype.addChange = function(change) {
      this.changes.push(change);
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
      var self = this, context = this.context;
      _.each(recList.changeList(), function(changeListEntry) {
         self.changes.push(ko.sync.Change.fromChangeList(
            destination,
            recList.model,
            changeListEntry,
            target,
            function(change) {
               recList.clearEvent(_translateActionToChangeListEvent(change.action), change.key());
            }));
//         var change = self.changes[self.changes.length-1];//debug
//         console.log('addChange', change.action, change.key(), change.prevId);//debug
      });
      return this;
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

})(ko, jQuery);

