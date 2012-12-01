
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
      if( recList instanceof ko.sync.Record ) {
         var rec = recList;
         rec.isDirty(true);
         recList = new ko.sync.RecordList(self.model, rec);
         recList.updated(rec);
      }
      _.each(recList.changeList(), function(changeListEntry) {
         var change = ko.sync.Change.fromChangeList(destination, self.model, changeListEntry, target);
         promises.push(change.run(context).done(function(id) {
            recList.clearEvent(change.action, change.key());
            change.action.rec.isDirty(false);
         }));
      });
      self.changes = [];
      self.changesByKey = {};
      return $.when.apply($, promises);
   };

})(ko, jQuery);

