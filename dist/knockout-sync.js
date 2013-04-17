/*! Knockout Sync - v0.1.0 - 2013-04-16
* https://github.com/katowulf/knockout-sync
* Copyright (c) 2013 Michael "Kato" Wulf; Licensed MIT, GPL */


(function(){var e=!1,t=/xyz/.test(function(){xyz})?/\b_super\b/:/.*/;this.Class=function(){},Class.extend=function(n){function o(){!e&&this.init&&this.init.apply(this,arguments)}var r=this.prototype;e=!0;var i=new this;e=!1;for(var s in n)i[s]=typeof n[s]=="function"&&typeof r[s]=="function"&&t.test(n[s])?function(e,t){return function(){var n=this._super;this._super=r[e];var i=t.apply(this,arguments);return this._super=n,i}}(s,n[s]):n[s];return o.prototype=i,o.prototype.constructor=o,o.extend=arguments.callee,o}})(),function(e){e||(e=window.console={log:function(e,t,n,r,i){},info:function(e,t,n,r,i){},warn:function(e,t,n,r,i){},error:function(e,t,n,r,i){}}),Function.prototype.bind||(Function.prototype.bind=function(e){var t=this,n=Array.prototype.slice.call(arguments,1);return function(){return t.apply(e,Array.prototype.concat.apply(n,arguments))}}),typeof e.log=="object"&&(e.log=Function.prototype.call.bind(e.log,e),e.info=Function.prototype.call.bind(e.info,e),e.warn=Function.prototype.call.bind(e.warn,e),e.error=Function.prototype.call.bind(e.error,e)),"group"in e||(e.group=function(t){e.info("\n------------\n"+t+"\n------------")}),"groupEnd"in e||(e.groupEnd=function(){}),"time"in e||function(){var t={};e.time=function(e){t[e]=(new Date).getTime()},e.timeEnd=function(n){var r=(new Date).getTime(),i=n in t?r-t[n]:0;e.info(n+": "+i+"ms")}}()}(window.console),function(e){"use strict";if(!e._){var t=Array.prototype,n={},r=t.slice,i=t.push,s=Object.prototype.hasOwnProperty,o=t.forEach,u=Array.isArray,a=Object.prototype.toString,f=t.map,l=t.concat,c=t.indexOf,h=e._={},p=h.each=function(e,t,r){if(e==null)return;if(o&&e.forEach===o)e.forEach(t,r);else if(e.length===+e.length){for(var i=0,s=e.length;i<s;i++)if(t.call(r,e[i],i,e)===n)return}else for(var u in e)if(e.hasOwnProperty(u)&&t.call(r,e[u],u,e)===n)return},d=function(e,t,n,r){if(e===t)return e!==0||1/e==1/t;if(e==null||t==null)return e===t;var i=a.call(e);if(i!=a.call(t))return!1;switch(i){case"[object String]":return e==String(t);case"[object Number]":return e!=+e?t!=+t:e==0?1/e==1/t:e==+t;case"[object Date]":case"[object Boolean]":return+e==+t;case"[object RegExp]":return e.source==t.source&&e.global==t.global&&e.multiline==t.multiline&&e.ignoreCase==t.ignoreCase}if(typeof e!="object"||typeof t!="object")return!1;var s=n.length;while(s--)if(n[s]==e)return r[s]==t;n.push(e),r.push(t);var o=0,u=!0;if(i=="[object Array]"){o=e.length,u=o==t.length;if(u)while(o--)if(!(u=d(e[o],t[o],n,r)))break}else{var f=e.constructor,l=t.constructor;if(f!==l&&!(h.isFunction(f)&&f instanceof f&&h.isFunction(l)&&l instanceof l))return!1;for(var c in e)if(h.has(e,c)){o++;if(!(u=h.has(t,c)&&d(e[c],t[c],n,r)))break}if(u){for(c in t)if(h.has(t,c)&&!(o--))break;u=!o}}return n.pop(),r.pop(),u};h.isEqual=function(e,t){return d(e,t,[],[])},h.isEmpty=function(e){if(e==null)return!0;if(h.isArray(e)||h.isString(e))return e.length===0;for(var t in e)if(h.has(e,t))return!1;return!0},h.isArray=u||function(e){return a.call(e)=="[object Array]"},h.isObject=function(e){return e===Object(e)},p(["Arguments","Function","String","Number","Date","RegExp"],function(e){h["is"+e]=function(t){return a.call(t)=="[object "+e+"]"}}),h.isArguments(arguments)||(h.isArguments=function(e){return!!e&&!!h.has(e,"callee")}),typeof /./!="function"&&(h.isFunction=function(e){return typeof e=="function"}),h.isFinite=function(e){return isFinite(e)&&!isNaN(parseFloat(e))},h.isNaN=function(e){return h.isNumber(e)&&e!=+e},h.isBoolean=function(e){return e===!0||e===!1||a.call(e)=="[object Boolean]"},h.isNull=function(e){return e===null},h.isUndefined=function(e){return e===void 0},h.has=function(e,t){return s.call(e,t)},h.mixin=function(e){p(e,function(e,t){h[t]=e})},h.toArray=function(e){return e?h.isArray(e)?r.call(e):e.length===+e.length?h.map(e,h.identity):h.values(e):[]},h.map=h.collect=function(e,t,n){var r=[];return e==null?r:f&&e.map===f?e.map(t,n):(p(e,function(e,i,s){r[r.length]=t.call(n,e,i,s)}),r)},h.pick=function(e){var n={},i=l.apply(t,r.call(arguments,1));return p(i,function(t){t in e&&(n[t]=e[t])}),n},h.debounce=function(e,t,n){var r,i;return function(){var s=this,o=arguments,u=function(){r=null,n||(i=e.apply(s,o))},a=n&&!r;return clearTimeout(r),r=setTimeout(u,t),a&&(i=e.apply(s,o)),i}},h.extend=function(e){return p(r.call(arguments,1),function(t){if(t)for(var n in t)e[n]=t[n]}),e},h.indexOf=function(e,t,n){if(e==null)return-1;var r=0,i=e.length;if(n){if(typeof n!="number")return r=h.sortedIndex(e,t),e[r]===t?r:-1;r=n<0?Math.max(0,i+n):n}if(c&&e.indexOf===c)return e.indexOf(t,n);for(;r<i;r++)if(e[r]===t)return r;return-1},h.sortBy=function(e,t,n){var r=v(t);return h.pluck(h.map(e,function(e,t,i){return{value:e,index:t,criteria:r.call(n,e,t,i)}}).sort(function(e,t){var n=e.criteria,r=t.criteria;if(n!==r){if(n>r||n===void 0)return 1;if(n<r||r===void 0)return-1}return e.index<t.index?-1:1}),"value")};var v=function(e){return h.isFunction(e)?e:function(t){return t[e]}};h.map=h.collect=function(e,t,n){var r=[];return e==null?r:f&&e.map===f?e.map(t,n):(p(e,function(e,i,s){r[r.length]=t.call(n,e,i,s)}),r)},h.pluck=function(e,t){return h.map(e,function(e){return e[t]})}}}(window),function(e){function t(e,t){function f(e,t,s){var f=[e,t];s&&Array.prototype.push.apply(f,s),r++,t!=="resolved"&&u++,n.notify.apply(n,f),o[e]=f.slice(1),r===i&&(a&&clearTimeout(a),u?n.reject(o):n.resolve(o))}var n=_.Deferred(),r=0,i=t.length,s=!1,o=[],u=0,a;return e&&(a=setTimeout(function(){s=!0,_.each(t,function(e,t){e&&typeof e=="object"&&e.promise&&e.state&&e.state()==="pending"&&f(t,"expired")})},e)),i?_.each(t,function(e,t){setTimeout(function(){_.when(e).then(function(){s||f(t,"resolved",_.toArray(arguments))},function(){s||f(t,"rejected",_.toArray(arguments))})},0)}):n.resolve(o),n.promise()}e._.mixin({move:function(e,t,n){if(t===n)return;e.splice(n,0,e.splice(t,1)[0])},whenAll:function(){return t(0,_.toArray(arguments))},whenAllExpires:function(e){return t(e,_.toArray(arguments).slice(1))}})}(window),function(e){function g(e){var t=m[e]={};return f(e.split(/\s+/),function(e){t[e]=!0}),t}var t={},n=Array.prototype,r=Object.prototype,i=r.hasOwnProperty,s=r.toString,o=n.forEach,u=n.indexOf,a=n.slice,f=function(e,n,r){var s,u,a;if(!e)return;if(o&&e.forEach===o)e.forEach(n,r);else if(e.length===+e.length){for(u=0,a=e.length;u<a;u++)if(u in e&&n.call(r,e[u],u,e)===t)return}else for(s in e)if(i.call(e,s)&&n.call(r,e[s],s,e)===t)return},l=function(e){return!!(e&&e.constructor&&e.call&&e.apply)},c=function(e){return f(a.call(arguments,1),function(t){var n;for(n in t)t[n]!==void 0&&(e[n]=t[n])}),e},h=function(e,t,n){var r;if(t){if(u)return u.call(t,e,n);r=t.length,n=n?n<0?Math.max(0,r+n):n:0;for(;n<r;n++)if(n in t&&t[n]===e)return n}return-1},p={};f("Boolean Number String Function Array Date RegExp Object".split(" "),function(e,t){p["[object "+e+"]"]=e.toLowerCase()});var d=function(e){return e==null?String(e):p[s.call(e)]||"object"},v={},m={};v.Callbacks=function(e){e=typeof e=="string"?m[e]||g(e):c({},e);var t,n,r,i,s,o,u=[],a=!e.once&&[],l=function(f){t=e.memory&&f,n=!0,o=i||0,i=0,s=u.length,r=!0;for(;u&&o<s;o++)if(u[o].apply(f[0],f[1])===!1&&e.stopOnFalse){t=!1;break}r=!1,u&&(a?a.length&&l(a.shift()):t?u=[]:p.disable())},p={add:function(){if(u){var n=u.length;(function o(t){f(t,function(t){var n=d(t);n==="function"?(!e.unique||!p.has(t))&&u.push(t):t&&t.length&&n!=="string"&&o(t)})})(arguments),r?s=u.length:t&&(i=n,l(t))}return this},remove:function(){return u&&f(arguments,function(e){var t;while((t=h(e,u,t))>-1)u.splice(t,1),r&&(t<=s&&s--,t<=o&&o--)}),this},has:function(e){return h(e,u)>-1},empty:function(){return u=[],this},disable:function(){return u=a=t=undefined,this},disabled:function(){return!u},lock:function(){return a=undefined,t||p.disable(),this},locked:function(){return!a},fireWith:function(e,t){return t=t||[],t=[e,t.slice?t.slice():t],u&&(!n||a)&&(r?a.push(t):l(t)),this},fire:function(){return p.fireWith(this,arguments),this},fired:function(){return!!n}};return p},v.Deferred=function(e){var t=[["resolve","done",v.Callbacks("once memory"),"resolved"],["reject","fail",v.Callbacks("once memory"),"rejected"],["notify","progress",v.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return v.Deferred(function(n){f(t,function(t,r){var s=t[0],o=e[r];i[t[1]](l(o)?function(){var e;try{e=o.apply(this,arguments)}catch(t){n.reject(t);return}e&&l(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[s!=="notify"?"resolveWith":s+"With"](this===i?n:this,[e])}:n[s])}),e=null}).promise()},promise:function(e){return e!=null?c(e,r):r}},i={};return r.pipe=r.then,f(t,function(e,s){var o=e[2],u=e[3];r[e[1]]=o.add,u&&o.add(function(){n=u},t[s^1][2].disable,t[2][2].lock),i[e[0]]=o.fire,i[e[0]+"With"]=o.fireWith}),r.promise(i),e&&e.call(i,i),i},v.when=function(e){var t=0,n=d(e)==="array"&&arguments.length===1?e:a.call(arguments),r=n.length;d(e)==="array"&&e.length===1&&(e=e[0]);var i=r!==1||e&&l(e.promise)?r:0,s=i===1?e:v.Deferred(),o=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?a.call(arguments):r,n===u?s.notifyWith(t,n):--i||s.resolveWith(t,n)}},u,f,c;if(r>1){u=new Array(r),f=new Array(r),c=new Array(r);for(;t<r;t++)n[t]&&l(n[t].promise)?n[t].promise().done(o(t,c,n)).fail(s.reject).progress(o(t,f,u)):--i}return i||s.resolveWith(c,n),s.promise()},typeof module!="undefined"&&module.exports?module.exports=v:typeof e._!="undefined"?e._.mixin(v):e._=v}(this),function(e){"use strict";var t;e.sync={stores:{},isObservableArray:function(t){return typeof t=="function"&&!!e.isObservable(t)&&!!t.splice&&_.isArray(t())},unwrapAll:function(t){var n=e.utils.unwrapObservable;t=n(t);var r=_.isArray(t)?[]:{};return _.each(t,function(t,i){t=n(t),r[i]=_.isObject(t)?e.sync.unwrapAll(t):t}),r},prepStoreData:function(t,n){return t?_.pick(e.sync.unwrapAll(t),n.getFieldNames()):t},applyUpdates:function(t,n){if(n){var r=e.isObservable(t),i=e.utils.extend({},e.utils.unwrapObservable(t)||{});_.each(n,function(t,n){e.isObservable(i[n])?i[n](t):i[n]=t}),r?t(i):t=i}return t},watchRecord:function(t,n,r){return e.isObservable(n)?n.watchChanges(t,r):e.sync.watchFields(t,n,r)},watchFields:function(t,n,r){var i=[],s=e.utils.unwrapObservable(n)||{};return _.each(t.getFieldNames(),function(t){var o=s[t];o&&e.isObservable(o)&&(e.sync.isObservableArray(o)?i.push(o.subscribe(r.bind(null,n))):i.push(o.subscribe(r.bind(null,n))))}),{dispose:function(){_.each(i,function(e){e.dispose()})}}},isEqual:function(t,n,r){return!n||!r?n===r:n===r||_.isEqual(_.pick(e.sync.unwrapAll(n),t),_.pick(e.sync.unwrapAll(r),t))}},e.extenders.sync=function(t,n){n=e.utils.extend({},n instanceof e.sync.Store?{store:n}:n);var r=n.store;if(r instanceof e.sync.Store)return e.sync.isObservableArray(t)?(t.crud=new e.sync.CrudArray(t,r,n.factory),t.crud.read()):(t.crud=new e.sync.Crud(t,r),n.key?t.crud.read(n.key):_.isObject(e.utils.unwrapObservable(t))&&t.crud.create()),t;throw new Error("Must declare a store to sync any observable")},e.observable.fn.watchChanges=function(n,r){var i,s,o=null,u;return s=this.subscribe(function(t){o=e.sync.unwrapAll(t)},t,"beforeChange"),i=this.subscribe(function(t){var i=e.sync.unwrapAll(t);e.sync.isEqual(n.getFieldNames(),i,o)||r(t)}),u=e.sync.watchFields(n,this,r),{dispose:function(){i&&i.dispose(),s&&s.dispose(),u&&u.dispose()}}},e.observableArray.fn.watchChanges=function(t,n){return this.watcher?this.watcher.add(n):(this.watcher=new e.sync.ArrayWatcher(this,t),this.watcher.add(n)),this.watcher}}(window.ko),function(){"use strict";function e(e,n,r){var i={},s=null,o=0,u=e.getFieldNames();return t(e,n,r,function(e,t,n,r){ko.sync.isEqual(u,n,t)?r!==o&&(i[e]={status:"move",prevId:s,idx:o}):n===undefined?i[e]={status:"create",data:t,prevId:s,idx:o}:t===undefined?i[e]={status:"delete"}:i[e]={status:"update",data:t,prevId:s,idx:o},t!==undefined&&(o++,s=e)}),i}function t(e,t,r,i){var s=null,o=n(e,r),u=0;_.each(t||[],function(t){var n=e.getKey(t),r=o[n]||{};i(n,r.value,t,u++),s=n,delete o[n]}),_.each(o,function(e,t){i(t,e.value,undefined,-1)})}function n(e,t){var n={},r=null;return ko.utils.arrayForEach(t||[],function(t){var i=e.getKey(t);n[i]={value:t,prevKey:r},r=i}),n}ko.sync.ArrayWatcher=function(t,n){var r,i,s,o=[],u={};i=t.subscribe(function(e){s=ko.sync.unwrapAll(e)},undefined,"beforeChange");var a=function(e){_.each(o,function(t){t(e)})},f=function(e){u[n.getKey(e)]=ko.sync.watchRecord(n,e,function(e){var t={};t[n.getKey(e)]={status:"update",data:e},a(t)})};r=t.subscribe(function(t){var r=e(n,s,t);_.each(r,function(e,t){switch(e.status){case"create":f(e.data);break;case"delete":u[t]&&(u[t].dispose(),delete u[t]);break;default:}}),!_.isEmpty(r)&&a(r)}),_.each(t()||[],f),this.dispose=function(){r&&r.dispose(),i&&i.dispose(),_.each(u,function(e){e.dispose()})},this.add=function(e){return o.push(e),this}.bind(this)}}(),function(e){"use strict";e.sync.Crud=function(e,t){this.observable=e,this.store=t,this.ready=_.Deferred().resolve()},e.utils.extend(e.sync.Crud.prototype,{create:function(t){return this._then(function(){t&&e.sync.applyUpdates(this.observable,t);var n=e.sync.prepStoreData(this.observable,this.store);return _.when(this.store.create(n)).done(function(e){this.key=e,this._sync()}.bind(this))})},read:function(e){return this._then(function(){return this.key=e,_.when(this.store.read(e)).done(function(e){this._change(this.observable,e),this._sync()}.bind(this))})},update:function(t){return this._then(function(){t&&this.observable(e.utils.extend(this.observable(),t));var n=e.sync.prepStoreData(this.observable,this.store);return _.when(this.store.update(this.key,n))})},"delete":function(){return this._then(function(){return _.when(this.store.delete(this.key))})},_sync:function(){this.store.on("create update delete",this.key,this._change.bind(this)),this.observable.watchChanges(this.store,this._local.bind(this))},_change:function(t,n){e.sync.isEqual(this.store.getFieldNames(),this.observable,n)||e.sync.applyUpdates(this.observable,n)},_local:function(t){this.store.update(this.key,e.sync.prepStoreData(t,this.store))},_then:function(e){return e=e.bind(this),this.ready=this.ready.then(function(){var t=_.Deferred();return _.when(e()).always(t.resolve),t}),this}})}(window.ko),function(e){"use strict";function n(t,n,r){return r?!e.sync.isEqual(t,n,r):!1}function r(e){var t=setTimeout(e.resolve,1e3),n=_.debounce(e.resolve,100),r=!0;return function(){t&&(clearTimeout(t),t=null),r&&(n(),r=e.state()==="pending")}}var t;e.sync.CrudArray=function(t,n,r){this.obs=t,this.store=n,this._map=new e.sync.KeyMap(n,t),this.factory=r||new e.sync.Factory(n),this.ready=_.Deferred().resolve(),this._synced=!1,this.subs=[]},e.utils.extend(e.sync.CrudArray.prototype,{create:function(e){return this._then(function(){var t=0;return _.isArray(e)||(e=e?[e]:[]),_.each(e,function(e){this._create(this.store.getKey(e),e)>=0&&t++}.bind(this)),t})},read:function(){return this._synced?this.ready:this._then(function(){var e=_.Deferred(),t=r(e);return this.store.on("create",function(e,n,r,i){this._create(e,n,i),t()}.bind(this)),this.store.on("update",this._update.bind(this)),this.store.on("delete",this._delete.bind(this)),this.obs.watchChanges(this.store,this._local.bind(this)),e})},update:function(e,t){return this._then(function(){return this._update(e,t)>=0?e:(console.warn("CrudArray::update - invalid key (not in local data)",e),!1)})},"delete":function(e){return this._then(function(){var t=this._map.indexOf(e);return t>-1?this.obs.splice(t,1):!1})},dispose:function(){_.each(this.subs,function(e){e.dispose()})},_create:function(e,t,n){var r=this._map.indexOf(e),i=this._map.indexOf(n);if(r<0){var s=this.factory.make(e,t);return n===null||i>=0?(this.obs.splice(i+1,0,s),i+1):this.obs.push(s)}return this._update(e,t),-1},_update:function(t,r){var i=this._map.indexOf(t),s;if(i>=0){s=this.obs()[i];if(n(this.store.getFieldNames(),s,r)){var o=e.sync.applyUpdates(s,r);e.isObservable(o)||this.obs.splice(i,1,o)}}return i},_delete:function(e){var t=this._map.indexOf(e);t>=0&&this.obs.splice(t,1)},_local:function(t){_.each(t,function(t,n){switch(t.status){case"create":this.store.create(e.sync.prepStoreData(t.data,this.store));break;case"update":this.store.update(n,e.sync.prepStoreData(t.data,this.store));break;case"delete":this.store.delete(n);break;case"move":break;default:throw new Error("Invalid change status: "+t.status)}}.bind(this))},_then:function(e){return e=e.bind(this),this.ready=this.ready.then(function(){var t=_.Deferred();return _.when(e()).always(t.resolve),t}),this}})}(window.ko),function(){"use strict";ko.sync.Factory=Class.extend({init:function(e,t){this.store=e,this.opts=t||{}},make:function(e,t){var n=_.pick(t,this.store.getFieldNames());return this.opts.observeFields&&ko.utils.arrayForEach(this.opts.observeFields,function(e){n[e]=_.isArray(n[e])?ko.observableArray(n[e]):ko.observable(n[e])}),this.opts.observe?ko.observable(n):n}})}(),function(){"use strict";ko.sync.KeyMap=function(e,t){this._subs=[],this._idx={},this._init(e,t)},ko.utils.extend(ko.sync.KeyMap.prototype,{indexOf:function(e){return e&&this.hasKey(e)?this._idx[e]:-1},hasKey:function(e){return _.has(this._idx,e)},_changed:function(e){var t=this._idx;_.each(e,function(e,n){switch(e.status){case"delete":delete t[n];break;case"create":case"update":case"move":t[n]=e.idx;break;default:throw new Error("Invalid change status: "+e.status)}})},_init:function(e,t){_.each(ko.sync.unwrapAll(t),function(t,n){this._idx[e.getKey(t)]=n}),this._subs.push(t.watchChanges(e,this._changed.bind(this)))},dispose:function(){_.each(this._subs,function(e){e.dispose()}),this._idx=null,this._subs=null}})}(),function(e){"use strict";e.sync.Store=Class.extend({getKey:function(e){throw new Error("Implementations must declare getKey method")},getFieldNames:function(){throw new Error("Implementations must declare getFieldNames method")},create:function(e){throw new Error("Implementations must declare create method")},read:function(e){throw new Error("Implementations must declare read method")},update:function(e,t){throw new Error("Implementations must declare update method")},"delete":function(e){throw new Error("Implementations must declare delete method")},on:function(e,t,n){throw new Error("Implementations must declare on events for add, remove, and change")},dispose:function(){throw new Error("Implementations must declare dispose method")}})}(window.ko),function(){"use strict";function t(e,t,n,r,i){if(r===null)return r;var s=_.extend({},r);return s[e]=n,t&&(s[t]=i),s}function n(t,n,r){var i=_.extend({},r);return n&&n!==".priority"&&(i[".priority"]=i[n]===e?null:i[n],delete i[n]),delete i[t],i}function r(e){switch(e){case"create":return"child_added";case"update":return"child_changed";case"delete":return"child_removed";default:throw new Error("Invalid event type: "+e)}}function i(e,n,r,i){var s=e.on("value",function(e){var s=t(n,r,e.name(),e.val(),e.getPriority());i(e.name(),s,"update")});return{dispose:function(){e.off("value",s)}}}function s(e,n,i,s,o){var u=[];return _.each(n,function(n){var a=r(n),f=e.on(a,function(e,r){o(e.name(),t(i,s,e.name(),e.val(),e.getPriority()),n,r)});u.push(function(){e.off(a,f)})}.bind(this)),{dispose:function(){_.each(u,function(e){e()})}}}var e;ko.sync.stores.Firebase=ko.sync.Store.extend({init:function(e,t,n){n=_.extend({keyField:"_id",sortField:".priority"},n),this.fieldNames=t,this.ref=e,this.pull=e,this.kf=n.keyField,this.sf=n.sortField,this.subs=[],n&&this._applyOpts(n),this._initRef()},getKey:function(e){return e&&e[this.kf]?e[this.kf]:null},getFieldNames:function(){return this.fieldNames},create:function(t){return _.Deferred(function(r){if(t===e)r.reject("invalid data (undefined)");else{var i=this.getKey(t);if(i)this.update(i,t).done(r.resolve).fail(r.reject);else{console.log("Firebase::create",n(this.kf,this.sf,t));var s=this.ref.push(n(this.kf,this.sf,t),function(e){e?r.reject(e):r.resolve(s,t)}).name()}}}.bind(this))},read:function(e){return _.Deferred(function(n){console.log("Firebase::read",e),this.ref.child(e).once("value",function(e){n.resolve(t(this.kf,this.sf,e.name(),e.val(),e.getPriority()))}.bind(this),function(e){n.reject(e)})}.bind(this))},update:function(t,r){return _.Deferred(function(i){r===e?i.reject("invalid data (undefined)"):this.ref.child(t).set(n(this.kf,this.sf,r),function(e){e?i.reject(e):i.resolve(t,r)})}.bind(this))},"delete":function(e){return _.Deferred(function(t){this.ref.child(e).remove(function(n){n?t.reject(n):t.resolve(e)})}.bind(this))},on:function(e,t,n){return arguments.length===3?this._disp(i(this.ref.child(t),this.kf,this.sf,n)):(n=t,this._disp(s(this.pull,e.split(" "),this.kf,this.sf,n)))},dispose:function(){_.each(this.subs,function(e){e.dispose()}),this.ref=null,this.pull=null,this.subs=[]},_disp:function(e){return this.subs.push(e),e},_applyOpts:function(e){e.limit&&!_.has(e,"endAt")&&!_.has(e,"startAt")&&(this.pull=this.pull.endAt()),_.each(["limit","endAt","startAt"],function(t,n){_.has(e,n)&&(this.pull=this.pull[n](t))}.bind(this))},_initRef:function(){this.pull.on("child_added",function(){})}})}();