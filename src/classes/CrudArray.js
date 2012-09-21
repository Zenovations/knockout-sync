(function($) {

   /**
    * @param {ko.sync.RecordList} list a RecordList we will use as our base
    * @constructor
    */
   ko.sync.CrudArray = function(target, model, list, criteria) {
      this.list = list; //todo create new lists? may not have one to start?
      this.parent = target;
      this.promise = $.Deferred().resolve().promise();
      //todo what do we do with lists that are already populated? SyncController will expect the sync op to populate data
      this.controller = new ko.sync.SyncController(model, list, criteria);
   };

   var CrudArray = ko.sync.CrudArray;

   /**
    * @param {boolean} [b] set the isDirty value (use with care!)
    * @return {boolean}
    */
   CrudArray.prototype.isDirty = function(b) {
      return this.list.isDirty(b);
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
      var rec = (recordOrData instanceof ko.sync.Record)? recordOrData : this.model.newRecord(recordOrData);
      this.list.add(rec, afterRecordId);
      return this;
   };

   /**
    * Load a list of records from data layer into the local copy (replaces local list)
    *
    * @param {object|function} criteria
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.read = function( criteria ) {
      //todo

      return this;
   };

   /**
    * Save any unsynced changes to the local list.
    *
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.update = function() {
      var list = this.list, c = this.controller;
      if( list.isDirty() ) {
         list.added.length && c.pushUpdates(list.added, 'added');
         list.updated.length && c.pushUpdates(list.updated, 'updated');
         list.deleted.length && c.pushUpdates(list.deleted, 'deleted');
         list.moved.length && c.pushUpdates(list.moved, 'moved');
      }
      return this;
   };

   /**
    * Delete a record from the local list and also from the data layer (if auto-update is false, the remote delete
    * is triggered during the next `update()` operation.
    *
    * @param {ko.sync.RecordId|ko.sync.Record|string} hashKey
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.delete = function( hashKey ) {
      this.list.remove(hashKey);
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

})(jQuery);

