
(function(ko, $) {

   /**
    * @param {ko.sync.Model} model
    * @constructor
    */
   ko.sync.ChangeController = function(model) {
      this.model = model;
      // KeyFactory is used to generate caches and find elements inside observableArray
      // context is used to store the cached ids for quickly searching observable arrays
      this.context = {keyFactory: new ko.sync.KeyFactory(model, true)};
   };

   /**
    * @param {string} destination one of 'store' or 'obs'
    * @param {ko.sync.RecordList} recList
    * @param {Object|ko.observable|ko.observableArray} target
    * @return {jQuery.Deferred} promise
    */
   ko.sync.ChangeController.prototype.process = function(destination, recList, target) {
      var promises = [], self = this, context = this.context;
//      var changeEventList = _.map(recList.changeList(), function(v) { return [v[0], v[1].hashKey()]});//debug
//      console.log('ChangeController.process', changeEventList.length, changeEventList); //debug
      _.each(recList.changeList(), function(changeListEntry) {
//         console.log('ChangeController.process', 'change', changeListEntry[0], changeListEntry[1].id, changeListEntry[2]);//debug
         var change = ko.sync.Change.fromChangeList(destination, self.model, changeListEntry, target);
         promises.push(change.run(context).done(function(id) {
            recList.clearEvent(_invertAction(change.action), change.key());
            change.rec.isDirty(false);
         }));
      });
      self.changes = [];
      self.changesByKey = {};
      return $.when.apply($, promises);
   };

   ko.sync.ChangeController.prototype.processRecord = function(destination, action, rec, target) {
      rec.isDirty(true);
      var list = new ko.sync.RecordList(this.model);
      switch(action) {
         case 'create':
            list.add(rec);
            break;
         case 'update':
            list.load(rec);
            list.updated(rec);
            break;
         case 'delete':
            list.load(rec);
            list.remove(rec);
            break;
         case 'move':
            list.load(rec);
            list.updated(rec);//todo this probably isn't right
            break;
         default:
            throw new Error('invalid action: '+action);
      }
      return this.process(destination, list, target);
   };

   var INVERT_ACTIONS = {
      'create': 'added',
      'update': 'updated',
      'move': 'moved',
      'delete': 'deleted'
   };

   function _invertAction(changeActionType) {
      if( !_.has(INVERT_ACTIONS, changeActionType) ) {
         throw new Error('invalid action: '+changeActionType);
      }
      return INVERT_ACTIONS[changeActionType];
   }

})(ko, jQuery);

