
(function(ko, $) { //todo remove jQuery dependency?
   "use strict";
   var undef;

   /**
    * Props:
    *    to      {string} one of 'store' or 'obs'
    *    action  {string} one of 'create', 'update', 'delete', or 'move'
    *    id      {String} the hashKey for the record being modified
    *    prevId  {string} required by move and add operations
    *    data    {object} required by add and update, the data to be applied in the change
    *    model   {ko.sync.Model}
    *    obs     {Object|ko.sync.observable} the knockout data being synced, which can be an observableArray (observed)
    *    rec     {ko.sync.Record} required when `to` is set to 'store'
    *    success {Function} a callback to invoke when (and if) the change is completed successfully
    *
    * @param props see above
    * @constructor
    */
   ko.sync.Change = function(props) {
      // declarations for the IDE
      /** @type {string} */
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
      _applyProps(this, props);

      /** @type {ko.sync.KeyFactory} */
      this.keyFactory = new ko.sync.KeyFactory(this.model, true);

      this.moved   = false; // used when update and move called on same record

      this.status  = 'pending';
      this.done    = $.Deferred();
      this.invalidated = false;
      this.retries = 0; // used by SyncController (see SyncController.js::pushUpdates)
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
      console.log('Change.run', this.key(), this.to, this.action); //debug
      var self = this, def;
      if( this.invalidated ) {
         def = $.Deferred().resolve(self.key());
      }
      else {
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
      }

      // time out all changes after 15 seconds
      setTimeout(function() {
         if( def.state() === 'pending' ) {
            def.reject('expired');
         }
      }, 15000);

      return def.pipe(function(id) {
         self.rec && self.rec.isDirty(false);
         if( self.success ) { self.success(self, id||self.key()); }
         return $.Deferred(function(def) { def.resolve(self, id||self.key()); }).promise();
      });
   };

   /**
    * When multiple changes are created for the same record, we reconcile those changes into a single event. Somebody
    * wins in each case.
    * @param change
    * @return {ko.sync.Change} this
    */
   ko.sync.Change.prototype.reconcile = function(change) {
      if( change.key() !== this.key() ) {
         throw new Error('reconciled change must have the same key ('+this.key()+' !== '+change.key()+')');
      }
      !this.invalidated && new ChangeMerge(this).visit(change);
      return this;
   };

   ko.sync.Change.prototype.invalidate = function() {
      this.invalidated = true;
   };

   ko.sync.Change.prototype.toString = function() {
      return this.key()+'['+this.action+' in '+this.to+']';
   };

   function sendToStore(change) {
      var model = change.model;
      var rec   = change.rec;
      var store = model.store;
      if( change.data ) { rec.updateAll(change.data); }
      switch(change.action) {
         case 'create':
            return store.create(model, rec).then(function(id) {
               change.rec.updateHashKey(id);
            });
         case 'update':
            return store.update(model, rec);
         case 'delete':
            return store.delete(model, rec);
         case 'move':
            return store.update(model, rec);
         default:
            throw new Error('invalid action: '+change.action);
      }
   }

   /**
    * @param {ko.sync.Change} change
    */
   function sendToObs(change) {
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
         var source = findTargetDataSource(target, id, change.keyFactory);
         ko.sync.Record.applyWithObservables(source, change.data, observedFields);
      }
      return id;
   }

   function _obsUpdate(change) {
      if( change.data ) {
         var source = findTargetDataSource(change.obs, change.key(), change.keyFactory);
         source && ko.sync.Record.applyWithObservables(source, change.data, change.model.observedFields());
         source && change.moved && _obsMove(change);
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

   function _applyProps(change, props, moreData) {
      if( change.data && props.data ) {
         _.extend(change.data, props.data);
      }
      else if( props.data ) {
         change.data = props.data;
      }
      _.extend(change, _.pick(props, ['to', 'action', 'prevId', 'model', 'rec', 'obs', 'success']), moreData);
   }

   function ChangeMerge(change) {
      this.change = change;
   }
   ChangeMerge.prototype.visit = function(visitor) {
      var visited = this.change;
      if( visited.to === visitor.to) {
         switch(visitor.action) {
            case 'create':
               return this.visitCreate(visitor);
            case 'update':
               return this.visitUpdate(visitor);
            case 'delete':
               return this.visitDelete(visitor);
            case 'move':
               return this.visitMove(visitor);
            default:
               throw new Error('invalid action: '+visited.action);
         }
      }
      else {
         //todo-perf see if data actually changed before applying the merge (can just invalidate if store/obs both report same change)
         //todo-merge apply merge as appropriate to the ChangeMerge activities
         switch(visitor.action) {
            case 'create':
               return this.visitReverseCreate(visitor);
            case 'update':
               return this.visitReverseUpdate(visitor);
            case 'delete':
               return this.visitReverseDelete(visitor);
            case 'move':
               return this.visitReverseMove(visitor);
            default:
               throw new Error('invalid action: '+visited.action);
         }
      }
   };
   ChangeMerge.prototype.visitCreate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // a second call to create will simply trump the original data provided
            // this should probably never happen
            _applyProps(visited, visitor);
            console.warn('sequential calls to create with same id; that probably isn\'t logical', visited.key());
            break;
         case 'update':
            // the data is updated but the create status is maintained
            _.extend(visited.data, visitor.data);
            break;
         case 'delete':
            // a deleted record cannot be created again
            console.warn('a deleted record cannot be recreated (build a new one)');
            break;
         case 'move':
            // promote status to create
            // just apply the new properties, the prevId should be the new moved location, so this is no worry
            // the data is merged by applyProps so that's no worry either
            _applyProps(visited, visitor);
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ChangeMerge.prototype.visitUpdate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            _.extend(visited.data, visitor.data);
            break;
         case 'update':
            _.extend(visited.data, visitor.data);
            break;
         case 'delete':
            // delete takes precedence, no change
            break;
         case 'move':
            // push the merged/updated change in both directions
            visited.data = _.extend(visited.data||{}, visitor.data);
            visited.moved  = true;
            visited.action = 'update';
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ChangeMerge.prototype.visitDelete = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // if it is created and then deleted before any sync takes place, then it's
            // as if it never existed in the first place
            visited.invalidate();
            break;
         case 'update':
            // delete wins
            _applyProps(visited, visitor);
            break;
         case 'delete':
            // delete wins
            break;
         case 'move':
            // delete wins
            _applyProps(visited, visitor);
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ChangeMerge.prototype.visitMove = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // create action is preserved, location is updated
            visited.prevId = visitor.prevId;
            visited.rec = visitor.rec;
            break;
         case 'update':
            // apply both directions
            _.extend(visited.data, visitor.data);
            visited.prevId = visitor.prevId;
            visited.moved  = true;
            break;
         case 'delete':
            // delete takes precedence
            break;
         case 'move':
            // second move wins
            visited.prevId = visitor.prevId;
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ChangeMerge.prototype.visitReverseCreate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // second create wins out, apply an update
            _applyProps(visited, visitor, {action: 'update'});
            break;
         case 'update':
            // create wins out and becomes an update
            _applyProps(visited, visitor, {action: 'update'});
            break;
         case 'delete':
            // assumed to be recreated, so delete loses
            _applyProps(visited, visitor);
            break;
         case 'move':
            // treat this the same as simultaneous update/move
            // updated by one source and moved by the other, apply updates in both directions
            visited.data   = _.extend(visited.data||{}, visitor.data);
            visited.moved  = true;
            visited.action = 'update';
            visited.to     = 'omni';
            console.warn('what happened here? tried to move a record which did not exist yet');
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ChangeMerge.prototype.visitReverseUpdate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // second update wins
            _applyProps(visited, visitor);
            break;
         case 'update':
            // second update wins
            _applyProps(visited, visitor);
            break;
         case 'delete':
            // delete wins
            break;
         case 'move':
            // updated by one source and moved by the other, apply updates in both directions
            visited.data   = _.extend(visited.data||{}, visitor.data);
            visited.moved  = true;
            visited.action = 'update';
            visited.to     = 'omni';
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ChangeMerge.prototype.visitReverseDelete = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // delete wins
            _applyProps(visited, visitor);
            break;
         case 'update':
            // delete wins
            _applyProps(visited, visitor);
            break;
         case 'delete':
            // nothing to do (deleted on both)
            visited.invalidate();
            break;
         case 'move':
            // delete wins
            _applyProps(visited, visitor);
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ChangeMerge.prototype.visitReverseMove = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            if( visited.to === 'store' ) {
               // tried to create record that already exists, just apply server updates
               _applyProps(visited, visitor);
            }
            else {
               // shouldn't be possible
               visited.invalidate();
               console.warn('what is going on here? client tried to move a record server had not created yet');
            }
            break;
         case 'update':
            // updated by one source and moved by the other, apply updates in both directions
            visited.prevId = visitor.prevId;
            visited.moved  = true;
            visited.action = 'update';
            visited.to     = 'omni';
            break;
         case 'delete':
            // delete wins
            break;
         case 'move':
            // second update wins
            _applyProps(visited, visitor);
            break;
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };

})(ko, jQuery);

