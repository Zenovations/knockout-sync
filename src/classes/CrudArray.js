(function($) {

   /**
    * @param {ko.observable} target
    * @param {ko.sync.Model} model
    * @param {object} [criteria]
    * @constructor
    */
   ko.sync.CrudArray = function(target, model, criteria) {
      //todo what do we do with lists that are already populated? SyncController will expect the sync op to populate data
      this.list = model.newList(target());
      this.parent = target;
      this.def = $.Deferred().resolve().promise();
      this.controller = new ko.sync.SyncController(model, target, this.list, criteria);
   };

   var CrudArray = ko.sync.CrudArray;

   /**
    * @param {boolean} [b] set the isDirty value (use with care!)
    * @return {boolean}
    */
   CrudArray.prototype.isDirty = function(b) {
      return this.list.isDirty(b); //todo this boolean does nothing for RecordList
   };

   /**
    * Add a new record to the local list and sync it to the data layer (during the next call
    * to `update()` if auto-update is false)
    *
    * @param {ko.sync.Record|Object} recordOrData
    * @param {ko.sync.Record|ko.sync.RecordId|String} [afterRecordId]
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.create = function( recordOrData, afterRecordId ) {
      this.def = this.def.pipe(_.bind(function() {
         var rec = (recordOrData instanceof ko.sync.Record)? recordOrData : this.model.newRecord(recordOrData);
         this.list.add(rec, afterRecordId);
         return this;
      }, this));
      return this;
   };

   /**
    * Load a list of records from data layer into the local copy (replaces local list)
    *
    * @param {object|function} criteria
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.read = function( criteria ) {
      this.def = this.def.pipe(_.bind(function() {

         //todo
         //todo
         //todo

      }, this));
      return this;
   };

   /**
    * Save any unsynced changes to the database.
    *
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.update = function(changes) {
      applyChanges(this, changes);

      this.def.pipe(function() {
         return this.controller.pushUpdates();
      }.bind(this));

      return this;
   };

   /**
    * Delete a record from the local list and also from the data layer (if auto-update is false, the remote delete
    * is triggered during the next `update()` operation)
    *
    * @param {ko.sync.RecordId|ko.sync.Record|string} hashKey
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.delete = function( hashKey ) {
      this.def = this.def.pipe(_.bind(function() {
         this.list.remove(hashKey);
         return this;
      }, this));
      return this;
   };

   /**
    * Alias to the `update` method.
    * @return {ko.sync.CrudArray}
    */
   CrudArray.prototype.save = function() {
      return this.update();
   };

   /**
    * Alias to the `read` method.
    * @return {ko.sync.CrudArray}
    */
   CrudArray.prototype.load = function() {
      return this.read.apply(this, _.toArray(arguments));
   };

   /**
    * Locate a record in the observable array using its hashKey
    * @return {Object}
    */
   CrudArray.prototype.find = function(hashKey) {
      //return this.list.find(hashKey);
      //todo
      //todo
      //todo
      //todo
   };


   /**
    * @return {jQuery.Deferred} promise
    */
   CrudArray.prototype.promise = function() {
      return this.def.promise();
   };

   function applyChanges(crud, changes) {
      //todo apply changes
      //todo
      //todo
      //todo
      //todo
      //todo
      //todo

//      var list = this.list;
//      var RecordId = ko.sync.RecordId;
//      _.each(changes, function(action, listOfDataObjects) {
//         switch(action) {
//            case 'create':
//               list.add(_.map(listOfDataObjects, function(data) {
//                  return model.newRecord(data);
//               }));
//               break;
//            case 'move':
//               _.each(listOfDataObjects, function(v) {
//                  var afterKey;
//                  if(_.isArray(v)) {
//                     afterKey = v[1];
//                     v = v[0];
//                  }
//                  list.move(RecordId.for(model, v), afterKey);
//               });
//               break;
//            case 'update':
//               _.each(listOfDataObjects, function(v) {
//                  var rec = list.find(RecordId.for(v));
//                  rec && rec.updateAll(v);
//               });
//               break;
//            case 'delete':
//
//               break;
//            default:
//               throw new Error('invalid update action: '+action);
//         }
//         list[action](listOfDataObjects);
//      });
   }

})(jQuery);

