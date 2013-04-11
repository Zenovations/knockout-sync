/*! ArrayWatcher.js
 *************************************/
(function ($) {
   "use strict";
   ko.sync.ArrayWatcher = function(obsArray, store) {
      var rootSub, preSub, oldValue, subs = [];

      preSub = obsArray.subscribe(function(prevValue) {
         oldValue = ko.sync.unwrapAll(prevValue);
      }, undefined, 'beforeChange');

      // watch for replacement of the entire object
      rootSub = obsArray.subscribe(function(newValue) {
         var changes = findChanges(store, oldValue, newValue);
         // invoke the callback
         _.each(subs, function(fn) {
            fn(changes);
         });
      });

      this.dispose = function() {
         rootSub && rootSub.dispose();
         preSub && preSub.dispose();
      };

      this.add = function(fn) {
         subs.push(fn);
      }
   };

/**
 * Assumptions:
 *   - fields in b not in a are added
 *   - fields in a not in b are deleted
 *   - object literals are compared using _.isEqual
 *   - objects with a .equals method are compared using .equals
 *   - other fields are compared with ===
 *
 * @param {ko.sync.Store} store
 * @param {Array} a the original
 * @param {Array} b the new
 * @return {object}
 */
function findChanges(store, a, b) {
   var out = {};
   compareArrays(store, a, b, function(key, aVal, bVal, aPrev, bPrev, i) {
      if( !_.isEqual(aVal, bVal) ) {
         if( aVal === undefined ) {
            out[key] = { status: 'create', data: bVal, prevId: bPrev, idx: i };
         }
         else if( bVal === undefined ) {
            out[key] = { status: 'delete' };
         }
         else {
            out[key] = { status: 'update', data: bVal, prevId: bPrev, idx: i };
         }
      }
      else if( !_.isEqual(aPrev, bPrev) ) {
         out[key] = { status: 'move', prevId: bPrev, idx: i };
      }
   });
   return out;
}

/**
 * @param {ko.sync.Store} store
 * @param data
 * @param {Array} otherData
 * @param {Function} fn
 */
function compareArrays(store, data, otherData, fn) {
   // we index otherData but not the original data, this means we only iterate
   // each set exactly once (plus one iteration of all the added elmeents in otherData)
   var prevKey = null, bSet = indexArray(store, otherData), ct = 0;
   _.each(data||[], function(av) {
      var k = store.getKey(av), bv = bSet[k];
      fn(k, av, bv && bv.value, prevKey, bv && bv.prevKey, ct++);
      prevKey = k;
      delete bSet[k];
   });
   _.each(bSet, function(v,k) {
      fn(k, undefined, v.value, undefined, v.prevKey, ct++);
   });
}

function indexArray(store, data) {
   var out = {}, prevKey = null;
   ko.utils.arrayForEach(data||[], function(v) {
      var k = store.getKey(v);
      out[k] = {value: v, prevKey: prevKey};
      prevKey = k;
   });
   return out;
}
})(jQuery);