
(function(ko, $) {

   /**
    * @param {ko.sync.Model} model
    * @param {ko.sync.KeyFactory} keyFactory
    * @constructor
    */
   ko.sync.ChangeController = function(model) {
      this.model = model;
      this.keyFactory = new ko.sync.KeyFactory(model, true); // used to generate caches and find elements inside observableArray
   };

   /**
    * @param {string} destination one of 'store' or 'obs'
    * @param {ko.sync.RecordList} recList
    * @param {Object|ko.observable|ko.observableArray} target
    * @return {jQuery.Deferred} promise
    */
   ko.sync.ChangeController.prototype.process = function(destination, recList, target) {
      var promises = [], self = this, context = {keyFactory: this.keyFactory};
      _.each(recList.changeList(), function(changeListEntry) {
         var change = ko.sync.Change.fromChangeList(this.model, changeListEntry, target);
         promises.push(change.run(context).done(function(id) {
            recList.clearEvent(change.action, change.key());
            change.action.rec.isDirty(false);
         }));
      });
      self.changes = [];
      self.changesByKey = {};
      return $.when.apply($, promises);
   };

//   /**
//    * @param {Object} exp
//    * @return boolean
//    */
//   ko.sync.ChangeController.prototype.expected = function(exp) {
//      var base = _.deepFind(this.expected, [exp.dest, exp.action, exp.hashKey()]);
//      return base && _.find(base, exp) !== null;
//   };
//
//   function deleteExpected(expList, exp) {
//      if(expList && _.has(expList, exp.key)) {
//         var keyList = expList[exp.key];
//         var idx = _.indexOf(keyList, exp);
//         console.log('deleteExpected', idx); //debug
//         if( idx > -1 ) {
//            if( keyList.length === 1 ) {
//               delete expList[exp.key];
//            }
//            else {
//               keyList.splice(idx, 1);
//            }
//         }
//      }
//   }
//
//   /**
//    * Generate an expected object
//    * @param {ko.sync.Change} change
//    * @return Object
//    */
//   function expect(change) {
//      return _.extend(_.pick(change, ['action', 'prevId', 'data']), {dest: dest, key: change.rec.hashKey()});
//   }

})(ko, jQuery);

