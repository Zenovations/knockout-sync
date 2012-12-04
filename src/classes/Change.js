
(function(ko, $) { //todo remove jQuery dependency?
   "use strict";
   var undef;

   /**
    * Props:
    *    to     {string} one of 'store' or 'obs'
    *    action {string} one of 'create', 'update', 'delete', or 'move'
    *    id     {String} the hashKey for the record being modified
    *    prevId {string} required by move and add operations
    *    data   {object} required by add and update, the data to be applied in the change
    *    model  {ko.sync.Model}
    *    obs    {Object|ko.sync.observable} the knockout data being synced, which can be an observableArray (observed)
    *    rec    {ko.sync.Record} required when `to` is set to 'store'
    *
    * @param props see above
    * @constructor
    */
   ko.sync.Change = function(props) {
      // declarations for the IDE
      /** @type string */
      this.to      = undef;
      /* @type {string} */
      this.action  = undef;
      /* @type {string} */
      this.prevId  = undef;
      /* @type {Object} */
      this.data    = undef;
      /* @type {ko.sync.Model} */
      this.model   = undef;
      /* @type {ko.observable|ko.observableArray|Object} */
      this.obs     = undef;
      /* @type {ko.sync.Record} */
      this.rec     = undef;
      /* @type {Function} */
      this.success = null;

      // apply the properties provided
      _.extend(this, _.pick(props, ['to', 'action', 'prevId', 'data', 'model', 'rec', 'obs', 'success']));

      /** @type {ko.sync.KeyFactory} */
      this.keyFactory = new ko.sync.KeyFactory(this.model);

      this.status  = 'pending';
      this.done    = $.Deferred();
   };

   ko.sync.Change.prototype.equals = function(change) {
      if( change instanceof ko.sync.Change
         && change.to === this.to
         && change.action === this.action
         && change.key() === this.key() ) {

         switch(change.action) {
            case 'create':
            case 'delete':
               return true;
            case 'update':
               return _.isEqual(change.data, this.data);
            case 'move':
               return change.prevId === this.prevId;
            default:
               throw new Error('invalid action ' + change.action);
         }
      }
      return false;
   };

   /**
    * @return {String}
    */
   ko.sync.Change.prototype.key = function() {
      return this.rec.hashKey();
   };

   ko.sync.Change.fromChangeList = function(to, model, changeData, target, callback) {
      return new ko.sync.Change({
         model:   model,
         obs:     target,
         to:      to,
         action:  _changeAction(changeData[0]),
         rec:     changeData[1],
         prevId:  changeData[2] === null? 0 : changeData[2],
         data:    changeData[1].getData(true),
         success: callback
      });
   };

   /**
    * @return {jQuery.Deferred}
    */
   ko.sync.Change.prototype.run = function() {
      var self = this, def;
      switch(self.to) {
         case 'store':
            def = sendToStore(self);
            break;
         case 'obs':
            def = sendToObs(self);
            break;
         default:
            throw new Error('invalid destination: '+self.to);
      }
      return def.pipe(function(id) {
         self.rec && self.rec.isDirty(false);
         if( self.success ) { self.success(self, id); }
         return $.Deferred(function(def) { def.resolve(self, id); }).promise();
      });
   };

   function sendToStore(change) {
      console.log('sendToStore', change.action, change.key(), change.prevId);//debug
      var store = change.model.store;
      switch(change.action) {
         case 'create':
            return store.create(change.model, change.rec).then(function(id) {
               change.rec.updateHashKey(id);
            });
         case 'update':
            return store.update(change.model, change.rec);
         case 'delete':
            return store.delete(change.model, change.rec);
         case 'move':
            return store.update(change.model, change.rec);
         default:
            throw new Error('invalid action: '+change.action);
      }
   }

   /**
    * @param {ko.sync.Change} change
    */
   function sendToObs(change) {
//      console.log('sendToObs', change.action, change.key(), change.prevId);//debug
      var res;
      if( ko.sync.isObservableArray(change.obs) ) {
         switch(change.action) {
            case 'create':
               res = _obsCreate(change);
               break;
            case 'update':
               res = _obsUpdate(change);
               break;
            case 'delete':
               res = _obsDelete(change);
               break;
            case 'move':
               res = _obsMove(change);
               break;
            default:
               throw new Error('invalid action: '+change.action);
         }
      }
      else {
         res = _obsUpdate(change);
      }
      return $.Deferred().resolve(res).promise();
   }

   function _obsCreate(change) {
      var observedFields = change.model.observedFields();
      var id     = change.key();
      var isList = ko.sync.isObservableArray(change.obs);
      var target = change.obs;
      if( isList ) {
         var sourceData = ko.sync.Record.applyWithObservables({}, change.data, observedFields);
         var pos = newPositionForKey(change.keyFactory, target, id, change.prevId);
         if( pos < 0 ) {
            target.push(sourceData);
         }
         else {
            target.splice(pos, 0, sourceData);
         }
      }
      else {
         var source = findTargetDataSource(change.keyFactory, target, id, change.keyFactory);
         ko.sync.Record.applyWithObservables(source, change.data, observedFields);
      }
      return id;
   }

   function _obsUpdate(change) {
      if( change.data ) {
         var source = findTargetDataSource(change.obs, change.key(), change.keyFactory);
         source && ko.sync.Record.applyWithObservables(source, change.data, change.model.observedFields());
         !source && console.debug('tried to update non-existent record', change.key());
      }
      return change.key();
   }

   function _obsDelete(change) {
      var pos = ko.sync.findByKey(change.obs, change.keyFactory, change.key());
      if( pos > -1 ) {
         change.obs.splice(pos, 1);
      }
      return change.key();
   }

   function _obsMove(change) {
      var id = change.key();
      var target = change.obs;
      var pos = ko.sync.findByKey(target, change.keyFactory, id);
      var newPos = newPositionForKey(change.keyFactory, target, id, change.prevId);
      if( pos > -1 && pos !== newPos ) {
         _.move(target, pos, newPos);
      }
      return id;
   }

   /**
    * @param {ko.sync.KeyFactory} keyFactory
    * @param {ko.observableArray} target
    * @param {String} [key]
    * @param {String} [prevId]
    * @return {number}
    */
   function newPositionForKey(keyFactory, target, key, prevId) {
      var len = target().length;
      var newPos = -1, oldPos, prevIdPos;
      prevId instanceof ko.sync.RecordId && (prevId = prevId.hashKey());
      if( typeof(prevId) === 'string' ) {
         prevIdPos = ko.sync.findByKey(target, keyFactory, prevId);
         oldPos = ko.sync.findByKey(target, keyFactory, key);

         // when moving records, if the old record exists and is earlier in the array, then it
         // will be spliced out, which causes the final position to be one lower, but normally,
         // we want the index after the prevId's position
         if( prevIdPos > -1 && (oldPos < 0 || oldPos > prevIdPos)  ) {
            newPos = prevIdPos+1;
         }
         else {
            newPos = prevIdPos;
         }
      }
      else if( typeof(prevId) === 'number' ) {
         newPos = prevId < 0? Math.max(len - 1 - prevId, 0) : Math.min(len, prevId);
      }
      return newPos;
   }

   /**
    * @param {ko.observable|ko.observableArray|Object} target
    * @param {String} id
    * @param {ko.sync.KeyFactory} [keyFactory] required for obsArray
    * @return {Object}
    */
   function findTargetDataSource(target, id, keyFactory) {
      if( ko.sync.isObservableArray(target) ) {
         var idx = ko.sync.findByKey(target, keyFactory, id);
         return target()[ idx ];
      }
      else if( ko.isObservable(target) ) {
         return target;
      }
      else {
         target.data || (target.data = {});
         return target.data;
      }
   }

   var CHANGE_CONVERSIONS = {
      added: 'create',
      updated: 'update',
      deleted: 'delete',
      moved: 'move'
   };

   function _changeAction(recListChangeType) {
      if( !_.has(CHANGE_CONVERSIONS, recListChangeType) ) {
         throw new Error('invalid action: '+recListChangeType);
      }
      return CHANGE_CONVERSIONS[recListChangeType];
   }

})(ko, jQuery);

