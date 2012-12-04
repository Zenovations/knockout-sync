
(function(ko, $){
   "use strict";

   var TestData = ko.sync.TestData;
   var Change = ko.sync.Change;

   module('Change.reconcile');

   test('#reconcile, invalidated record', function() {
      var change = _change();
      var expect = _result(change, {invalidated: true});
      change.invalidate();
      change.reconcile(_change({action: 'update'}));
      change.reconcile(_change({action: 'delete'}));
      deepEqual(_result(change), expect, 'should not be changed');
   });

   var actions = ['create', 'update', 'delete', 'move'];
   var sources = ['obs', 'store'];
   var res = [];
   _.each(sources, function(destA) {
      _.each(sources, function(destB) {
         _.each(actions, function(actionA) {
            _.each(actions, function(actionB) {
               test(_key(destA, destB, actionA, actionB), newTest(destA, destB, actionA, actionB));
            })
         });
      });
   });

   function newTest(destA, destB, actionA, actionB) {
      return function() {
         var a = _change(_opts(OPTS_A, destA, actionA), 1);
         var b = _change(_opts(OPTS_B, destB, actionB), 1);
         var exp = _expected(a, b);
         if( shouldThrowError(destA, destB, actionA, actionB) ) {
            raises(function() {a.reconcile(b);}, Error, 'should throw an error');
         }
         else {
            a.reconcile(b);
            deepEqual(_result(a), exp);
         }
      }
   }

   function _result(change, moreData) {
      return _.extend(_.pick(change, ['to', 'action', 'prevId', 'success', 'invalidated', 'data', 'moved']), {key: change.key()}, moreData);
   }

   function _opts(base, dest, action) {
      return _.extend({}, base[action], {action: action, to: dest});
   }

   function _expected(changeA, changeB) {
      return new ExpectedVisitor(changeA).visit(changeB);
   }

   var OPTS_A, OPTS_B;
   (function() {
      var recA = TestData.rec(1);
      recA.set('stringOptional', 'hello');

      var recB = TestData.rec(1);
      recB.set('stringOptional', 'bye');

      OPTS_A = {
         'create': { rec: recA, data: recA.getData(true) },
         'update': { rec: recA, data: recA.getData(true) },
         'delete': { rec: recA },
         'move':   { rec: recA, data: recA.getData(true), prevId: null }
      };

      OPTS_B = {
         'create': { rec: recB, data: recB.getData(true) },
         'update': { rec: recB, data: recB.getData(true) },
         'delete': { rec: recB },
         'move':   { rec: recB, data: recB.getData(true), prevId: 'record-3' }
      };
   })();

   function _key(srcA, srcB, actionA, actionB) {
      return srcA+'.'+actionA+' / '+srcB+'.'+actionB;
   }

   function _change(opts, id) {
      if( typeof(opts) === 'number' ) {
         id = opts;
         opts = null;
      }
      id || (id = 5);
      var model = getModelWithStore();
      var rec = TestData.rec(id, opts && opts.data, model);
      return new Change(_.extend({
         to:     'store',
         action: 'create',
         prevId: null,
         data:   null,
         model:  model,
         rec:    rec,
         obs:    opts && opts.obs? null : rec.applyData()
      }, opts));
   }

   function _runChangeWithTimeout(opts, id) {
      var def = _change(opts, id).run({keyFactory: getKeyFactory()});
      TestData.expires(def);
      return def;
   }

   function getKeyFactory() {
      return new ko.sync.KeyFactory(TestData.model(), true);
   }

   function getModelWithStore() {
      return TestData.model({store: getFakeStore()});
   }

   function getFakeStore(recs) {
      return new TestData.TestStore(recs || TestData.recs(5));
   }

   function shouldThrowError(destA, destB, actionA, actionB) {
      return false;
   }

   function ExpectedVisitor(change) {
      this.change = change;
   }
   ExpectedVisitor.prototype.visit = function(visitor) {
      var visited = this.change;
      if( visited.to === visitor.to ) {
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
   ExpectedVisitor.prototype.visitCreate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // data merged
            return _result(visitor, {data: _.extend(visited.data, visitor.data)});
            break;
         case 'update':
            // data merged, promoted to create
            return _result(visited, {data: _.extend(visited.data, visitor.data)});
         case 'delete':
            // no change, cannot create a record after deleting it
            return _result(visited);
         case 'move':
            // promoted to create, prevId assumed to be provided in the create operation so complete override
            return _result(visitor);
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ExpectedVisitor.prototype.visitUpdate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // applied to create, create status preserved
            return _result(visited, {data: _.extend(visited.data, visitor.data)});
         case 'update':
            // data is merged with both changes
            return  _result(visited, {data: _.extend(visited.data, visitor.data)});
         case 'delete':
            // delete preserved, no change
            return _result(visited);
         case 'move':
            // promoted to update, prevId preserved, data merged
            return _result(visited, {action: 'update', moved: true, data: _.extend(visited.data, visitor.data)});
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ExpectedVisitor.prototype.visitDelete = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // invalidates the change; basically an undo operation
            return _result(visited, {invalidated: true});
         case 'update':
            // overrides the update
            return _result(visitor, {data: visited.data});
         case 'delete':
            // no change
            return _result(visited);
         case 'move':
            // overrides the move
            return _result(visitor, {data: visited.data});
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ExpectedVisitor.prototype.visitMove = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // prevId is updated to new value, preserve create status
            return _result(visited, {prevId: visitor.prevId});
         case 'update':
            // sets the 'moved' attribute but preserves update status
            return _result(visited, {prevId: visitor.prevId, moved: true});
            break;
         case 'delete':
            // no change, delete wins out
            return _result(visited);
         case 'move':
            // changes to prevId to new location
            return _result(visited, {prevId: visitor.prevId});
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ExpectedVisitor.prototype.visitReverseCreate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // second create wins out and updates the first
            return _result(visitor, {action: 'update'});
         case 'update':
            // create wins out and becomes an update
            return _result(visitor, {action: 'update'});
         case 'delete':
            // assumed to be recreated so delete loses
            return _result(visitor);
         case 'move':
            // treat this the same as simultaneous update/move
            return _result(visited, {to: 'omni', action: 'update', moved: true, data: _.extend(visited.data, visitor.data)});
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ExpectedVisitor.prototype.visitReverseUpdate = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // second update wins, since it exists, make it an update
            return _result(visitor);
         case 'update':
            // second update wins
            return _result(visitor);
         case 'delete':
            // delete wins
            return _result(visited);
         case 'move':
            return _result(visited, {to: 'omni', action: 'update', prevId: visited.prevId, moved: true, data: _.extend(visited.data, visitor.data)});
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ExpectedVisitor.prototype.visitReverseDelete = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            // delete wins
            return _result(visitor, {data: visited.data});
         case 'update':
            // delete wins
            return _result(visitor, {data: visited.data});
         case 'delete':
            // both deleted so nothing to do
            return _result(visited, {invalidated: true});
         case 'move':
            // delete wins
            return _result(visitor, {data: visited.data});
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };
   ExpectedVisitor.prototype.visitReverseMove = function(visitor) {
      var visited = this.change;
      switch(visited.action) {
         case 'create':
            if( visited.to === 'store' ) {
               // client tried to create on store, but already exists, move as appropriate
               return _result(visitor);
            }
            else {
               // client tried to move a record but it was just created, move attempt is invalid
               return _result(visited, {invalidated: true});
            }
         case 'update':
            // merge and apply to both
            return _result(visited, {to: 'omni', action: 'update', prevId: visitor.prevId, moved: true});
         case 'delete':
            // delete wins
            return _result(visited);
         case 'move':
            // second move wins
            return _result(visitor);
         default:
            throw new Error('invalid action: '+visited.action);
      }
   };


})(ko, jQuery);

