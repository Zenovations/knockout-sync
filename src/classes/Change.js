
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
      /** @type {string} */
      this.to     = undef;
      /* @type {string} */
      this.action = undef;
      /* @type {string} */
      this.prevId = undef;
      /* @type {Object} */
      this.data   = undef;
      /* @type {ko.sync.Model} */
      this.model  = undef;
      /* @type {ko.observable|ko.observableArray|Object} */
      this.obs    = undef;
      /* @type {ko.sync.Record} */
      this.rec    = undef;

      // apply the properties provided
      _.extend(this, _.pick(props, ['to', 'action', 'prevId', 'data', 'model', 'rec', 'obs']));
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

   ko.sync.Change.fromChangeList = function(to, model, changeData, target) {
      return new ko.sync.Change({
         model:  model,
         obs:    target,
         to:     to,
         action: changeData[0],
         rec:    changeData[1],
         prevId: changeData[2]
      });
   };

   /**
    * @param {Object} ctx  must contain keyFactory and cachedKeys
    * @return {jQuery.Deferred}
    */
   ko.sync.Change.prototype.run = function(ctx) {
      var self = this, def;
      switch(this.to) {
         case 'store':
            def = sendToStore(self);
            break;
         case 'obs':
            def = sendToObs(ctx, self);
            break;
         default:
            throw new Error('invalid destination: '+self.to);
      }
      return def.pipe(function(id) {
               return $.Deferred(function(def) { def.resolve(self, id); });
            });
   };

   function sendToStore(change) {
      var store = change.model.store;
      switch(change.action) {
         case 'create':
            return store.create(change.model, change.rec);
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
    * @param {Object} ctx
    * @param {ko.sync.Change} change
    */
   function sendToObs(ctx, change) {
      var res;
      switch(change.action) {
         case 'create':
            res = _obsCreate(ctx, change);
            break;
         case 'update':
            res = _obsUpdate(ctx, change);
            break;
         case 'delete':
            res = _obsDelete(ctx, change);
            break;
         case 'move':
            res = _obsMove(ctx, change);
            break;
         default:
            throw new Error('invalid action: '+change.action);
      }
      return $.Deferred().resolve(res);
   }

   function _obsCreate(ctx, change) {
      var observedFields = change.model.observedFields();
      var id     = change.key();
      var isList = ko.sync.isObservableArray(change.obs);
      var target = change.obs;
      if( isList ) {
         var sourceData = ko.sync.Record.applyWithObservables({}, change.data, observedFields);
         var pos = newPositionForRecord(ctx, target, id, change.prevId, true);
         if( pos < 0 ) {
            target.push(sourceData);
         }
         else {
            target.splice(pos, 0, sourceData);
         }
      }
      else {
         var source = findTargetDataSource(ctx, target, id);
         ko.sync.Record.applyWithObservables(source, change.data, observedFields);
      }
      return id;
   }

   function _obsUpdate(ctx, change) {
      var source = findTargetDataSource(ctx, change.obs, change.key());
      ko.sync.Record.applyWithObservables(source, change.data, change.model.observedFields());
   }

   function _obsDelete(ctx, change) {
      var pos = currentPositionForRecord(ctx, change.obs, change.key());
      if( pos > -1 ) {
         change.obs.splice(pos, 1);
      }
   }

   function _obsMove(ctx, change) {
      var id = change.key();
      var target = change.obs;
      var pos = currentPositionForRecord(ctx, target, id);
      var newPos = newPositionForRecord(ctx, target, id, change.prevId);
      if( pos > -1 && pos !== newPos ) {
         target.splice(newPos, 0, target.splice(pos, 1)[0]);
      }
   }

   function newPositionForRecord(ctx, obsArray, key, prevId, isNew) {
      var len = obsArray().length;
      var newLoc = -1;
      var oldLoc = isNew? -1 : currentPositionForRecord(ctx, obsArray, key);

      prevId instanceof ko.sync.RecordId && (prevId = prevId.hashKey());
      if( typeof(prevId) === 'string' ) {
         newLoc = currentPositionForRecord(ctx, obsArray, prevId);
         if( newLoc > -1 && oldLoc > -1 && newLoc < oldLoc ) {
            newLoc++;
         }
      }
      else if( typeof(prevId) === 'number' ) {
         newLoc = prevId < 0? len - prevId : prevId;
      }

      return newLoc;
   }

   function currentPositionForRecord(ctx, obsArray, key) {
      if( !ctx.cachedKeys || !ctx.cachedKeys[key] ) {
         cacheKeysForObsArray(ctx, obsArray);
      }
      return key in ctx.cachedKeys? ctx.cachedKeys[key] : -1;
   }

   /**
    * @param {Object} ctx
    * @param {ko.observable|Object} target
    * @param {String} id
    * @return {Object}
    */
   function findTargetDataSource(ctx, target, id) {
      if( ko.sync.isObservableArray(target) ) {
         return target()[ currentPositionForRecord(ctx, target, id) ];
      }
      else if( ko.isObservable(target) ) {
         return target;
      }
      else {
         target.data || (target.data = {});
         return target.data;
      }
   }

   function cacheKeysForObsArray(ctx, obsArray) {
      var cache = ctx.cachedKeys = {}, f = ctx.keyFactory;
      _.each(ko.utils.unwrapObservable(obsArray), function(v, i) {
         cache[ f.make(v) ] = i;
      });
   }

})(ko, jQuery);

