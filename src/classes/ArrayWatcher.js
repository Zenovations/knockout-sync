/*! ArrayWatcher.js
 *************************************/
(function () {
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
   var out = {}, prevKey = null, i = 0;
   compareArrays(store, a, b, function(key, newVal, oldVal, oldIdx) {
      if( !_.isEqual(oldVal, newVal) ) {
         if( oldVal === undefined ) {
            out[key] = { status: 'create', data: newVal, prevId: prevKey, idx: i };
         }
         else if( newVal === undefined ) {
            out[key] = { status: 'delete' };
         }
         else {
            out[key] = { status: 'update', data: newVal, prevId: prevKey, idx: i };
         }
      }
      else if( oldIdx !== i ) {
         out[key] = { status: 'move', prevId: prevKey, idx: i };
      }
      if( newVal !== undefined ) {
         i++;
         prevKey = key;
      }
      if( out[key] ) { console.log('changed', key, out[key].status, out[key].idx); }//debug
   });
   return out;
}

/**
 * @param {ko.sync.Store} store
 * @param {Array} oldData
 * @param {Array} newData
 * @param {Function} fn
 */
function compareArrays(store, oldData, newData, fn) {
   // we index otherData but not the original data, this means we only iterate
   // each set exactly once (plus one iteration of all the added elmeents in otherData)
   var prevKey = null, newIndex = indexArray(store, newData), i = 0;
   _.each(oldData||[], function(oldVal) {
      var k = store.getKey(oldVal), newRec = newIndex[k] || {};
      fn(k, newRec.value, oldVal, i++);
      prevKey = k;
      delete newIndex[k];
   });
   _.each(newIndex, function(v,k) {
      fn(k, v.value, undefined, -1);
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
})();