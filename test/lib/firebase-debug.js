var COMPILED = false;
var goog = goog || {};
goog.global = this;
goog.DEBUG = true;
goog.LOCALE = "en";
goog.provide = function(name) {
  if(!COMPILED) {
    if(goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];
    var namespace = name;
    while(namespace = namespace.substring(0, namespace.lastIndexOf("."))) {
      if(goog.getObjectByName(namespace)) {
        break
      }
      goog.implicitNamespaces_[namespace] = true
    }
  }
  goog.exportPath_(name)
};
goog.setTestOnly = function(opt_message) {
  if(COMPILED && !goog.DEBUG) {
    opt_message = opt_message || "";
    throw Error("Importing test-only code into non-debug environment" + opt_message ? ": " + opt_message : ".");
  }
};
if(!COMPILED) {
  goog.isProvided_ = function(name) {
    return!goog.implicitNamespaces_[name] && !!goog.getObjectByName(name)
  };
  goog.implicitNamespaces_ = {}
}
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split(".");
  var cur = opt_objectToExportTo || goog.global;
  if(!(parts[0] in cur) && cur.execScript) {
    cur.execScript("var " + parts[0])
  }
  for(var part;parts.length && (part = parts.shift());) {
    if(!parts.length && goog.isDef(opt_object)) {
      cur[part] = opt_object
    }else {
      if(cur[part]) {
        cur = cur[part]
      }else {
        cur = cur[part] = {}
      }
    }
  }
};
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split(".");
  var cur = opt_obj || goog.global;
  for(var part;part = parts.shift();) {
    if(goog.isDefAndNotNull(cur[part])) {
      cur = cur[part]
    }else {
      return null
    }
  }
  return cur
};
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for(var x in obj) {
    global[x] = obj[x]
  }
};
goog.addDependency = function(relPath, provides, requires) {
  if(!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, "/");
    var deps = goog.dependencies_;
    for(var i = 0;provide = provides[i];i++) {
      deps.nameToPath[provide] = path;
      if(!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {}
      }
      deps.pathToNames[path][provide] = true
    }
    for(var j = 0;require = requires[j];j++) {
      if(!(path in deps.requires)) {
        deps.requires[path] = {}
      }
      deps.requires[path][require] = true
    }
  }
};
goog.ENABLE_DEBUG_LOADER = true;
goog.require = function(name) {
  if(!COMPILED) {
    if(goog.isProvided_(name)) {
      return
    }
    if(goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if(path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return
      }
    }
    var errorMessage = "goog.require could not find: " + name;
    if(goog.global.console) {
      goog.global.console["error"](errorMessage)
    }
    throw Error(errorMessage);
  }
};
goog.basePath = "";
goog.global.CLOSURE_BASE_PATH;
goog.global.CLOSURE_NO_DEPS;
goog.global.CLOSURE_IMPORT_SCRIPT;
goog.nullFunction = function() {
};
goog.identityFunction = function(var_args) {
  return arguments[0]
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor)
  }
};
if(!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  goog.included_ = {};
  goog.dependencies_ = {pathToNames:{}, nameToPath:{}, requires:{}, visited:{}, written:{}};
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != "undefined" && "write" in doc
  };
  goog.findBasePath_ = function() {
    if(goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return
    }else {
      if(!goog.inHtmlDocument_()) {
        return
      }
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName("script");
    for(var i = scripts.length - 1;i >= 0;--i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf("?");
      var l = qmark == -1 ? src.length : qmark;
      if(src.substr(l - 7, 7) == "base.js") {
        goog.basePath = src.substr(0, l - 7);
        return
      }
    }
  };
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    if(!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true
    }
  };
  goog.writeScriptTag_ = function(src) {
    if(goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write('<script type="text/javascript" src="' + src + '"></' + "script>");
      return true
    }else {
      return false
    }
  };
  goog.writeScripts_ = function() {
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;
    function visitNode(path) {
      if(path in deps.written) {
        return
      }
      if(path in deps.visited) {
        if(!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path)
        }
        return
      }
      deps.visited[path] = true;
      if(path in deps.requires) {
        for(var requireName in deps.requires[path]) {
          if(!goog.isProvided_(requireName)) {
            if(requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName])
            }else {
              throw Error("Undefined nameToPath for " + requireName);
            }
          }
        }
      }
      if(!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path)
      }
    }
    for(var path in goog.included_) {
      if(!deps.written[path]) {
        visitNode(path)
      }
    }
    for(var i = 0;i < scripts.length;i++) {
      if(scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i])
      }else {
        throw Error("Undefined script input");
      }
    }
  };
  goog.getPathFromDeps_ = function(rule) {
    if(rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule]
    }else {
      return null
    }
  };
  goog.findBasePath_();
  if(!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + "deps.js")
  }
}
goog.typeOf = function(value) {
  var s = typeof value;
  if(s == "object") {
    if(value) {
      if(value instanceof Array) {
        return"array"
      }else {
        if(value instanceof Object) {
          return s
        }
      }
      var className = Object.prototype.toString.call(value);
      if(className == "[object Window]") {
        return"object"
      }
      if(className == "[object Array]" || typeof value.length == "number" && typeof value.splice != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("splice")) {
        return"array"
      }
      if(className == "[object Function]" || typeof value.call != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("call")) {
        return"function"
      }
    }else {
      return"null"
    }
  }else {
    if(s == "function" && typeof value.call == "undefined") {
      return"object"
    }
  }
  return s
};
goog.propertyIsEnumerableCustom_ = function(object, propName) {
  if(propName in object) {
    for(var key in object) {
      if(key == propName && Object.prototype.hasOwnProperty.call(object, propName)) {
        return true
      }
    }
  }
  return false
};
goog.propertyIsEnumerable_ = function(object, propName) {
  if(object instanceof Object) {
    return Object.prototype.propertyIsEnumerable.call(object, propName)
  }else {
    return goog.propertyIsEnumerableCustom_(object, propName)
  }
};
goog.isDef = function(val) {
  return val !== undefined
};
goog.isNull = function(val) {
  return val === null
};
goog.isDefAndNotNull = function(val) {
  return val != null
};
goog.isArray = function(val) {
  return goog.typeOf(val) == "array"
};
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == "array" || type == "object" && typeof val.length == "number"
};
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == "function"
};
goog.isString = function(val) {
  return typeof val == "string"
};
goog.isBoolean = function(val) {
  return typeof val == "boolean"
};
goog.isNumber = function(val) {
  return typeof val == "number"
};
goog.isFunction = function(val) {
  return goog.typeOf(val) == "function"
};
goog.isObject = function(val) {
  var type = goog.typeOf(val);
  return type == "object" || type == "array" || type == "function"
};
goog.getUid = function(obj) {
  return obj[goog.UID_PROPERTY_] || (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_)
};
goog.removeUid = function(obj) {
  if("removeAttribute" in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_)
  }
  try {
    delete obj[goog.UID_PROPERTY_]
  }catch(ex) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + Math.floor(Math.random() * 2147483648).toString(36);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.cloneObject(obj[key])
    }
    return clone
  }
  return obj
};
Object.prototype.clone;
goog.bindNative_ = function(fn, selfObj, var_args) {
  return fn.call.apply(fn.bind, arguments)
};
goog.bindJs_ = function(fn, selfObj, var_args) {
  if(!fn) {
    throw new Error;
  }
  if(arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs)
    }
  }else {
    return function() {
      return fn.apply(selfObj, arguments)
    }
  }
};
goog.bind = function(fn, selfObj, var_args) {
  if(Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1) {
    goog.bind = goog.bindNative_
  }else {
    goog.bind = goog.bindJs_
  }
  return goog.bind.apply(null, arguments)
};
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs)
  }
};
goog.mixin = function(target, source) {
  for(var x in source) {
    target[x] = source[x]
  }
};
goog.now = Date.now || function() {
  return+new Date
};
goog.globalEval = function(script) {
  if(goog.global.execScript) {
    goog.global.execScript(script, "JavaScript")
  }else {
    if(goog.global.eval) {
      if(goog.evalWorksForGlobals_ == null) {
        goog.global.eval("var _et_ = 1;");
        if(typeof goog.global["_et_"] != "undefined") {
          delete goog.global["_et_"];
          goog.evalWorksForGlobals_ = true
        }else {
          goog.evalWorksForGlobals_ = false
        }
      }
      if(goog.evalWorksForGlobals_) {
        goog.global.eval(script)
      }else {
        var doc = goog.global.document;
        var scriptElt = doc.createElement("script");
        scriptElt.type = "text/javascript";
        scriptElt.defer = false;
        scriptElt.appendChild(doc.createTextNode(script));
        doc.body.appendChild(scriptElt);
        doc.body.removeChild(scriptElt)
      }
    }else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.evalWorksForGlobals_ = null;
goog.cssNameMapping_;
goog.cssNameMappingStyle_;
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName
  };
  var renameByParts = function(cssName) {
    var parts = cssName.split("-");
    var mapped = [];
    for(var i = 0;i < parts.length;i++) {
      mapped.push(getMapping(parts[i]))
    }
    return mapped.join("-")
  };
  var rename;
  if(goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == "BY_WHOLE" ? getMapping : renameByParts
  }else {
    rename = function(a) {
      return a
    }
  }
  if(opt_modifier) {
    return className + "-" + rename(opt_modifier)
  }else {
    return rename(className)
  }
};
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style
};
goog.global.CLOSURE_CSS_NAME_MAPPING;
if(!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING
}
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for(var key in values) {
    var value = ("" + values[key]).replace(/\$/g, "$$$$");
    str = str.replace(new RegExp("\\{\\$" + key + "\\}", "gi"), value)
  }
  return str
};
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo)
};
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol
};
goog.inherits = function(childCtor, parentCtor) {
  function tempCtor() {
  }
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor;
  childCtor.prototype.constructor = childCtor
};
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if(caller.superClass_) {
    return caller.superClass_.constructor.apply(me, Array.prototype.slice.call(arguments, 1))
  }
  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for(var ctor = me.constructor;ctor;ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if(ctor.prototype[opt_methodName] === caller) {
      foundCaller = true
    }else {
      if(foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args)
      }
    }
  }
  if(me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args)
  }else {
    throw Error("goog.base called from a method of one name " + "to a method of a different name");
  }
};
goog.scope = function(fn) {
  fn.call(goog.global)
};
goog.provide("fb.core.util.utf8");
fb.core.util.utf8.stringToByteArray = function(str) {
  var out = [], p = 0;
  for(var i = 0;i < str.length;i++) {
    var c = str.charCodeAt(i);
    if(c < 128) {
      out[p++] = c
    }else {
      if(c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128
      }else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128
      }
    }
  }
  return out
};
fb.core.util.utf8.stringLength = function(str) {
  var p = 0;
  for(var i = 0;i < str.length;i++) {
    var c = str.charCodeAt(i);
    if(c < 128) {
      p++
    }else {
      if(c < 2048) {
        p += 2
      }else {
        p += 3
      }
    }
  }
  return p
};
goog.provide("fb.core.util_validation");
goog.require("fb.core.util.utf8");
fb.core.util.INVALID_KEY_REGEX_ = /[\[\].#$\/]/;
fb.core.util.INVALID_PATH_REGEX_ = /[\[\].#$]/;
fb.core.util.MAX_LEAF_SIZE_ = 10 * 1024 * 1024;
fb.core.util.isValidKey = function(key) {
  return goog.isString(key) && key.length !== 0 && !fb.core.util.INVALID_KEY_REGEX_.test(key)
};
fb.core.util.isValidPathString = function(pathString) {
  return goog.isString(pathString) && pathString.length !== 0 && !fb.core.util.INVALID_PATH_REGEX_.test(pathString)
};
fb.core.util.isValidRootPathString = function(pathString) {
  if(pathString) {
    pathString = pathString.replace(/^\/*\.info(\/|$)/, "/")
  }
  return fb.core.util.isValidPathString(pathString)
};
fb.core.util.validateArgCount = function(fnName, minCount, maxCount, argCount) {
  var argError;
  if(argCount < minCount) {
    argError = "at least " + minCount
  }else {
    if(argCount > maxCount) {
      argError = maxCount === 0 ? "none" : "no more than " + maxCount
    }
  }
  if(argError) {
    var error = fnName + " failed: Was called with " + argCount + (argCount === 1 ? " argument." : " arguments.") + " Expects " + argError + ".";
    throw new Error(error);
  }
};
fb.core.util.validateFirebaseDataArg = function(fnName, argumentNumber, data, optional) {
  if(optional && !goog.isDef(data)) {
    return
  }
  fb.core.util.validateFirebaseData(fb.core.util.errorPrefix_(fnName, argumentNumber, optional), data)
};
fb.core.util.validateFirebaseData = function(errorPrefix, data) {
  if(!goog.isDef(data)) {
    throw new Error(errorPrefix + "contains undefined.");
  }
  if(goog.isFunction(data)) {
    throw new Error(errorPrefix + "contains a function.");
  }
  if(goog.isString(data) && data.length > fb.core.util.MAX_LEAF_SIZE_ / 3 && fb.core.util.utf8.stringToByteArray(data).length > fb.core.util.MAX_LEAF_SIZE_) {
    throw new Error(errorPrefix + "contains a string greater than " + fb.core.util.MAX_LEAF_SIZE_ + " utf8 bytes ('" + data.substring(0, 50) + "...')");
  }
  if(goog.isObject(data)) {
    for(var key in data) {
      if(key !== ".priority" && key !== ".value" && !fb.core.util.isValidKey(key)) {
        throw new Error(errorPrefix + "contains an invalid key (" + key + ").  Keys must be non-empty strings and " + 'can\'t contain ".", "#", "$", "/", "[", or "]"');
      }
      fb.core.util.validateFirebaseData(errorPrefix, data[key])
    }
  }
};
fb.core.util.validatePriority = function(fnName, argumentNumber, priority, optional) {
  if(optional && !goog.isDef(priority)) {
    return
  }
  if(priority !== null && !goog.isNumber(priority) && !goog.isString(priority)) {
    throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + "must be a valid firebase priority " + "(null or a string.)");
  }
};
fb.core.util.validateCallback = function(fnName, argumentNumber, callback, optional) {
  if(optional && !goog.isDef(callback)) {
    return
  }
  if(!goog.isFunction(callback)) {
    throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + "must be a valid function.");
  }
};
fb.core.util.validateEventType = function(fnName, argumentNumber, eventType, optional) {
  if(optional && !goog.isDef(eventType)) {
    return
  }
  switch(eventType) {
    case "value":
    ;
    case "child_added":
    ;
    case "child_removed":
    ;
    case "child_changed":
    ;
    case "child_moved":
      break;
    default:
      throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + 'must be a valid event type: "value", "child_added", "child_removed", "child_changed", or "child_moved".');
  }
};
fb.core.util.validateKey = function(fnName, argumentNumber, key, optional) {
  if(optional && !goog.isDef(key)) {
    return
  }
  if(!fb.core.util.isValidKey(key)) {
    throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + 'must be a valid firebase key (non-empty string, not containing ".", "#", "$", "/", "[", or "]").');
  }
};
fb.core.util.validatePathString = function(fnName, argumentNumber, pathString, optional) {
  if(optional && !goog.isDef(pathString)) {
    return
  }
  if(!fb.core.util.isValidPathString(pathString)) {
    throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + "must be a non-empty string and " + 'can\'t contain ".", "#", "$", "[", or "]".');
  }
};
fb.core.util.validateRootPathString = function(fnName, argumentNumber, pathString, optional) {
  if(pathString) {
    pathString = pathString.replace(/^\/*\.info(\/|$)/, "/")
  }
  fb.core.util.validatePathString(fnName, argumentNumber, pathString, optional)
};
fb.core.util.validateWritablePath = function(fnName, path) {
  if(path.getFront() === ".info") {
    throw new Error(fnName + " failed: Can't modify data under /.info/");
  }
};
fb.core.util.validateUrl = function(fnName, argumentNumber, parsedUrl, optional) {
  if(optional && !goog.isDef(server)) {
    return
  }
  var pathString = parsedUrl.path.toString();
  if(!goog.isString(parsedUrl.repoInfo.host) || parsedUrl.repoInfo.host.length === 0 || !fb.core.util.isValidKey(parsedUrl.repoInfo.namespace) || pathString.length !== 0 && !fb.core.util.isValidRootPathString(pathString)) {
    throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + "must be a valid firebase URL.");
  }
};
fb.core.util.validateUser = function(fnName, argumentNumber, user, optional) {
  if(optional && !goog.isDef(user)) {
    return
  }
  if(!goog.isString(user)) {
    throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + "must be a valid firebase username.");
  }
};
fb.core.util.validateCredential = function(fnName, argumentNumber, cred, optional) {
  if(optional && !goog.isDef(cred)) {
    return
  }
  if(!goog.isString(cred)) {
    throw new Error(fb.core.util.errorPrefix_(fnName, argumentNumber, optional) + "must be a valid credential (a string).");
  }
};
fb.core.util.validateDemoServer = function(server) {
  if(IS_DEMO_BUILD) {
    if(!((new RegExp(DEMO_WEBSITE_DOMAIN)).test(window.location) || (new RegExp(DEMO_WEBSITE_DOMAIN)).test(window.parent.location) || (new RegExp("http://localhost")).test(window.location))) {
      throw new Error("You may only use Firebase inside our online tutorial unless you've been accepted into " + "the Firebase beta. Please contact beta@firebase.com for information.");
    }
  }
};
fb.core.util.errorPrefix_ = function(fnName, argumentNumber, optional) {
  var argName = "";
  switch(argumentNumber) {
    case 1:
      argName = optional ? "first" : "First";
      break;
    case 2:
      argName = optional ? "second" : "Second";
      break;
    case 3:
      argName = optional ? "third" : "Third";
      break;
    case 4:
      argName = optional ? "fourth" : "Fourth";
      break;
    default:
      fb.core.util.assert(false, "errorPrefix_ called with argumentNumber > 4.  Need to update it?")
  }
  var error = fnName + " failed: ";
  if(optional) {
    error += "If provided, "
  }
  error += argName + " argument ";
  return error
};
goog.provide("goog.json");
goog.provide("goog.json.Serializer");
goog.json.isValid_ = function(s) {
  if(/^\s*$/.test(s)) {
    return false
  }
  var backslashesRe = /\\["\\\/bfnrtu]/g;
  var simpleValuesRe = /"[^"\\\n\r\u2028\u2029\x00-\x08\x10-\x1f\x80-\x9f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
  var openBracketsRe = /(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g;
  var remainderRe = /^[\],:{}\s\u2028\u2029]*$/;
  return remainderRe.test(s.replace(backslashesRe, "@").replace(simpleValuesRe, "]").replace(openBracketsRe, ""))
};
goog.json.parse = function(s) {
  var o = String(s);
  if(goog.json.isValid_(o)) {
    try {
      return eval("(" + o + ")")
    }catch(ex) {
    }
  }
  throw Error("Invalid JSON string: " + o);
};
goog.json.unsafeParse = function(s) {
  return eval("(" + s + ")")
};
goog.json.Replacer;
goog.json.serialize = function(object, opt_replacer) {
  return(new goog.json.Serializer(opt_replacer)).serialize(object)
};
goog.json.Serializer = function(opt_replacer) {
  this.replacer_ = opt_replacer
};
goog.json.Serializer.prototype.serialize = function(object) {
  var sb = [];
  this.serialize_(object, sb);
  return sb.join("")
};
goog.json.Serializer.prototype.serialize_ = function(object, sb) {
  switch(typeof object) {
    case "string":
      this.serializeString_(object, sb);
      break;
    case "number":
      this.serializeNumber_(object, sb);
      break;
    case "boolean":
      sb.push(object);
      break;
    case "undefined":
      sb.push("null");
      break;
    case "object":
      if(object == null) {
        sb.push("null");
        break
      }
      if(goog.isArray(object)) {
        this.serializeArray_(object, sb);
        break
      }
      this.serializeObject_(object, sb);
      break;
    case "function":
      break;
    default:
      throw Error("Unknown type: " + typeof object);
  }
};
goog.json.Serializer.charToJsonCharCache_ = {'"':'\\"', "\\":"\\\\", "/":"\\/", "\u0008":"\\b", "\u000c":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\x0B":"\\u000b"};
goog.json.Serializer.charsToReplace_ = /\uffff/.test("\uffff") ? /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;
goog.json.Serializer.prototype.serializeString_ = function(s, sb) {
  sb.push('"', s.replace(goog.json.Serializer.charsToReplace_, function(c) {
    if(c in goog.json.Serializer.charToJsonCharCache_) {
      return goog.json.Serializer.charToJsonCharCache_[c]
    }
    var cc = c.charCodeAt(0);
    var rv = "\\u";
    if(cc < 16) {
      rv += "000"
    }else {
      if(cc < 256) {
        rv += "00"
      }else {
        if(cc < 4096) {
          rv += "0"
        }
      }
    }
    return goog.json.Serializer.charToJsonCharCache_[c] = rv + cc.toString(16)
  }), '"')
};
goog.json.Serializer.prototype.serializeNumber_ = function(n, sb) {
  sb.push(isFinite(n) && !isNaN(n) ? n : "null")
};
goog.json.Serializer.prototype.serializeArray_ = function(arr, sb) {
  var l = arr.length;
  sb.push("[");
  var sep = "";
  for(var i = 0;i < l;i++) {
    sb.push(sep);
    var value = arr[i];
    this.serialize_(this.replacer_ ? this.replacer_.call(arr, String(i), value) : value, sb);
    sep = ","
  }
  sb.push("]")
};
goog.json.Serializer.prototype.serializeObject_ = function(obj, sb) {
  sb.push("{");
  var sep = "";
  for(var key in obj) {
    if(Object.prototype.hasOwnProperty.call(obj, key)) {
      var value = obj[key];
      if(typeof value != "function") {
        sb.push(sep);
        this.serializeString_(key, sb);
        sb.push(":");
        this.serialize_(this.replacer_ ? this.replacer_.call(obj, key, value) : value, sb);
        sep = ","
      }
    }
  }
  sb.push("}")
};
goog.provide("fb.core.util.json");
goog.require("goog.json");
fb.core.util.json.eval = function(str) {
  if(typeof JSON !== "undefined" && goog.isDef(JSON.parse)) {
    return JSON.parse(str)
  }else {
    return goog.json.parse(str)
  }
};
fb.core.util.json.stringify = function(data) {
  if(typeof JSON !== "undefined" && goog.isDef(JSON.stringify)) {
    return JSON.stringify(data)
  }else {
    return goog.json.serialize(data)
  }
};
goog.provide("fb.api.Query");
goog.require("fb.core.util.json");
goog.require("fb.core.util_validation");
fb.api.Query = function(repo, path, opt_limit, opt_startPriority, opt_startName, opt_endPriority, opt_endName) {
  this.repo = repo;
  this.path = path;
  this.itemLimit = opt_limit;
  this.startPriority = fb.core.util.isNumeric(opt_startPriority) ? Number(opt_startPriority) : opt_startPriority;
  this.startName = opt_startName;
  this.endPriority = fb.core.util.isNumeric(opt_endPriority) ? Number(opt_endPriority) : opt_endPriority;
  this.endName = opt_endName;
  if(goog.isDef(this.startPriority) && goog.isDef(this.endPriority) && goog.isDef(this.itemLimit)) {
    throw"fb.api.Query: Can't combine startAt(), endAt(), and limit().";
  }
};
fb.api.Query.prototype.on = function(eventType, callback) {
  fb.core.util.validateArgCount("fb.api.Query.on", 2, 2, arguments.length);
  fb.core.util.validateEventType("fb.api.Query.on", 1, eventType, false);
  fb.core.util.validateCallback("fb.api.Query.on", 2, callback, false);
  this.repo.addEventCallbackForQuery(this, eventType, callback);
  return callback
};
goog.exportProperty(fb.api.Query.prototype, "on", fb.api.Query.prototype.on);
fb.api.Query.prototype.off = function(eventType, callback) {
  fb.core.util.validateArgCount("fb.api.Query.off", 2, 2, arguments.length);
  fb.core.util.validateEventType("fb.api.Query.off", 1, eventType, false);
  fb.core.util.validateCallback("fb.api.Query.off", 2, callback, false);
  this.repo.removeEventCallbackForQuery(this, eventType, callback)
};
goog.exportProperty(fb.api.Query.prototype, "off", fb.api.Query.prototype.off);
fb.api.Query.prototype.once = function(eventType, userCallback) {
  fb.core.util.validateArgCount("fb.api.Query.once", 2, 2, arguments.length);
  fb.core.util.validateEventType("fb.api.Query.once", 1, eventType, false);
  fb.core.util.validateCallback("fb.api.Query.once", 2, userCallback, false);
  var self = this, firstCall = true;
  var onceCallback = function(snapshot) {
    if(firstCall) {
      firstCall = false;
      self.off(eventType, onceCallback);
      userCallback(snapshot)
    }
  };
  this.on(eventType, onceCallback)
};
goog.exportProperty(fb.api.Query.prototype, "once", fb.api.Query.prototype.once);
fb.api.Query.prototype.limit = function(limit) {
  fb.core.util.validateArgCount("fb.api.Query.limit", 1, 1, arguments.length);
  if(!goog.isNumber(limit) || Math.floor(limit) !== limit || limit <= 0) {
    throw"fb.api.Query.limit: First argument must be a positive integer.";
  }
  return new fb.api.Query(this.repo, this.path, limit, this.startPriority, this.startName, this.endPriority, this.endName)
};
goog.exportProperty(fb.api.Query.prototype, "limit", fb.api.Query.prototype.limit);
fb.api.Query.prototype.startAt = function(priority, name) {
  fb.core.util.validateArgCount("fb.api.Query.startAt", 0, 2, arguments.length);
  fb.core.util.validatePriority("fb.api.Query.startAt", 1, priority, true);
  fb.core.util.validateKey("fb.api.Query.startAt", 2, name, true);
  if(!goog.isDef(priority)) {
    priority = null;
    name = null
  }
  return new fb.api.Query(this.repo, this.path, this.itemLimit, priority, name, this.endPriority, this.endName)
};
goog.exportProperty(fb.api.Query.prototype, "startAt", fb.api.Query.prototype.startAt);
fb.api.Query.prototype.endAt = function(priority, name) {
  fb.core.util.validateArgCount("fb.api.Query.endAt", 0, 2, arguments.length);
  fb.core.util.validatePriority("fb.api.Query.endAt", 1, priority, true);
  fb.core.util.validateKey("fb.api.Query.endAt", 2, name, true);
  return new fb.api.Query(this.repo, this.path, this.itemLimit, this.startPriority, this.startName, priority, name)
};
goog.exportProperty(fb.api.Query.prototype, "endAt", fb.api.Query.prototype.endAt);
fb.api.Query.prototype.queryObject = function() {
  var obj = {};
  if(goog.isDef(this.startPriority)) {
    obj["sp"] = this.startPriority
  }
  if(goog.isDef(this.startName)) {
    obj["sn"] = this.startName
  }
  if(goog.isDef(this.endPriority)) {
    obj["ep"] = this.endPriority
  }
  if(goog.isDef(this.endName)) {
    obj["en"] = this.endName
  }
  if(goog.isDef(this.itemLimit)) {
    obj["l"] = this.itemLimit
  }
  return obj
};
fb.api.Query.prototype.queryIdentifier = function() {
  var id = fb.core.util.ObjectToUniqueKey(this.queryObject());
  return id === "{}" ? "default" : id
};
goog.provide("goog.object");
goog.object.forEach = function(obj, f, opt_obj) {
  for(var key in obj) {
    f.call(opt_obj, obj[key], key, obj)
  }
};
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key]
    }
  }
  return res
};
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj)
  }
  return res
};
goog.object.some = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      return true
    }
  }
  return false
};
goog.object.every = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(!f.call(opt_obj, obj[key], key, obj)) {
      return false
    }
  }
  return true
};
goog.object.getCount = function(obj) {
  var rv = 0;
  for(var key in obj) {
    rv++
  }
  return rv
};
goog.object.getAnyKey = function(obj) {
  for(var key in obj) {
    return key
  }
};
goog.object.getAnyValue = function(obj) {
  for(var key in obj) {
    return obj[key]
  }
};
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val)
};
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = obj[key]
  }
  return res
};
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = key
  }
  return res
};
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;
  for(var i = isArrayLike ? 0 : 1;i < keys.length;i++) {
    obj = obj[keys[i]];
    if(!goog.isDef(obj)) {
      break
    }
  }
  return obj
};
goog.object.containsKey = function(obj, key) {
  return key in obj
};
goog.object.containsValue = function(obj, val) {
  for(var key in obj) {
    if(obj[key] == val) {
      return true
    }
  }
  return false
};
goog.object.findKey = function(obj, f, opt_this) {
  for(var key in obj) {
    if(f.call(opt_this, obj[key], key, obj)) {
      return key
    }
  }
  return undefined
};
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key]
};
goog.object.isEmpty = function(obj) {
  for(var key in obj) {
    return false
  }
  return true
};
goog.object.clear = function(obj) {
  for(var i in obj) {
    delete obj[i]
  }
};
goog.object.remove = function(obj, key) {
  var rv;
  if(rv = key in obj) {
    delete obj[key]
  }
  return rv
};
goog.object.add = function(obj, key, val) {
  if(key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val)
};
goog.object.get = function(obj, key, opt_val) {
  if(key in obj) {
    return obj[key]
  }
  return opt_val
};
goog.object.set = function(obj, key, value) {
  obj[key] = value
};
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : obj[key] = value
};
goog.object.clone = function(obj) {
  var res = {};
  for(var key in obj) {
    res[key] = obj[key]
  }
  return res
};
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key])
    }
    return clone
  }
  return obj
};
goog.object.transpose = function(obj) {
  var transposed = {};
  for(var key in obj) {
    transposed[obj[key]] = key
  }
  return transposed
};
goog.object.PROTOTYPE_FIELDS_ = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
goog.object.extend = function(target, var_args) {
  var key, source;
  for(var i = 1;i < arguments.length;i++) {
    source = arguments[i];
    for(key in source) {
      target[key] = source[key]
    }
    for(var j = 0;j < goog.object.PROTOTYPE_FIELDS_.length;j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if(Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key]
      }
    }
  }
};
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0])
  }
  if(argLength % 2) {
    throw Error("Uneven number of arguments");
  }
  var rv = {};
  for(var i = 0;i < argLength;i += 2) {
    rv[arguments[i]] = arguments[i + 1]
  }
  return rv
};
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0])
  }
  var rv = {};
  for(var i = 0;i < argLength;i++) {
    rv[arguments[i]] = true
  }
  return rv
};
goog.provide("fb.core.util.Path");
fb.core.util.Path = function(pathObj) {
  if(pathObj instanceof fb.core.util.Path) {
    return pathObj
  }
  if(arguments.length == 1) {
    this.pieces_ = pathObj.split("/");
    var copyTo = 0;
    for(var i = 0;i < this.pieces_.length;i++) {
      if(this.pieces_[i].length > 0) {
        this.pieces_[copyTo] = this.pieces_[i];
        copyTo++
      }
    }
    this.pieces_.length = copyTo;
    this.pieceNum_ = 0
  }else {
    this.pieces_ = arguments[0];
    this.pieceNum_ = arguments[1]
  }
};
fb.core.util.Path.prototype.getFront = function() {
  if(this.pieceNum_ >= this.pieces_.length) {
    return null
  }
  return this.pieces_[this.pieceNum_]
};
fb.core.util.Path.prototype.popFront = function() {
  var pieceNum = this.pieceNum_;
  if(pieceNum < this.pieces_.length) {
    pieceNum++
  }
  return new fb.core.util.Path(this.pieces_, pieceNum)
};
fb.core.util.Path.prototype.getBack = function() {
  if(this.pieceNum_ < this.pieces_.length) {
    return this.pieces_[this.pieces_.length - 1]
  }
  return null
};
fb.core.util.Path.prototype.toString = function() {
  var pathString = "";
  for(var i = this.pieceNum_;i < this.pieces_.length;i++) {
    if(this.pieces_[i] !== "") {
      pathString += "/" + this.pieces_[i]
    }
  }
  return pathString
};
fb.core.util.Path.prototype.parent = function() {
  if(this.pieceNum_ >= this.pieces_.length) {
    return null
  }
  var pieces = [];
  for(var i = this.pieceNum_;i < this.pieces_.length - 1;i++) {
    pieces.push(this.pieces_[i])
  }
  return new fb.core.util.Path(pieces, 0)
};
fb.core.util.Path.prototype.child = function(childPathObj) {
  var pieces = [];
  for(var i = this.pieceNum_;i < this.pieces_.length;i++) {
    pieces.push(this.pieces_[i])
  }
  if(childPathObj instanceof fb.core.util.Path) {
    for(i = childPathObj.pieceNum_;i < childPathObj.pieces_.length;i++) {
      pieces.push(childPathObj.pieces_[i])
    }
  }else {
    var childPieces = childPathObj.split("/");
    for(i = 0;i < childPieces.length;i++) {
      if(childPieces[i].length > 0) {
        pieces.push(childPieces[i])
      }
    }
  }
  return new fb.core.util.Path(pieces, 0)
};
fb.core.util.Path.prototype.isEmpty = function() {
  return this.pieceNum_ >= this.pieces_.length
};
fb.core.util.Path.RelativePath = function(outerPath, innerPath) {
  var outer = outerPath.getFront(), inner = innerPath.getFront();
  if(outer === null) {
    return innerPath
  }else {
    if(outer === inner) {
      return fb.core.util.Path.RelativePath(outerPath.popFront(), innerPath.popFront())
    }else {
      throw"INTERNAL ERROR: innerPath (" + innerPath + ") is not within " + "outerPath (" + outerPath + ")";
    }
  }
};
goog.provide("fb.core.util.Tree");
goog.require("fb.core.util.Path");
goog.require("goog.object");
fb.core.util.TreeNode = function() {
  this.children = {};
  this.childCount = 0;
  this.value = null
};
fb.core.util.Tree = function(opt_name, opt_parent, opt_node) {
  this.name_ = opt_name ? opt_name : "";
  this.parent_ = opt_parent ? opt_parent : null;
  this.node_ = opt_node ? opt_node : new fb.core.util.TreeNode
};
fb.core.util.Tree.prototype.subTree = function(pathObj) {
  var path = pathObj instanceof fb.core.util.Path ? pathObj : new fb.core.util.Path(pathObj);
  var child = this, next;
  while((next = path.getFront()) !== null) {
    var childNode = next in child.node_.children ? child.node_.children[next] : new fb.core.util.TreeNode;
    child = new fb.core.util.Tree(next, child, childNode);
    path = path.popFront()
  }
  return child
};
fb.core.util.Tree.prototype.getValue = function() {
  return this.node_.value
};
fb.core.util.Tree.prototype.setValue = function(value) {
  fb.core.util.assert(typeof value !== "undefined");
  this.node_.value = value;
  this.updateParents_()
};
fb.core.util.Tree.prototype.clear = function() {
  this.node_.value = null;
  this.node_.children = {};
  this.node_.childCount = 0;
  this.updateParents_()
};
fb.core.util.Tree.prototype.hasChildren = function() {
  return this.node_.childCount > 0
};
fb.core.util.Tree.prototype.isEmpty = function() {
  return this.getValue() === null && !this.hasChildren()
};
fb.core.util.Tree.prototype.forEachChild = function(action) {
  for(var child in this.node_.children) {
    action(new fb.core.util.Tree(child, this, this.node_.children[child]))
  }
};
fb.core.util.Tree.prototype.forEachDescendant = function(action, opt_includeSelf, opt_childrenFirst) {
  if(opt_includeSelf && !opt_childrenFirst) {
    action(this)
  }
  this.forEachChild(function(child) {
    child.forEachDescendant(action, true, opt_childrenFirst)
  });
  if(opt_includeSelf && opt_childrenFirst) {
    action(this)
  }
};
fb.core.util.Tree.prototype.forEachAncestor = function(action, opt_includeSelf) {
  var node = opt_includeSelf ? this : this.parent();
  while(node !== null) {
    if(action(node)) {
      return true
    }
    node = node.parent()
  }
  return false
};
fb.core.util.Tree.prototype.forEachImmediateDescendantWithValue = function(action) {
  this.forEachChild(function(child) {
    if(child.getValue() !== null) {
      action(child)
    }else {
      child.forEachImmediateDescendantWithValue(action)
    }
  })
};
fb.core.util.Tree.prototype.valueExistsAtOrAbove = function(path) {
  var node = this.node_;
  while(node) {
    if(node.value !== null) {
      return true
    }
    node = node.children[path.getFront()];
    path = path.popFront()
  }
};
fb.core.util.Tree.prototype.path = function() {
  return new fb.core.util.Path(this.parent_ === null ? this.name_ : this.parent_.path() + "/" + this.name_)
};
fb.core.util.Tree.prototype.name = function() {
  return this.name_
};
fb.core.util.Tree.prototype.parent = function() {
  return this.parent_
};
fb.core.util.Tree.prototype.updateParents_ = function() {
  if(this.parent_ !== null) {
    this.parent_.updateChild_(this.name_, this)
  }
};
fb.core.util.Tree.prototype.updateChild_ = function(childName, child) {
  var childEmpty = child.isEmpty();
  var childExists = childName in this.node_.children;
  if(childEmpty && childExists) {
    delete this.node_.children[childName];
    this.node_.childCount--;
    this.updateParents_()
  }else {
    if(!childEmpty && !childExists) {
      this.node_.children[childName] = child.node_;
      this.node_.childCount++;
      this.updateParents_()
    }
  }
};
goog.provide("fb.core.util.SortedMap");
fb.Comparator;
fb.core.util.SortedMap = function(opt_comparator, opt_root) {
  this.comparator_ = opt_comparator ? opt_comparator : fb.core.util.SortedMap.STANDARD_COMPARATOR_;
  this.root_ = opt_root ? opt_root : fb.core.util.SortedMap.EMPTY_NODE_
};
fb.core.util.SortedMap.STANDARD_COMPARATOR_ = function(elem1, elem2) {
  if(elem1 < elem2) {
    return-1
  }else {
    if(elem1 > elem2) {
      return 1
    }else {
      return 0
    }
  }
};
fb.core.util.SortedMap.prototype.insert = function(key, value) {
  return new fb.core.util.SortedMap(this.comparator_, this.root_.insert(key, value, this.comparator_).copy(null, null, fb.LLRBNode.BLACK_, null, null))
};
fb.core.util.SortedMap.prototype.remove = function(key) {
  return new fb.core.util.SortedMap(this.comparator_, this.root_.remove(key, this.comparator_).copy(null, null, fb.LLRBNode.BLACK_, null, null))
};
fb.core.util.SortedMap.prototype.get = function(key) {
  var cmp;
  var node = this.root_;
  while(!node.isEmpty()) {
    cmp = this.comparator_(key, node.key);
    if(cmp === 0) {
      return node.value
    }else {
      if(cmp < 0) {
        node = node.left
      }else {
        if(cmp > 0) {
          node = node.right
        }
      }
    }
  }
  return null
};
fb.core.util.SortedMap.prototype.getPredecessorKey = function(key) {
  var cmp, node = this.root_, rightParent = null;
  while(!node.isEmpty()) {
    cmp = this.comparator_(key, node.key);
    if(cmp === 0) {
      if(!node.left.isEmpty()) {
        node = node.left;
        while(!node.right.isEmpty()) {
          node = node.right
        }
        return node.key
      }else {
        if(rightParent) {
          return rightParent.key
        }else {
          return null
        }
      }
    }else {
      if(cmp < 0) {
        node = node.left
      }else {
        if(cmp > 0) {
          rightParent = node;
          node = node.right
        }
      }
    }
  }
  throw"Attempted to find predecessor key for a nonexistent key.  What gives?";
};
fb.core.util.SortedMap.prototype.isEmpty = function() {
  return this.root_.isEmpty()
};
fb.core.util.SortedMap.prototype.count = function() {
  return this.root_.count()
};
fb.core.util.SortedMap.prototype.minKey = function() {
  return this.root_.minKey()
};
fb.core.util.SortedMap.prototype.maxKey = function() {
  return this.root_.maxKey()
};
fb.core.util.SortedMap.prototype.inorderTraversal = function(action) {
  return this.root_.inorderTraversal(action)
};
fb.core.util.SortedMap.prototype.reverseTraversal = function(action) {
  return this.root_.reverseTraversal(action)
};
fb.core.util.SortedMap.prototype.getIterator = function(opt_resultGenerator) {
  return new fb.core.util.SortedMapIterator(this.root_, opt_resultGenerator)
};
fb.core.util.SortedMapIterator = function(node, opt_resultGenerator) {
  this.resultGenerator_ = opt_resultGenerator;
  this.nodeStack_ = [];
  while(!node.isEmpty()) {
    this.nodeStack_.push(node);
    node = node.left
  }
};
fb.core.util.SortedMapIterator.prototype.getNext = function() {
  if(this.nodeStack_.length === 0) {
    return null
  }
  var node = this.nodeStack_.pop(), result;
  if(this.resultGenerator_) {
    result = this.resultGenerator_(node.key, node.value)
  }else {
    result = {key:node.key, value:node.value}
  }
  node = node.right;
  while(!node.isEmpty()) {
    this.nodeStack_.push(node);
    node = node.left
  }
  return result
};
fb.LLRBNode = function(key, value, color, left, right) {
  this.key = key;
  this.value = value;
  this.color = color != null ? color : fb.LLRBNode.RED_;
  this.left = left != null ? left : fb.core.util.SortedMap.EMPTY_NODE_;
  this.right = right != null ? right : fb.core.util.SortedMap.EMPTY_NODE_
};
fb.LLRBNode.RED_ = true;
fb.LLRBNode.BLACK_ = false;
fb.LLRBNode.prototype.copy = function(key, value, color, left, right) {
  return new fb.LLRBNode(key != null ? key : this.key, value != null ? value : this.value, color != null ? color : this.color, left != null ? left : this.left, right != null ? right : this.right)
};
fb.LLRBNode.prototype.count = function() {
  return this.left.count() + 1 + this.right.count()
};
fb.LLRBNode.prototype.isEmpty = function() {
  return false
};
fb.LLRBNode.prototype.inorderTraversal = function(action) {
  return this.left.inorderTraversal(action) || action(this.key, this.value) || this.right.inorderTraversal(action)
};
fb.LLRBNode.prototype.reverseTraversal = function(action) {
  return this.right.reverseTraversal(action) || action(this.key, this.value) || this.left.reverseTraversal(action)
};
fb.LLRBNode.prototype.min_ = function() {
  if(this.left.isEmpty()) {
    return this
  }else {
    return this.left.min_()
  }
};
fb.LLRBNode.prototype.minKey = function() {
  return this.min_().key
};
fb.LLRBNode.prototype.maxKey = function() {
  if(this.right.isEmpty()) {
    return this.key
  }else {
    return this.right.maxKey()
  }
};
fb.LLRBNode.prototype.insert = function(key, value, comparator) {
  var cmp, n;
  n = this;
  cmp = comparator(key, n.key);
  if(cmp < 0) {
    n = n.copy(null, null, null, n.left.insert(key, value, comparator), null)
  }else {
    if(cmp === 0) {
      n = n.copy(null, value, null, null, null)
    }else {
      n = n.copy(null, null, null, null, n.right.insert(key, value, comparator))
    }
  }
  return n.fixUp_()
};
fb.LLRBNode.prototype.removeMin_ = function() {
  var n;
  if(this.left.isEmpty()) {
    return fb.core.util.SortedMap.EMPTY_NODE_
  }
  n = this;
  if(!n.left.isRed_() && !n.left.left.isRed_()) {
    n = n.moveRedLeft_()
  }
  n = n.copy(null, null, null, n.left.removeMin_(), null);
  return n.fixUp_()
};
fb.LLRBNode.prototype.remove = function(key, comparator) {
  var n, smallest;
  n = this;
  if(comparator(key, n.key) < 0) {
    if(!n.left.isEmpty() && !n.left.isRed_() && !n.left.left.isRed_()) {
      n = n.moveRedLeft_()
    }
    n = n.copy(null, null, null, n.left.remove(key, comparator), null)
  }else {
    if(n.left.isRed_()) {
      n = n.rotateRight_()
    }
    if(!n.right.isEmpty() && !n.right.isRed_() && !n.right.left.isRed_()) {
      n = n.moveRedRight_()
    }
    if(comparator(key, n.key) === 0) {
      if(n.right.isEmpty()) {
        return fb.core.util.SortedMap.EMPTY_NODE_
      }else {
        smallest = n.right.min_();
        n = n.copy(smallest.key, smallest.value, null, null, n.right.removeMin_())
      }
    }
    n = n.copy(null, null, null, null, n.right.remove(key, comparator))
  }
  return n.fixUp_()
};
fb.LLRBNode.prototype.isRed_ = function() {
  return this.color
};
fb.LLRBNode.prototype.fixUp_ = function() {
  var n = this;
  if(n.right.isRed_() && !n.left.isRed_()) {
    n = n.rotateLeft_()
  }
  if(n.left.isRed_() && n.left.left.isRed_()) {
    n = n.rotateRight_()
  }
  if(n.left.isRed_() && n.right.isRed_()) {
    n = n.colorFlip_()
  }
  return n
};
fb.LLRBNode.prototype.moveRedLeft_ = function() {
  var n = this.colorFlip_();
  if(n.right.left.isRed_()) {
    n = n.copy(null, null, null, null, n.right.rotateRight_());
    n = n.rotateLeft_();
    n = n.colorFlip_()
  }
  return n
};
fb.LLRBNode.prototype.moveRedRight_ = function() {
  var n = this.colorFlip_();
  if(n.left.left.isRed_()) {
    n = n.rotateRight_();
    n = n.colorFlip_()
  }
  return n
};
fb.LLRBNode.prototype.rotateLeft_ = function() {
  var nl;
  nl = this.copy(null, null, fb.LLRBNode.RED_, null, this.right.left);
  return this.right.copy(null, null, this.color, nl, null)
};
fb.LLRBNode.prototype.rotateRight_ = function() {
  var nr;
  nr = this.copy(null, null, fb.LLRBNode.RED_, this.left.right, null);
  return this.left.copy(null, null, this.color, null, nr)
};
fb.LLRBNode.prototype.colorFlip_ = function() {
  var left, right;
  left = this.left.copy(null, null, !this.left.color, null, null);
  right = this.right.copy(null, null, !this.right.color, null, null);
  return this.copy(null, null, !this.color, left, right)
};
fb.LLRBNode.prototype.checkMaxDepth_ = function() {
  var blackDepth;
  blackDepth = this.check_();
  if(Math.pow(2, blackDepth) <= this.count() + 1) {
    return true
  }else {
    return false
  }
};
fb.LLRBNode.prototype.check_ = function() {
  var blackDepth;
  if(this.isRed_() && this.left.isRed_()) {
    throw new Error("Red node has red child(" + this.key + "," + this.value + ")");
  }
  if(this.right.isRed_()) {
    throw new Error("Right child of (" + this.key + "," + this.value + ") is red");
  }
  blackDepth = this.left.check_();
  if(blackDepth !== this.right.check_()) {
    throw new Error("Black depths differ");
  }else {
    return blackDepth + (this.isRed_() ? 0 : 1)
  }
};
fb.LLRBEmptyNode = function() {
};
fb.LLRBEmptyNode.prototype.copy = function() {
  return this
};
fb.LLRBEmptyNode.prototype.insert = function(key, value, comparator) {
  return new fb.LLRBNode(key, value, void 0, void 0, void 0)
};
fb.LLRBEmptyNode.prototype.remove = function(key) {
  return this
};
fb.LLRBEmptyNode.prototype.get = function(key) {
  return null
};
fb.LLRBEmptyNode.prototype.count = function() {
  return 0
};
fb.LLRBEmptyNode.prototype.isEmpty = function() {
  return true
};
fb.LLRBEmptyNode.prototype.inorderTraversal = function(action) {
  return false
};
fb.LLRBEmptyNode.prototype.reverseTraversal = function(action) {
  return false
};
fb.LLRBEmptyNode.prototype.minKey = function() {
  return null
};
fb.LLRBEmptyNode.prototype.maxKey = function() {
  return null
};
fb.LLRBEmptyNode.prototype.check_ = function() {
  return 0
};
fb.LLRBEmptyNode.prototype.isRed_ = function() {
  return false
};
fb.core.util.SortedMap.EMPTY_NODE_ = new fb.LLRBEmptyNode;
goog.provide("goog.debug.Error");
goog.debug.Error = function(opt_msg) {
  this.stack = (new Error).stack || "";
  if(opt_msg) {
    this.message = String(opt_msg)
  }
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.provide("goog.string");
goog.provide("goog.string.Unicode");
goog.string.Unicode = {NBSP:"\u00a0"};
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0
};
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l
};
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(prefix, str.substr(0, prefix.length)) == 0
};
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(suffix, str.substr(str.length - suffix.length, suffix.length)) == 0
};
goog.string.subs = function(str, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var replacement = String(arguments[i]).replace(/\$/g, "$$$$");
    str = str.replace(/\%s/, replacement)
  }
  return str
};
goog.string.collapseWhitespace = function(str) {
  return str.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "")
};
goog.string.isEmpty = function(str) {
  return/^[\s\xa0]*$/.test(str)
};
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str))
};
goog.string.isBreakingWhitespace = function(str) {
  return!/[^\t\n\r ]/.test(str)
};
goog.string.isAlpha = function(str) {
  return!/[^a-zA-Z]/.test(str)
};
goog.string.isNumeric = function(str) {
  return!/[^0-9]/.test(str)
};
goog.string.isAlphaNumeric = function(str) {
  return!/[^a-zA-Z0-9]/.test(str)
};
goog.string.isSpace = function(ch) {
  return ch == " "
};
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= " " && ch <= "~" || ch >= "\u0080" && ch <= "\ufffd"
};
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, " ")
};
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, "\n")
};
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, " ")
};
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, " ")
};
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, " ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g, "")
};
goog.string.trim = function(str) {
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
};
goog.string.trimLeft = function(str) {
  return str.replace(/^[\s\xa0]+/, "")
};
goog.string.trimRight = function(str) {
  return str.replace(/[\s\xa0]+$/, "")
};
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();
  if(test1 < test2) {
    return-1
  }else {
    if(test1 == test2) {
      return 0
    }else {
      return 1
    }
  }
};
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare = function(str1, str2) {
  if(str1 == str2) {
    return 0
  }
  if(!str1) {
    return-1
  }
  if(!str2) {
    return 1
  }
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var count = Math.min(tokens1.length, tokens2.length);
  for(var i = 0;i < count;i++) {
    var a = tokens1[i];
    var b = tokens2[i];
    if(a != b) {
      var num1 = parseInt(a, 10);
      if(!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if(!isNaN(num2) && num1 - num2) {
          return num1 - num2
        }
      }
      return a < b ? -1 : 1
    }
  }
  if(tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length
  }
  return str1 < str2 ? -1 : 1
};
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;
goog.string.urlEncode = function(str) {
  str = String(str);
  if(!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str)
  }
  return str
};
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, " "))
};
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? "<br />" : "<br>")
};
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {
  if(opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, "&amp;").replace(goog.string.ltRe_, "&lt;").replace(goog.string.gtRe_, "&gt;").replace(goog.string.quotRe_, "&quot;")
  }else {
    if(!goog.string.allRe_.test(str)) {
      return str
    }
    if(str.indexOf("&") != -1) {
      str = str.replace(goog.string.amperRe_, "&amp;")
    }
    if(str.indexOf("<") != -1) {
      str = str.replace(goog.string.ltRe_, "&lt;")
    }
    if(str.indexOf(">") != -1) {
      str = str.replace(goog.string.gtRe_, "&gt;")
    }
    if(str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, "&quot;")
    }
    return str
  }
};
goog.string.amperRe_ = /&/g;
goog.string.ltRe_ = /</g;
goog.string.gtRe_ = />/g;
goog.string.quotRe_ = /\"/g;
goog.string.allRe_ = /[&<>\"]/;
goog.string.unescapeEntities = function(str) {
  if(goog.string.contains(str, "&")) {
    if("document" in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str)
    }else {
      return goog.string.unescapePureXmlEntities_(str)
    }
  }
  return str
};
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var seen = {"&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"'};
  var div = document.createElement("div");
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    var value = seen[s];
    if(value) {
      return value
    }
    if(entity.charAt(0) == "#") {
      var n = Number("0" + entity.substr(1));
      if(!isNaN(n)) {
        value = String.fromCharCode(n)
      }
    }
    if(!value) {
      div.innerHTML = s + " ";
      value = div.firstChild.nodeValue.slice(0, -1)
    }
    return seen[s] = value
  })
};
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch(entity) {
      case "amp":
        return"&";
      case "lt":
        return"<";
      case "gt":
        return">";
      case "quot":
        return'"';
      default:
        if(entity.charAt(0) == "#") {
          var n = Number("0" + entity.substr(1));
          if(!isNaN(n)) {
            return String.fromCharCode(n)
          }
        }
        return s
    }
  })
};
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, " &#160;"), opt_xml)
};
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for(var i = 0;i < length;i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if(str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1)
    }
  }
  return str
};
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(str.length > chars) {
    str = str.substring(0, chars - 3) + "..."
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.truncateMiddle = function(str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(opt_trailingChars && str.length > chars) {
    if(opt_trailingChars > chars) {
      opt_trailingChars = chars
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + "..." + str.substring(endPoint)
  }else {
    if(str.length > chars) {
      var half = Math.floor(chars / 2);
      var endPos = str.length - half;
      half += chars % 2;
      str = str.substring(0, half) + "..." + str.substring(endPos)
    }
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.specialEscapeChars_ = {"\x00":"\\0", "\u0008":"\\b", "\u000c":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\x0B":"\\x0B", '"':'\\"', "\\":"\\\\"};
goog.string.jsEscapeCache_ = {"'":"\\'"};
goog.string.quote = function(s) {
  s = String(s);
  if(s.quote) {
    return s.quote()
  }else {
    var sb = ['"'];
    for(var i = 0;i < s.length;i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] || (cc > 31 && cc < 127 ? ch : goog.string.escapeChar(ch))
    }
    sb.push('"');
    return sb.join("")
  }
};
goog.string.escapeString = function(str) {
  var sb = [];
  for(var i = 0;i < str.length;i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i))
  }
  return sb.join("")
};
goog.string.escapeChar = function(c) {
  if(c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c]
  }
  if(c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c]
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if(cc > 31 && cc < 127) {
    rv = c
  }else {
    if(cc < 256) {
      rv = "\\x";
      if(cc < 16 || cc > 256) {
        rv += "0"
      }
    }else {
      rv = "\\u";
      if(cc < 4096) {
        rv += "0"
      }
    }
    rv += cc.toString(16).toUpperCase()
  }
  return goog.string.jsEscapeCache_[c] = rv
};
goog.string.toMap = function(s) {
  var rv = {};
  for(var i = 0;i < s.length;i++) {
    rv[s.charAt(i)] = true
  }
  return rv
};
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1
};
goog.string.countOf = function(s, ss) {
  return s && ss ? s.split(ss).length - 1 : 0
};
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  if(index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) + s.substr(index + stringLength, s.length - index - stringLength)
  }
  return resultStr
};
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "");
  return s.replace(re, "")
};
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "g");
  return s.replace(re, "")
};
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08")
};
goog.string.repeat = function(string, length) {
  return(new Array(length + 1)).join(string)
};
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf(".");
  if(index == -1) {
    index = s.length
  }
  return goog.string.repeat("0", Math.max(0, length - index)) + s
};
goog.string.makeSafe = function(obj) {
  return obj == null ? "" : String(obj)
};
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, "")
};
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) + Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36)
};
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  var v1Subs = goog.string.trim(String(version1)).split(".");
  var v2Subs = goog.string.trim(String(version2)).split(".");
  var subCount = Math.max(v1Subs.length, v2Subs.length);
  for(var subIdx = 0;order == 0 && subIdx < subCount;subIdx++) {
    var v1Sub = v1Subs[subIdx] || "";
    var v2Sub = v2Subs[subIdx] || "";
    var v1CompParser = new RegExp("(\\d*)(\\D*)", "g");
    var v2CompParser = new RegExp("(\\d*)(\\D*)", "g");
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ["", "", ""];
      var v2Comp = v2CompParser.exec(v2Sub) || ["", "", ""];
      if(v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break
      }
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
      order = goog.string.compareElements_(v1CompNum, v2CompNum) || goog.string.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) || goog.string.compareElements_(v1Comp[2], v2Comp[2])
    }while(order == 0)
  }
  return order
};
goog.string.compareElements_ = function(left, right) {
  if(left < right) {
    return-1
  }else {
    if(left > right) {
      return 1
    }
  }
  return 0
};
goog.string.HASHCODE_MAX_ = 4294967296;
goog.string.hashCode = function(str) {
  var result = 0;
  for(var i = 0;i < str.length;++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= goog.string.HASHCODE_MAX_
  }
  return result
};
goog.string.uniqueStringCounter_ = Math.random() * 2147483648 | 0;
goog.string.createUniqueString = function() {
  return"goog_" + goog.string.uniqueStringCounter_++
};
goog.string.toNumber = function(str) {
  var num = Number(str);
  if(num == 0 && goog.string.isEmpty(str)) {
    return NaN
  }
  return num
};
goog.string.toCamelCaseCache_ = {};
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] || (goog.string.toCamelCaseCache_[str] = String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase()
  }))
};
goog.string.toSelectorCaseCache_ = {};
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] || (goog.string.toSelectorCaseCache_[str] = String(str).replace(/([A-Z])/g, "-$1").toLowerCase())
};
goog.provide("goog.asserts");
goog.provide("goog.asserts.AssertionError");
goog.require("goog.debug.Error");
goog.require("goog.string");
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  messageArgs.shift();
  this.messagePattern = messagePattern
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = "Assertion failed";
  if(givenMessage) {
    message += ": " + givenMessage;
    var args = givenArgs
  }else {
    if(defaultMessage) {
      message += ": " + defaultMessage;
      args = defaultArgs
    }
  }
  throw new goog.asserts.AssertionError("" + message, args || []);
};
goog.asserts.assert = function(condition, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_("", null, opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return condition
};
goog.asserts.fail = function(opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError("Failure" + (opt_message ? ": " + opt_message : ""), Array.prototype.slice.call(arguments, 1));
  }
};
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertString = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_("instanceof check failed.", null, opt_message, Array.prototype.slice.call(arguments, 3))
  }
};
goog.provide("goog.array");
goog.provide("goog.array.ArrayLike");
goog.require("goog.asserts");
goog.NATIVE_ARRAY_PROTOTYPES = true;
goog.array.ArrayLike;
goog.array.peek = function(array) {
  return array[array.length - 1]
};
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.indexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? 0 : opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex;
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.indexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i < arr.length;i++) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.lastIndexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  if(fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex)
  }
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.lastIndexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i >= 0;i--) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.forEach ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;--i) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.filter ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      var val = arr2[i];
      if(f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val
      }
    }
  }
  return res
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.map ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = new Array(l);
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      res[i] = f.call(opt_obj, arr2[i], i, arr)
    }
  }
  return res
};
goog.array.reduce = function(arr, f, val, opt_obj) {
  if(arr.reduce) {
    if(opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduce(f, val)
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if(arr.reduceRight) {
    if(opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduceRight(f, val)
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.some ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true
    }
  }
  return false
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.every ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false
    }
  }
  return true
};
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;i--) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0
};
goog.array.isEmpty = function(arr) {
  return arr.length == 0
};
goog.array.clear = function(arr) {
  if(!goog.isArray(arr)) {
    for(var i = arr.length - 1;i >= 0;i--) {
      delete arr[i]
    }
  }
  arr.length = 0
};
goog.array.insert = function(arr, obj) {
  if(!goog.array.contains(arr, obj)) {
    arr.push(obj)
  }
};
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj)
};
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd)
};
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if(arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj)
  }else {
    goog.array.insertAt(arr, obj, i)
  }
};
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if(rv = i >= 0) {
    goog.array.removeAt(arr, i)
  }
  return rv
};
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1
};
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if(i >= 0) {
    goog.array.removeAt(arr, i);
    return true
  }
  return false
};
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments)
};
goog.array.clone = function(arr) {
  if(goog.isArray(arr)) {
    return goog.array.concat(arr)
  }else {
    var rv = [];
    for(var i = 0, len = arr.length;i < len;i++) {
      rv[i] = arr[i]
    }
    return rv
  }
};
goog.array.toArray = function(object) {
  if(goog.isArray(object)) {
    return goog.array.concat(object)
  }
  return goog.array.clone(object)
};
goog.array.extend = function(arr1, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var arr2 = arguments[i];
    var isArrayLike;
    if(goog.isArray(arr2) || (isArrayLike = goog.isArrayLike(arr2)) && arr2.hasOwnProperty("callee")) {
      arr1.push.apply(arr1, arr2)
    }else {
      if(isArrayLike) {
        var len1 = arr1.length;
        var len2 = arr2.length;
        for(var j = 0;j < len2;j++) {
          arr1[len1 + j] = arr2[j]
        }
      }else {
        arr1.push(arr2)
      }
    }
  }
};
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.apply(arr, goog.array.slice(arguments, 1))
};
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);
  if(arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start)
  }else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end)
  }
};
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while(cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = goog.isObject(current) ? "o" + goog.getUid(current) : (typeof current).charAt(0) + current;
    if(!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current
    }
  }
  returnArray.length = cursorInsert
};
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr, opt_compareFn || goog.array.defaultCompare, false, target)
};
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true, undefined, opt_obj)
};
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;
  var right = arr.length;
  var found;
  while(left < right) {
    var middle = left + right >> 1;
    var compareResult;
    if(isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr)
    }else {
      compareResult = compareFn(opt_target, arr[middle])
    }
    if(compareResult > 0) {
      left = middle + 1
    }else {
      right = middle;
      found = !compareResult
    }
  }
  return found ? left : ~left
};
goog.array.sort = function(arr, opt_compareFn) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.sort.call(arr, opt_compareFn || goog.array.defaultCompare)
};
goog.array.stableSort = function(arr, opt_compareFn) {
  for(var i = 0;i < arr.length;i++) {
    arr[i] = {index:i, value:arr[i]}
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index
  }
  goog.array.sort(arr, stableCompareFn);
  for(var i = 0;i < arr.length;i++) {
    arr[i] = arr[i].value
  }
};
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key])
  })
};
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for(var i = 1;i < arr.length;i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if(compareResult > 0 || compareResult == 0 && opt_strict) {
      return false
    }
  }
  return true
};
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if(!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) || arr1.length != arr2.length) {
    return false
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for(var i = 0;i < l;i++) {
    if(!equalsFn(arr1[i], arr2[i])) {
      return false
    }
  }
  return true
};
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn)
};
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for(var i = 0;i < l;i++) {
    var result = compare(arr1[i], arr2[i]);
    if(result != 0) {
      return result
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length)
};
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0
};
goog.array.defaultCompareEquality = function(a, b) {
  return a === b
};
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if(index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true
  }
  return false
};
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return index >= 0 ? goog.array.removeAt(array, index) : false
};
goog.array.bucket = function(array, sorter) {
  var buckets = {};
  for(var i = 0;i < array.length;i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if(goog.isDef(key)) {
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value)
    }
  }
  return buckets
};
goog.array.repeat = function(value, n) {
  var array = [];
  for(var i = 0;i < n;i++) {
    array[i] = value
  }
  return array
};
goog.array.flatten = function(var_args) {
  var result = [];
  for(var i = 0;i < arguments.length;i++) {
    var element = arguments[i];
    if(goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element))
    }else {
      result.push(element)
    }
  }
  return result
};
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);
  if(array.length) {
    n %= array.length;
    if(n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n))
    }else {
      if(n < 0) {
        goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n))
      }
    }
  }
  return array
};
goog.array.zip = function(var_args) {
  if(!arguments.length) {
    return[]
  }
  var result = [];
  for(var i = 0;true;i++) {
    var value = [];
    for(var j = 0;j < arguments.length;j++) {
      var arr = arguments[j];
      if(i >= arr.length) {
        return result
      }
      value.push(arr[i])
    }
    result.push(value)
  }
};
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;
  for(var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp
  }
};
goog.provide("goog.crypt");
goog.require("goog.array");
goog.crypt.stringToByteArray = function(str) {
  var output = [], p = 0;
  for(var i = 0;i < str.length;i++) {
    var c = str.charCodeAt(i);
    while(c > 255) {
      output[p++] = c & 255;
      c >>= 8
    }
    output[p++] = c
  }
  return output
};
goog.crypt.byteArrayToString = function(array) {
  return String.fromCharCode.apply(null, array)
};
goog.crypt.byteArrayToHex = function(array) {
  return goog.array.map(array, function(numByte) {
    var hexByte = numByte.toString(16);
    return hexByte.length > 1 ? hexByte : "0" + hexByte
  }).join("")
};
goog.crypt.stringToUtf8ByteArray = function(str) {
  str = str.replace(/\r\n/g, "\n");
  var out = [], p = 0;
  for(var i = 0;i < str.length;i++) {
    var c = str.charCodeAt(i);
    if(c < 128) {
      out[p++] = c
    }else {
      if(c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128
      }else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128
      }
    }
  }
  return out
};
goog.crypt.utf8ByteArrayToString = function(bytes) {
  var out = [], pos = 0, c = 0;
  while(pos < bytes.length) {
    var c1 = bytes[pos++];
    if(c1 < 128) {
      out[c++] = String.fromCharCode(c1)
    }else {
      if(c1 > 191 && c1 < 224) {
        var c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63)
      }else {
        var c2 = bytes[pos++];
        var c3 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63)
      }
    }
  }
  return out.join("")
};
goog.provide("goog.crypt.Hash");
goog.crypt.Hash = function() {
};
goog.crypt.Hash.prototype.reset = goog.abstractMethod;
goog.crypt.Hash.prototype.update = goog.abstractMethod;
goog.crypt.Hash.prototype.digest = goog.abstractMethod;
goog.provide("goog.crypt.Sha1");
goog.require("goog.crypt.Hash");
goog.crypt.Sha1 = function() {
  goog.base(this);
  this.chain_ = [];
  this.buf_ = [];
  this.W_ = [];
  this.pad_ = [];
  this.pad_[0] = 128;
  for(var i = 1;i < 64;++i) {
    this.pad_[i] = 0
  }
  this.reset()
};
goog.inherits(goog.crypt.Sha1, goog.crypt.Hash);
goog.crypt.Sha1.prototype.reset = function() {
  this.chain_[0] = 1732584193;
  this.chain_[1] = 4023233417;
  this.chain_[2] = 2562383102;
  this.chain_[3] = 271733878;
  this.chain_[4] = 3285377520;
  this.inbuf_ = 0;
  this.total_ = 0
};
goog.crypt.Sha1.prototype.compress_ = function(buf, opt_offset) {
  if(!opt_offset) {
    opt_offset = 0
  }
  var W = this.W_;
  for(var i = opt_offset;i < opt_offset + 64;i += 4) {
    var w = buf[i] << 24 | buf[i + 1] << 16 | buf[i + 2] << 8 | buf[i + 3];
    W[i / 4] = w
  }
  for(var i = 16;i < 80;i++) {
    var t = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
    W[i] = (t << 1 | t >>> 31) & 4294967295
  }
  var a = this.chain_[0];
  var b = this.chain_[1];
  var c = this.chain_[2];
  var d = this.chain_[3];
  var e = this.chain_[4];
  var f, k;
  for(var i = 0;i < 80;i++) {
    if(i < 40) {
      if(i < 20) {
        f = d ^ b & (c ^ d);
        k = 1518500249
      }else {
        f = b ^ c ^ d;
        k = 1859775393
      }
    }else {
      if(i < 60) {
        f = b & c | d & (b | c);
        k = 2400959708
      }else {
        f = b ^ c ^ d;
        k = 3395469782
      }
    }
    var t = (a << 5 | a >>> 27) + f + e + k + W[i] & 4294967295;
    e = d;
    d = c;
    c = (b << 30 | b >>> 2) & 4294967295;
    b = a;
    a = t
  }
  this.chain_[0] = this.chain_[0] + a & 4294967295;
  this.chain_[1] = this.chain_[1] + b & 4294967295;
  this.chain_[2] = this.chain_[2] + c & 4294967295;
  this.chain_[3] = this.chain_[3] + d & 4294967295;
  this.chain_[4] = this.chain_[4] + e & 4294967295
};
goog.crypt.Sha1.prototype.update = function(bytes, opt_length) {
  if(!goog.isDef(opt_length)) {
    opt_length = bytes.length
  }
  var buf = this.buf_;
  var inbuf = this.inbuf_;
  var n = 0;
  if(goog.isString(bytes)) {
    while(n < opt_length) {
      buf[inbuf++] = bytes.charCodeAt(n++);
      if(inbuf == 64) {
        this.compress_(buf);
        inbuf = 0
      }
    }
  }else {
    while(n < opt_length) {
      buf[inbuf++] = bytes[n++];
      if(inbuf == 64) {
        this.compress_(buf);
        inbuf = 0
      }
    }
  }
  this.inbuf_ = inbuf;
  this.total_ += opt_length
};
goog.crypt.Sha1.prototype.digest = function() {
  var digest = [];
  var totalBits = this.total_ * 8;
  if(this.inbuf_ < 56) {
    this.update(this.pad_, 56 - this.inbuf_)
  }else {
    this.update(this.pad_, 64 - (this.inbuf_ - 56))
  }
  for(var i = 63;i >= 56;i--) {
    this.buf_[i] = totalBits & 255;
    totalBits /= 256
  }
  this.compress_(this.buf_);
  var n = 0;
  for(var i = 0;i < 5;i++) {
    for(var j = 24;j >= 0;j -= 8) {
      digest[n++] = this.chain_[i] >> j & 255
    }
  }
  return digest
};
goog.provide("goog.userAgent");
goog.require("goog.string");
goog.userAgent.ASSUME_IE = false;
goog.userAgent.ASSUME_GECKO = false;
goog.userAgent.ASSUME_WEBKIT = false;
goog.userAgent.ASSUME_MOBILE_WEBKIT = false;
goog.userAgent.ASSUME_OPERA = false;
goog.userAgent.ASSUME_ANY_VERSION = false;
goog.userAgent.BROWSER_KNOWN_ = goog.userAgent.ASSUME_IE || goog.userAgent.ASSUME_GECKO || goog.userAgent.ASSUME_MOBILE_WEBKIT || goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_OPERA;
goog.userAgent.getUserAgentString = function() {
  return goog.global["navigator"] ? goog.global["navigator"].userAgent : null
};
goog.userAgent.getNavigator = function() {
  return goog.global["navigator"]
};
goog.userAgent.init_ = function() {
  goog.userAgent.detectedOpera_ = false;
  goog.userAgent.detectedIe_ = false;
  goog.userAgent.detectedWebkit_ = false;
  goog.userAgent.detectedMobile_ = false;
  goog.userAgent.detectedGecko_ = false;
  var ua;
  if(!goog.userAgent.BROWSER_KNOWN_ && (ua = goog.userAgent.getUserAgentString())) {
    var navigator = goog.userAgent.getNavigator();
    goog.userAgent.detectedOpera_ = ua.indexOf("Opera") == 0;
    goog.userAgent.detectedIe_ = !goog.userAgent.detectedOpera_ && ua.indexOf("MSIE") != -1;
    goog.userAgent.detectedWebkit_ = !goog.userAgent.detectedOpera_ && ua.indexOf("WebKit") != -1;
    goog.userAgent.detectedMobile_ = goog.userAgent.detectedWebkit_ && ua.indexOf("Mobile") != -1;
    goog.userAgent.detectedGecko_ = !goog.userAgent.detectedOpera_ && !goog.userAgent.detectedWebkit_ && navigator.product == "Gecko"
  }
};
if(!goog.userAgent.BROWSER_KNOWN_) {
  goog.userAgent.init_()
}
goog.userAgent.OPERA = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_OPERA : goog.userAgent.detectedOpera_;
goog.userAgent.IE = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_IE : goog.userAgent.detectedIe_;
goog.userAgent.GECKO = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_GECKO : goog.userAgent.detectedGecko_;
goog.userAgent.WEBKIT = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_MOBILE_WEBKIT : goog.userAgent.detectedWebkit_;
goog.userAgent.MOBILE = goog.userAgent.ASSUME_MOBILE_WEBKIT || goog.userAgent.detectedMobile_;
goog.userAgent.SAFARI = goog.userAgent.WEBKIT;
goog.userAgent.determinePlatform_ = function() {
  var navigator = goog.userAgent.getNavigator();
  return navigator && navigator.platform || ""
};
goog.userAgent.PLATFORM = goog.userAgent.determinePlatform_();
goog.userAgent.ASSUME_MAC = false;
goog.userAgent.ASSUME_WINDOWS = false;
goog.userAgent.ASSUME_LINUX = false;
goog.userAgent.ASSUME_X11 = false;
goog.userAgent.PLATFORM_KNOWN_ = goog.userAgent.ASSUME_MAC || goog.userAgent.ASSUME_WINDOWS || goog.userAgent.ASSUME_LINUX || goog.userAgent.ASSUME_X11;
goog.userAgent.initPlatform_ = function() {
  goog.userAgent.detectedMac_ = goog.string.contains(goog.userAgent.PLATFORM, "Mac");
  goog.userAgent.detectedWindows_ = goog.string.contains(goog.userAgent.PLATFORM, "Win");
  goog.userAgent.detectedLinux_ = goog.string.contains(goog.userAgent.PLATFORM, "Linux");
  goog.userAgent.detectedX11_ = !!goog.userAgent.getNavigator() && goog.string.contains(goog.userAgent.getNavigator()["appVersion"] || "", "X11")
};
if(!goog.userAgent.PLATFORM_KNOWN_) {
  goog.userAgent.initPlatform_()
}
goog.userAgent.MAC = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_MAC : goog.userAgent.detectedMac_;
goog.userAgent.WINDOWS = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_WINDOWS : goog.userAgent.detectedWindows_;
goog.userAgent.LINUX = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_LINUX : goog.userAgent.detectedLinux_;
goog.userAgent.X11 = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_X11 : goog.userAgent.detectedX11_;
goog.userAgent.determineVersion_ = function() {
  var version = "", re;
  if(goog.userAgent.OPERA && goog.global["opera"]) {
    var operaVersion = goog.global["opera"].version;
    version = typeof operaVersion == "function" ? operaVersion() : operaVersion
  }else {
    if(goog.userAgent.GECKO) {
      re = /rv\:([^\);]+)(\)|;)/
    }else {
      if(goog.userAgent.IE) {
        re = /MSIE\s+([^\);]+)(\)|;)/
      }else {
        if(goog.userAgent.WEBKIT) {
          re = /WebKit\/(\S+)/
        }
      }
    }
    if(re) {
      var arr = re.exec(goog.userAgent.getUserAgentString());
      version = arr ? arr[1] : ""
    }
  }
  if(goog.userAgent.IE) {
    var docMode = goog.userAgent.getDocumentMode_();
    if(docMode > parseFloat(version)) {
      return String(docMode)
    }
  }
  return version
};
goog.userAgent.getDocumentMode_ = function() {
  var doc = goog.global["document"];
  return doc ? doc["documentMode"] : undefined
};
goog.userAgent.VERSION = goog.userAgent.determineVersion_();
goog.userAgent.compare = function(v1, v2) {
  return goog.string.compareVersions(v1, v2)
};
goog.userAgent.isVersionCache_ = {};
goog.userAgent.isVersion = function(version) {
  return goog.userAgent.ASSUME_ANY_VERSION || goog.userAgent.isVersionCache_[version] || (goog.userAgent.isVersionCache_[version] = goog.string.compareVersions(goog.userAgent.VERSION, version) >= 0)
};
goog.userAgent.isDocumentModeCache_ = {};
goog.userAgent.isDocumentMode = function(documentMode) {
  return goog.userAgent.isDocumentModeCache_[documentMode] || (goog.userAgent.isDocumentModeCache_[documentMode] = goog.userAgent.IE && document.documentMode && document.documentMode >= documentMode)
};
goog.provide("goog.crypt.base64");
goog.require("goog.crypt");
goog.require("goog.userAgent");
goog.crypt.base64.byteToCharMap_ = null;
goog.crypt.base64.charToByteMap_ = null;
goog.crypt.base64.byteToCharMapWebSafe_ = null;
goog.crypt.base64.charToByteMapWebSafe_ = null;
goog.crypt.base64.ENCODED_VALS_BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789";
goog.crypt.base64.ENCODED_VALS = goog.crypt.base64.ENCODED_VALS_BASE + "+/=";
goog.crypt.base64.ENCODED_VALS_WEBSAFE = goog.crypt.base64.ENCODED_VALS_BASE + "-_.";
goog.crypt.base64.HAS_NATIVE_SUPPORT = goog.userAgent.GECKO || goog.userAgent.WEBKIT || goog.userAgent.OPERA || typeof goog.global.atob == "function";
goog.crypt.base64.encodeByteArray = function(input, opt_webSafe) {
  if(!goog.isArrayLike(input)) {
    throw Error("encodeByteArray takes an array as a parameter");
  }
  goog.crypt.base64.init_();
  var byteToCharMap = opt_webSafe ? goog.crypt.base64.byteToCharMapWebSafe_ : goog.crypt.base64.byteToCharMap_;
  var output = [];
  for(var i = 0;i < input.length;i += 3) {
    var byte1 = input[i];
    var haveByte2 = i + 1 < input.length;
    var byte2 = haveByte2 ? input[i + 1] : 0;
    var haveByte3 = i + 2 < input.length;
    var byte3 = haveByte3 ? input[i + 2] : 0;
    var outByte1 = byte1 >> 2;
    var outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
    var outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
    var outByte4 = byte3 & 63;
    if(!haveByte3) {
      outByte4 = 64;
      if(!haveByte2) {
        outByte3 = 64
      }
    }
    output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4])
  }
  return output.join("")
};
goog.crypt.base64.encodeString = function(input, opt_webSafe) {
  if(goog.crypt.base64.HAS_NATIVE_SUPPORT && !opt_webSafe) {
    return goog.global.btoa(input)
  }
  return goog.crypt.base64.encodeByteArray(goog.crypt.stringToByteArray(input), opt_webSafe)
};
goog.crypt.base64.decodeString = function(input, opt_webSafe) {
  if(goog.crypt.base64.HAS_NATIVE_SUPPORT && !opt_webSafe) {
    return goog.global.atob(input)
  }
  return goog.crypt.byteArrayToString(goog.crypt.base64.decodeStringToByteArray(input, opt_webSafe))
};
goog.crypt.base64.decodeStringToByteArray = function(input, opt_webSafe) {
  goog.crypt.base64.init_();
  var charToByteMap = opt_webSafe ? goog.crypt.base64.charToByteMapWebSafe_ : goog.crypt.base64.charToByteMap_;
  var output = [];
  for(var i = 0;i < input.length;) {
    var byte1 = charToByteMap[input.charAt(i++)];
    var haveByte2 = i < input.length;
    var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
    ++i;
    var haveByte3 = i < input.length;
    var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 0;
    ++i;
    var haveByte4 = i < input.length;
    var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 0;
    ++i;
    if(byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
      throw Error();
    }
    var outByte1 = byte1 << 2 | byte2 >> 4;
    output.push(outByte1);
    if(byte3 != 64) {
      var outByte2 = byte2 << 4 & 240 | byte3 >> 2;
      output.push(outByte2);
      if(byte4 != 64) {
        var outByte3 = byte3 << 6 & 192 | byte4;
        output.push(outByte3)
      }
    }
  }
  return output
};
goog.crypt.base64.init_ = function() {
  if(!goog.crypt.base64.byteToCharMap_) {
    goog.crypt.base64.byteToCharMap_ = {};
    goog.crypt.base64.charToByteMap_ = {};
    goog.crypt.base64.byteToCharMapWebSafe_ = {};
    goog.crypt.base64.charToByteMapWebSafe_ = {};
    for(var i = 0;i < goog.crypt.base64.ENCODED_VALS.length;i++) {
      goog.crypt.base64.byteToCharMap_[i] = goog.crypt.base64.ENCODED_VALS.charAt(i);
      goog.crypt.base64.charToByteMap_[goog.crypt.base64.byteToCharMap_[i]] = i;
      goog.crypt.base64.byteToCharMapWebSafe_[i] = goog.crypt.base64.ENCODED_VALS_WEBSAFE.charAt(i);
      goog.crypt.base64.charToByteMapWebSafe_[goog.crypt.base64.byteToCharMapWebSafe_[i]] = i
    }
  }
};
goog.provide("fb.core.util");
goog.require("goog.crypt");
goog.require("goog.crypt.base64");
goog.require("goog.crypt.Sha1");
fb.core.util.LUIDGenerator = function() {
  var id = 1;
  return function() {
    return id++
  }
}();
fb.core.util.assert = function(assertion, message) {
  if(!assertion) {
    throw new Error("Firebase INTERNAL ASSERT FAILED:" + message);
  }
};
fb.core.util.assertWeak = function(assertion, message) {
  if(!assertion) {
    fb.core.util.error(message)
  }
};
fb.core.util.base64Encode = function(str) {
  var utf8Bytes = fb.core.util.utf8.stringToByteArray(str);
  var base64String = goog.crypt.base64.encodeByteArray(utf8Bytes, true);
  return base64String
};
fb.core.util.sha1 = function(str) {
  var utf8Bytes = fb.core.util.utf8.stringToByteArray(str);
  var sha1 = new goog.crypt.Sha1;
  sha1.update(utf8Bytes);
  var sha1Bytes = sha1.digest();
  return goog.crypt.base64.encodeByteArray(sha1Bytes)
};
fb.core.util.buildLogMessage_ = function() {
  var message = "";
  for(var i = 0;i < arguments.length;i++) {
    if(goog.isArrayLike(arguments[i])) {
      message += fb.core.util.buildLogMessage_.apply(null, arguments[i])
    }else {
      if(typeof arguments[i] === "object") {
        message += fb.core.util.json.stringify(arguments[i])
      }else {
        message += arguments[i]
      }
    }
    message += " "
  }
  return message
};
fb.core.util.logger = null;
fb.core.util.log = function() {
  if(fb.core.util.logger) {
    var message = fb.core.util.buildLogMessage_.apply(null, arguments);
    fb.core.util.logger(message)
  }
};
fb.core.util.error = function() {
  if(typeof console !== "undefined") {
    var message = fb.core.util.buildLogMessage_.apply(null, arguments);
    console.log("FIREBASE INTERNAL ERROR: " + message)
  }
};
fb.core.util.parseURL = function(dataURL) {
  var host = "", namespace = "", secure = false, pathString = "";
  if(goog.isString(dataURL)) {
    var colonInd = dataURL.indexOf("://");
    if(colonInd > 0) {
      secure = dataURL.substring(0, colonInd) === "https";
      dataURL = dataURL.substring(colonInd + 3)
    }
    var slashInd = dataURL.indexOf("/");
    if(slashInd > 0) {
      host = dataURL.substring(0, slashInd);
      dataURL = dataURL.substring(slashInd + 1);
      slashInd = dataURL.indexOf("/");
      if(slashInd > 0) {
        namespace = dataURL.substring(0, slashInd);
        pathString = dataURL.substring(slashInd)
      }else {
        namespace = dataURL;
        pathString = "/"
      }
    }
  }
  return{repoInfo:{host:host, secure:secure, namespace:namespace}, path:new fb.core.util.Path(pathString)}
};
fb.core.util.NUM_REGEX_ = /^[\-+]?[0-9]*\.?[0-9]+$/;
fb.core.util.isNumeric = function(str) {
  return fb.core.util.NUM_REGEX_.test(str)
};
fb.core.util.executeWhenDOMReady = function(fn) {
  if(document.readyState === "complete") {
    fn()
  }else {
    var called = false;
    var wrappedFn = function() {
      if(!document.body) {
        setTimeout(wrappedFn, 10);
        return
      }
      if(!called) {
        called = true;
        fn()
      }
    };
    if(document.addEventListener) {
      document.addEventListener("DOMContentLoaded", wrappedFn, false);
      window.addEventListener("load", wrappedFn, false)
    }else {
      if(document.attachEvent) {
        document.attachEvent("onreadystatechange", function() {
          if(document.readyState === "complete") {
            wrappedFn()
          }
        }, false);
        window.attachEvent("onload", wrappedFn, false)
      }
    }
  }
};
fb.core.util.priorityCompare = function(a, b) {
  if(a !== b) {
    if(a === null) {
      return-1
    }else {
      if(b === null) {
        return 1
      }
    }
    if(typeof a !== typeof b) {
      return typeof a === "number" ? -1 : 1
    }else {
      return a > b ? 1 : -1
    }
  }
  return 0
};
fb.core.util.nameCompare = function(a, b) {
  if(a !== b) {
    return a < b ? -1 : 1
  }
  return 0
};
fb.core.util.clockDelta_ = 0;
fb.core.util.setClockDelta = function(delta) {
  fb.core.util.clockDelta_ = delta
};
fb.core.util.getTime = function() {
  return(new Date).getTime() + fb.core.util.clockDelta_
};
fb.core.util.ObjectToUniqueKey = function(obj) {
  if(typeof obj !== "object" || obj === null) {
    return fb.core.util.json.stringify(obj)
  }
  var keys = [];
  for(var k in obj) {
    keys.push(k)
  }
  keys.sort();
  var key = "{";
  for(var i = 0;i < keys.length;i++) {
    if(i !== 0) {
      key += ","
    }
    key += fb.core.util.json.stringify(keys[i]);
    key += ":";
    key += fb.core.util.ObjectToUniqueKey(obj[keys[i]])
  }
  key += "}";
  return key
};
goog.provide("fb.core.snap.LeafNode");
goog.require("fb.core.util");
fb.core.snap.LeafNode = function(value, opt_priority) {
  this.value_ = value;
  fb.core.util.assert(this.value_ !== null, "LeafNode shouldn't be created with null value.");
  this.priority_ = typeof opt_priority !== "undefined" ? opt_priority : null
};
fb.core.snap.LeafNode.prototype.isLeafNode = function() {
  return true
};
fb.core.snap.LeafNode.prototype.getPriority = function() {
  return this.priority_
};
fb.core.snap.LeafNode.prototype.updatePriority = function(newPriority) {
  return new fb.core.snap.LeafNode(this.value_, newPriority)
};
fb.core.snap.LeafNode.prototype.updateValue = function(newValue) {
  return new fb.core.snap.LeafNode(newValue, this.priority_)
};
fb.core.snap.LeafNode.prototype.getImmediateChild = function(childName) {
  return fb.core.snap.EMPTY_NODE
};
fb.core.snap.LeafNode.prototype.getChild = function(path) {
  return path.getFront() === null ? this : fb.core.snap.EMPTY_NODE
};
fb.core.snap.LeafNode.prototype.getPredecessorChildName = function(childName, childNode) {
  return null
};
fb.core.snap.LeafNode.prototype.updateImmediateChild = function(childName, newChildNode) {
  var childrenNode = new fb.core.snap.ChildrenNode(new fb.core.util.SortedMap, this.priority_);
  return childrenNode.updateImmediateChild(childName, newChildNode)
};
fb.core.snap.LeafNode.prototype.updateChild = function(path, newChildNode) {
  var front = path.getFront();
  if(front === null) {
    return newChildNode
  }
  return this.updateImmediateChild(front, fb.core.snap.EMPTY_NODE.updateChild(path.popFront(), newChildNode))
};
fb.core.snap.LeafNode.prototype.isEmpty = function() {
  return false
};
fb.core.snap.LeafNode.prototype.val = function(opt_exportFormat) {
  if(opt_exportFormat && this.getPriority() !== null) {
    return{".value":this.getValue(), ".priority":"" + this.getPriority()}
  }else {
    return this.getValue()
  }
};
fb.core.snap.LeafNode.prototype.hash = function() {
  var toHash = "";
  if(this.getPriority() !== null) {
    toHash += "priority:" + this.getPriority() + ":"
  }
  toHash += typeof this.value_ + ":" + this.value_;
  return fb.core.util.sha1(toHash)
};
fb.core.snap.LeafNode.prototype.getValue = function() {
  return this.value_
};
if(goog.DEBUG) {
  fb.core.snap.LeafNode.prototype.toString = function() {
    return typeof this.value_ === "string" ? '"' + this.value_ + '"' : this.value_
  }
}
;goog.provide("fb.core.snap.ChildrenNode");
goog.require("fb.core.util.SortedMap");
fb.core.snap.ChildrenNode = function(opt_children, opt_priority) {
  this.children_ = opt_children || new fb.core.util.SortedMap;
  this.priority_ = typeof opt_priority !== "undefined" ? opt_priority : null
};
fb.core.snap.ChildrenNode.prototype.isLeafNode = function() {
  return false
};
fb.core.snap.ChildrenNode.prototype.getPriority = function() {
  return this.priority_
};
fb.core.snap.ChildrenNode.prototype.updatePriority = function(newPriority) {
  return new fb.core.snap.ChildrenNode(this.children_, newPriority)
};
fb.core.snap.ChildrenNode.prototype.updateValue = function(newValue) {
  return new fb.core.snap.LeafNode(newValue, this.priority_)
};
fb.core.snap.ChildrenNode.prototype.updateImmediateChild = function(childName, newChildNode) {
  var newChildren = this.children_.remove(childName);
  if(newChildNode && newChildNode.isEmpty()) {
    newChildNode = null
  }
  if(newChildNode !== null) {
    newChildren = newChildren.insert(childName, newChildNode)
  }
  if(newChildNode && newChildNode.getPriority() !== null) {
    return new fb.core.snap.SortedChildrenNode(newChildren, null, this.priority_)
  }else {
    return new fb.core.snap.ChildrenNode(newChildren, this.priority_)
  }
};
fb.core.snap.ChildrenNode.prototype.updateChild = function(path, newChildNode) {
  var front = path.getFront();
  if(front === null) {
    return newChildNode
  }
  var newImmediateChild = this.getImmediateChild(front).updateChild(path.popFront(), newChildNode);
  return this.updateImmediateChild(front, newImmediateChild)
};
fb.core.snap.ChildrenNode.prototype.isEmpty = function() {
  return this.children_.isEmpty()
};
fb.core.snap.ChildrenNode.INTEGER_REGEXP_ = /^\d+$/;
fb.core.snap.ChildrenNode.prototype.val = function(opt_exportFormat) {
  if(this.isEmpty()) {
    return null
  }
  var obj = {};
  var numKeys = 0, maxKey = 0, allIntegerKeys = true;
  this.forEachChild(function(key, childNode) {
    obj[key] = childNode.val(opt_exportFormat);
    numKeys++;
    if(allIntegerKeys && fb.core.snap.ChildrenNode.INTEGER_REGEXP_.test(key)) {
      maxKey = Math.max(maxKey, Number(key))
    }else {
      allIntegerKeys = false
    }
  });
  if(!opt_exportFormat && allIntegerKeys && maxKey < 2 * numKeys) {
    var array = [];
    for(var key in obj) {
      array[key] = obj[key]
    }
    return array
  }else {
    if(opt_exportFormat && this.getPriority() !== null) {
      obj[".priority"] = "" + this.getPriority()
    }
    return obj
  }
};
fb.core.snap.ChildrenNode.prototype.hash = function() {
  var toHash = "";
  if(this.getPriority() !== null) {
    toHash += "priority:" + this.getPriority() + ":"
  }
  this.forEachChild(function(key, childNode) {
    var childHash = childNode.hash();
    if(childHash !== "") {
      toHash += ":" + key + ":" + childHash
    }
  });
  return toHash === "" ? "" : fb.core.util.sha1(toHash)
};
fb.core.snap.ChildrenNode.prototype.getImmediateChild = function(childName) {
  var child = this.children_.get(childName);
  return child === null ? fb.core.snap.EMPTY_NODE : child
};
fb.core.snap.ChildrenNode.prototype.getChild = function(path) {
  var front = path.getFront();
  if(front === null) {
    return this
  }
  return this.getImmediateChild(front).getChild(path.popFront())
};
fb.core.snap.ChildrenNode.prototype.getPredecessorChildName = function(childName, childNode) {
  return this.children_.getPredecessorKey(childName)
};
fb.core.snap.ChildrenNode.prototype.getFirstChildName = function() {
  return this.children_.minKey()
};
fb.core.snap.ChildrenNode.prototype.getLastChildName = function() {
  return this.children_.maxKey()
};
fb.core.snap.ChildrenNode.prototype.forEachChild = function(action) {
  return this.children_.inorderTraversal(action)
};
fb.core.snap.ChildrenNode.prototype.forEachChildReverse = function(action) {
  return this.children_.reverseTraversal(action)
};
fb.core.snap.ChildrenNode.prototype.getIterator = function() {
  return this.children_.getIterator()
};
if(goog.DEBUG) {
  fb.core.snap.ChildrenNode.prototype.toString = function() {
    var s = "{";
    var first = true;
    this.forEachChild(function(key, value) {
      if(first) {
        first = false
      }else {
        s += ", "
      }
      s += '"' + key + '" : ' + value.toString()
    });
    s += "}";
    return s
  }
}
fb.core.snap.EMPTY_NODE = new fb.core.snap.ChildrenNode(new fb.core.util.SortedMap);
goog.provide("fb.core.snap.SortedChildrenNode");
goog.require("fb.core.util.SortedMap");
fb.core.snap.SortedChildrenNode = function(children, sortedChildren, opt_priority) {
  fb.core.snap.ChildrenNode.call(this, children, opt_priority);
  if(sortedChildren === null) {
    sortedChildren = new fb.core.util.SortedMap(fb.core.snap.NAME_AND_PRIORITY_COMPARATOR);
    children.inorderTraversal(function(name, node) {
      sortedChildren = sortedChildren.insert({name:name, priority:node.getPriority()}, node)
    })
  }
  this.sortedChildren_ = sortedChildren
};
goog.inherits(fb.core.snap.SortedChildrenNode, fb.core.snap.ChildrenNode);
fb.core.snap.SortedChildrenNode.prototype.updateImmediateChild = function(childName, newChildNode) {
  var oldChildNode = this.getImmediateChild(childName);
  var newChildren = this.children_, newSortedChildren = this.sortedChildren_;
  if(oldChildNode !== null) {
    newChildren = newChildren.remove(childName);
    newSortedChildren = newSortedChildren.remove({name:childName, priority:oldChildNode.getPriority()})
  }
  if(newChildNode && newChildNode.isEmpty()) {
    newChildNode = null
  }
  if(newChildNode !== null) {
    newChildren = newChildren.insert(childName, newChildNode);
    newSortedChildren = newSortedChildren.insert({name:childName, priority:newChildNode.getPriority()}, newChildNode)
  }
  return new fb.core.snap.SortedChildrenNode(newChildren, newSortedChildren, this.getPriority())
};
fb.core.snap.SortedChildrenNode.prototype.getPredecessorChildName = function(childName, childNode) {
  var pred = this.sortedChildren_.getPredecessorKey({name:childName, priority:childNode.getPriority()});
  return pred ? pred.name : null
};
fb.core.snap.SortedChildrenNode.prototype.forEachChild = function(action) {
  return this.sortedChildren_.inorderTraversal(function(key, value) {
    return action(key.name, value)
  })
};
fb.core.snap.SortedChildrenNode.prototype.forEachChildReverse = function(action) {
  return this.sortedChildren_.reverseTraversal(function(key, value) {
    return action(key.name, value)
  })
};
fb.core.snap.SortedChildrenNode.prototype.getIterator = function() {
  return this.sortedChildren_.getIterator(function(key, value) {
    return{key:key.name, value:value}
  })
};
fb.core.snap.SortedChildrenNode.prototype.getFirstChildName = function() {
  return this.sortedChildren_.minKey().name
};
fb.core.snap.SortedChildrenNode.prototype.getLastChildName = function() {
  return this.sortedChildren_.maxKey().name
};
goog.provide("fb.core.snap");
goog.require("fb.core.snap.LeafNode");
goog.require("fb.core.snap.ChildrenNode");
goog.require("fb.core.snap.SortedChildrenNode");
fb.core.snap.NodeFromJSON = function(json, opt_priority) {
  if(typeof json !== "object") {
    return new fb.core.snap.LeafNode(json, opt_priority)
  }
  if(json === null) {
    return fb.core.snap.EMPTY_NODE
  }
  var priority = null;
  if(".priority" in json) {
    priority = json[".priority"]
  }else {
    if(typeof opt_priority !== "undefined") {
      priority = opt_priority
    }
  }
  if(priority !== null) {
    priority = fb.core.util.isNumeric(priority) ? Number(priority) : priority
  }
  if(".value" in json && json[".value"] !== null) {
    return new fb.core.snap.LeafNode(json[".value"], priority)
  }
  var node = new fb.core.snap.ChildrenNode(new fb.core.util.SortedMap, priority);
  for(var key in json) {
    if(key.substring(0, 1) !== ".") {
      var childNode = fb.core.snap.NodeFromJSON(json[key]);
      if(childNode.isLeafNode() || !childNode.isEmpty()) {
        node = node.updateImmediateChild(key, childNode)
      }
    }
  }
  return node
};
fb.core.snap.NAME_AND_PRIORITY_COMPARATOR = function(left, right) {
  return fb.core.util.priorityCompare(left.priority, right.priority) || fb.core.util.nameCompare(left.name, right.name)
};
goog.provide("fb.api.DataSnapshot");
goog.require("fb.core.util.SortedMap");
goog.require("fb.core.snap");
goog.require("fb.core.util_validation");
fb.api.DataSnapshot = function(node, ref) {
  this.node_ = node;
  this.ref_ = ref
};
fb.api.DataSnapshot.prototype.val = function() {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.val", 0, 0, arguments.length);
  return this.node_.val()
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "val", fb.api.DataSnapshot.prototype.val);
fb.api.DataSnapshot.prototype.exportVal = function() {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.exportVal", 0, 0, arguments.length);
  return this.node_.val(true)
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "exportVal", fb.api.DataSnapshot.prototype.exportVal);
fb.api.DataSnapshot.prototype.child = function(childPathString) {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.child", 0, 1, arguments.length);
  if(goog.isNumber(childPathString)) {
    childPathString = String(childPathString)
  }
  fb.core.util.validatePathString("Firebase.DataSnapshot.child", 1, childPathString, false);
  var childPath = new fb.core.util.Path(childPathString);
  var childRef = this.ref_.child(childPath);
  return new fb.api.DataSnapshot(this.node_.getChild(childPath), childRef)
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "child", fb.api.DataSnapshot.prototype.child);
fb.api.DataSnapshot.prototype.hasChild = function(childPathString) {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.hasChild", 1, 1, arguments.length);
  fb.core.util.validatePathString("Firebase.DataSnapshot.hasChild", 1, childPathString, false);
  var childPath = new fb.core.util.Path(childPathString);
  return!this.node_.getChild(childPath).isEmpty()
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "hasChild", fb.api.DataSnapshot.prototype.hasChild);
fb.api.DataSnapshot.prototype.getPriority = function() {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.getPriority", 0, 0, arguments.length);
  var priority = this.node_.getPriority();
  return priority === null ? priority : "" + priority
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "getPriority", fb.api.DataSnapshot.prototype.getPriority);
fb.api.DataSnapshot.prototype.forEach = function(action) {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.forEach", 1, 1, arguments.length);
  fb.core.util.validateCallback("Firebase.DataSnapshot.forEach", 1, action, false);
  if(this.node_.isLeafNode()) {
    return false
  }
  var self = this;
  return this.node_.forEachChild(function(key, node) {
    return action(new fb.api.DataSnapshot(node, self.ref_.child(key)))
  })
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "forEach", fb.api.DataSnapshot.prototype.forEach);
fb.api.DataSnapshot.prototype.hasChildren = function() {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.hasChildren", 0, 0, arguments.length);
  if(this.node_.isLeafNode()) {
    return false
  }else {
    return!this.node_.isEmpty()
  }
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "hasChildren", fb.api.DataSnapshot.prototype.hasChildren);
fb.api.DataSnapshot.prototype.name = function() {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.name", 0, 0, arguments.length);
  return this.ref_.name()
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "name", fb.api.DataSnapshot.prototype.name);
fb.api.DataSnapshot.prototype.ref = function() {
  fb.core.util.validateArgCount("Firebase.DataSnapshot.ref", 0, 0, arguments.length);
  return this.ref_
};
goog.exportProperty(fb.api.DataSnapshot.prototype, "ref", fb.api.DataSnapshot.prototype.ref);
goog.provide("fb.constants");
var NODE_CLIENT = false;
var IS_DEMO_BUILD = false;
var DEMO_WEBSITE_DOMAIN = "firebase.com";
goog.provide("fb.realtime.WebSocketConnection");
goog.require("fb.core.util.json");
goog.require("fb.constants");
var WEBSOCKET_MAX_FRAME_SIZE = 16384;
var WEBSOCKET_KEEPALIVE_INTERVAL = 45E3;
var WEBSOCKET_STATE_NEW_CONNECTION = 0;
var WEBSOCKET_STATE_GET_NUM_FRAMES = 1;
var WEBSOCKET_STATE_GET_FRAMES = 2;
var WEBSOCKET_CLIENT_HELLO_PACKET = "version=";
var WEBSOCKET_SERVER_HELLO_PACKET = "ok";
var WEBSOCKET_SERVER_KILL_PACKET = "kill";
var WEBSOCKET_PROTOCOL_VERSION = "1";
fb.WebSocket = null;
if(NODE_CLIENT) {
  fb.WebSocket = require("faye-websocket")["Client"]
}else {
  if(typeof MozWebSocket !== "undefined") {
    fb.WebSocket = MozWebSocket
  }else {
    if(typeof WebSocket !== "undefined") {
      fb.WebSocket = WebSocket
    }
  }
}
fb.realtime.WebSocketConnection = function(repoInfo, onMess, onReady, onDisconn, onKill) {
  this.onDisconnect = onDisconn;
  this.onMessage = onMess;
  this.onKill = onKill;
  this.onReady = onReady;
  this.keepaliveTimer = null;
  this.state = WEBSOCKET_STATE_NEW_CONNECTION;
  this.frames = null;
  this.totalFrames = 0;
  var connURL = (repoInfo.secure ? "wss://" : "ws://") + repoInfo.host + "/" + repoInfo.namespace + ".ws";
  fb.core.util.log("Connecting to " + connURL);
  this.mySock = new fb.WebSocket(connURL);
  var self = this;
  this.mySock.onopen = function() {
    fb.core.util.log("Websocket connected.  Sending hello.");
    self.mySock.send(WEBSOCKET_CLIENT_HELLO_PACKET + WEBSOCKET_PROTOCOL_VERSION)
  };
  this.mySock.onclose = function() {
    fb.core.util.log("Websocket connection was disconnected.");
    self.mySock = null;
    self.close(true)
  };
  this.mySock.onmessage = function(m) {
    self.handleIncomingFrame(m)
  };
  this.mySock.onerror = function(e) {
    fb.core.util.log("WebSocket error.  Closing connection.");
    self.close()
  }
};
fb.realtime.WebSocketConnection.isAvailable = function() {
  return fb.WebSocket !== null
};
fb.realtime.WebSocketConnection.prototype.handleIncomingFrame = function(mess) {
  if(this.mySock === null) {
    return
  }
  var data = mess["data"];
  if(this.state === WEBSOCKET_STATE_NEW_CONNECTION) {
    if(data === WEBSOCKET_SERVER_HELLO_PACKET) {
      fb.core.util.log("Got hello packet.  WebSocket good.");
      this.state = WEBSOCKET_STATE_GET_NUM_FRAMES;
      this.onReady()
    }else {
      if(data === WEBSOCKET_SERVER_KILL_PACKET) {
        fb.core.util.log("Shutdown message received from server, likely due to unmatching version numbers.");
        this.onKill()
      }
    }
  }else {
    if(this.state === WEBSOCKET_STATE_GET_NUM_FRAMES) {
      this.totalFrames = Number(data);
      this.state = WEBSOCKET_STATE_GET_FRAMES;
      this.frames = []
    }else {
      if(this.state === WEBSOCKET_STATE_GET_FRAMES) {
        this.frames.push(data);
        if(this.frames.length == this.totalFrames) {
          var fullMess = this.frames.join("");
          var jsonMess = fb.core.util.json.eval(fullMess);
          this.state = WEBSOCKET_STATE_GET_NUM_FRAMES;
          this.resetKeepAlive();
          this.onMessage(jsonMess)
        }
      }
    }
  }
};
fb.realtime.WebSocketConnection.prototype.send = function(data) {
  this.resetKeepAlive();
  data = fb.core.util.json.stringify(data, false);
  var dataSegs = splitStringIntoSegmentsOfMaxSize(data, WEBSOCKET_MAX_FRAME_SIZE);
  this.mySock.send(String(dataSegs.length));
  for(var i = 0;i < dataSegs.length;i++) {
    this.mySock.send(dataSegs[i])
  }
};
fb.realtime.WebSocketConnection.prototype.close = function(fromOnClose) {
  if(this.isClosed_) {
    return
  }
  this.isClosed_ = true;
  if(!fromOnClose) {
    fb.core.util.log("Closing WebSocket.")
  }
  if(this.keepaliveTimer) {
    clearTimeout(this.keepaliveTimer);
    this.keepaliveTimer = null
  }
  if(this.mySock) {
    this.mySock.close();
    this.mySock = null
  }
  if(this.onDisconnect) {
    this.onDisconnect();
    this.onDisconnect = null
  }
};
fb.realtime.WebSocketConnection.prototype.resetKeepAlive = function() {
  var self = this;
  clearTimeout(this.keepaliveTimer);
  this.keepaliveTimer = setInterval(function() {
    self.mySock.send("0");
    self.resetKeepAlive()
  }, WEBSOCKET_KEEPALIVE_INTERVAL)
};
goog.provide("fb.core.util.CountedSet");
fb.core.util.CountedSet = function() {
  this.set = {}
};
fb.core.util.CountedSet.prototype.add = function(item, val) {
  this.set[item] = val !== null ? val : true
};
fb.core.util.CountedSet.prototype.get = function(item) {
  return this.set[item]
};
fb.core.util.CountedSet.prototype.remove = function(item) {
  delete this.set[item]
};
fb.core.util.CountedSet.prototype.clear = function() {
  this.set = {}
};
fb.core.util.CountedSet.prototype.isEmpty = function() {
  for(var i in this.set) {
    return false
  }
  return true
};
fb.core.util.CountedSet.prototype.count = function() {
  var count = 0;
  for(var i in this.set) {
    count++
  }
  return count
};
goog.provide("fb.realtime.LongPollConnection");
goog.require("fb.core.util.json");
goog.require("fb.core.util.CountedSet");
var FIREBASE_LONGPOLL_START_PARAM = "start";
var FIREBASE_LONGPOLL_COMMAND_CB_NAME = "pLPCommand";
var FIREBASE_LONGPOLL_DATA_CB_NAME = "pRTLPCB";
var FIREBASE_LONGPOLL_ID_PARAM = "id";
var FIREBASE_LONGPOLL_PW_PARAM = "pw";
var FIREBASE_LONGPOLL_SERIAL_PARAM = "ser";
var FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM = "seg";
var FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET = "ts";
var FIREBASE_LONGPOLL_DATA_PARAM = "d";
var FIREBASE_LONGPOLL_DISCONN_FRAME_PARAM = "disconn";
var FIREBASE_LONGPOLL_PROTO_VER_PARAM = "v";
var FIREBASE_LONGPOLL_PROTO_VER_NUM = "1";
var FIREBASE_LONGPOLL_RESET_COMMAND = "reset";
var FIREBASE_LONGPOLL_SHUTDOWN_COMMAND = "shutdown";
var MAX_URL_DATA_SIZE = 1870;
var SEG_HEADER_SIZE = 30;
var MAX_PAYLOAD_SIZE = MAX_URL_DATA_SIZE - SEG_HEADER_SIZE;
var KEEPALIVE_REQUEST_INTERVAL = 25E3;
var CONNECT_TIMEOUT = 3E4;
fb.realtime.LongPollConnection = function(repoInfo, onMessage, onReady, onDisconnect, onKill) {
  this.myBaseURL = (repoInfo.secure ? "https://" : "http://") + repoInfo.host + "/" + repoInfo.namespace + ".lp";
  this.curSegmentNum = 0;
  this.onDisconnect = onDisconnect;
  this.myPacketOrderer = new FirebaseLongPollPacketReorderer(onMessage);
  this.isClosed_ = false;
  var self = this;
  this.connectTimeoutTimer_ = setTimeout(function() {
    fb.core.util.log("Timed out trying to connect.");
    self.close();
    self.connectTimeoutTimer_ = null
  }, CONNECT_TIMEOUT);
  fb.core.util.executeWhenDOMReady(function() {
    if(self.isClosed_) {
      return
    }
    self.scriptTagHolder = new FirebaseIFrameScriptHolder(function(command, arg1, arg2, arg3, arg4) {
      if(!self.scriptTagHolder) {
        return
      }
      if(self.connectTimeoutTimer_) {
        clearTimeout(self.connectTimeoutTimer_);
        self.connectTimeoutTimer_ = null
      }
      if(command == FIREBASE_LONGPOLL_START_PARAM) {
        onReady();
        self.scriptTagHolder.startLongPoll(arg1, arg2);
        self.addDisconnectPingFrame(arg1, arg2)
      }else {
        if(command == FIREBASE_LONGPOLL_RESET_COMMAND) {
          fb.core.util.log("Got Server RESET packet.");
          self.close()
        }else {
          if(command == FIREBASE_LONGPOLL_SHUTDOWN_COMMAND) {
            fb.core.util.log("Shutdown message received from server, likely due to unmatching version numbers.");
            onKill()
          }
        }
      }
    }, function(pN, data) {
      self.myPacketOrderer.handleResponse(pN, data)
    }, function() {
      self.close()
    }, self.myBaseURL);
    var connectURL = self.myBaseURL + "?" + FIREBASE_LONGPOLL_START_PARAM + "=t&" + FIREBASE_LONGPOLL_SERIAL_PARAM + "=" + Math.floor(Math.random() * 1E8) + "&" + FIREBASE_LONGPOLL_PROTO_VER_PARAM + "=" + FIREBASE_LONGPOLL_PROTO_VER_NUM;
    fb.core.util.log("Connecting via long-poll to " + connectURL);
    self.scriptTagHolder.addTag(connectURL, function(theScript) {
    })
  })
};
fb.realtime.LongPollConnection.isAvailable = function() {
  return!NODE_CLIENT
};
fb.realtime.LongPollConnection.prototype.close = function() {
  if(this.isClosed_) {
    return
  }
  this.isClosed_ = true;
  fb.core.util.log("Closing long-poll connection.");
  if(this.scriptTagHolder) {
    this.scriptTagHolder.close();
    this.scriptTagHolder = null
  }
  if(this.myDisconnFrame) {
    document.body.removeChild(this.myDisconnFrame);
    this.myDisconnFrame = null
  }
  if(this.onDisconnect) {
    this.onDisconnect();
    this.onDisconnect = null
  }
  if(this.connectTimeoutTimer_) {
    clearTimeout(this.connectTimeoutTimer_);
    this.connectTimeoutTimer_ = null
  }
};
fb.realtime.LongPollConnection.prototype.send = function(data) {
  data = fb.core.util.json.stringify(data, false);
  var base64data = fb.core.util.base64Encode(data);
  var dataSegs = splitStringIntoSegmentsOfMaxSize(base64data, MAX_PAYLOAD_SIZE);
  for(var i = 0;i < dataSegs.length;i++) {
    this.scriptTagHolder.enqueueSegment(this.curSegmentNum, dataSegs.length, dataSegs[i]);
    this.curSegmentNum++
  }
};
fb.realtime.LongPollConnection.prototype.addDisconnectPingFrame = function(id, pw) {
  this.myDisconnFrame = document.createElement("iframe");
  this.myDisconnFrame.src = this.myBaseURL + "?" + FIREBASE_LONGPOLL_DISCONN_FRAME_PARAM + "=t&" + FIREBASE_LONGPOLL_ID_PARAM + "=" + id + "&" + FIREBASE_LONGPOLL_PW_PARAM + "=" + pw;
  this.myDisconnFrame.style.display = "none";
  document.body.appendChild(this.myDisconnFrame)
};
function FirebaseLongPollPacketReorderer(cb) {
  this.myCB = cb;
  this.pendingResponses = [];
  this.currentResponseNum = 0
}
FirebaseLongPollPacketReorderer.prototype.handleResponse = function(rN, dataArray) {
  this.pendingResponses[rN] = dataArray;
  while(this.pendingResponses[this.currentResponseNum]) {
    var toProcess = this.pendingResponses[this.currentResponseNum];
    delete this.pendingResponses[this.currentResponseNum];
    for(var cd = 0;cd < toProcess.length;cd++) {
      if(toProcess[cd]) {
        this.myCB(toProcess[cd])
      }
    }
    this.currentResponseNum++
  }
};
function FirebaseIFrameScriptHolder(commandCB, onMessageCB, onDisconnectCB, baseURL) {
  this.myBaseURL = baseURL;
  this.onDisconnect = onDisconnectCB;
  this.outstandingRequests = new fb.core.util.CountedSet;
  this.pendingSegs = [];
  this.currentSerial = Math.floor(Math.random() * 1E8);
  var uniqueCBIdentifier = fb.core.util.LUIDGenerator();
  window[FIREBASE_LONGPOLL_COMMAND_CB_NAME + uniqueCBIdentifier] = commandCB;
  window[FIREBASE_LONGPOLL_DATA_CB_NAME + uniqueCBIdentifier] = onMessageCB;
  this.myIFrame = this.createIFrame();
  var iframeContents = "<html><body><script>\n" + "function " + FIREBASE_LONGPOLL_COMMAND_CB_NAME + "(c, a1, a2, a3, a4) " + "{\n" + 'parent.window["' + FIREBASE_LONGPOLL_COMMAND_CB_NAME + uniqueCBIdentifier + '"](c, a1, a2, a3, a4);\n' + "}\n" + "function " + FIREBASE_LONGPOLL_DATA_CB_NAME + "(pN, data) " + "{\n" + 'parent.window["' + FIREBASE_LONGPOLL_DATA_CB_NAME + uniqueCBIdentifier + '"](pN, data);\n' + "}\n" + "<\/script></body></html>\n";
  this.myIFrame.doc.open();
  this.myIFrame.doc.write(iframeContents);
  this.myIFrame.doc.close()
}
FirebaseIFrameScriptHolder.prototype.createIFrame = function() {
  var iframe = document.createElement("iframe");
  iframe.style.display = "none";
  if(document.body) {
    document.body.appendChild(iframe)
  }else {
    throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";
  }
  if(iframe.contentDocument) {
    iframe.doc = iframe.contentDocument
  }else {
    if(iframe.contentWindow) {
      iframe.doc = iframe.contentWindow.document
    }else {
      if(iframe.document) {
        iframe.doc = iframe.document
      }
    }
  }
  return iframe
};
FirebaseIFrameScriptHolder.prototype.close = function() {
  this.alive = false;
  if(this.myIFrame) {
    this.myIFrame.doc.body.innerHTML = "";
    document.body.removeChild(this.myIFrame);
    this.myIFrame = null
  }
  var onDisconnect = this.onDisconnect;
  if(onDisconnect) {
    this.onDisconnect = null;
    onDisconnect()
  }
};
FirebaseIFrameScriptHolder.prototype.startLongPoll = function(id, pw) {
  this.myID = id;
  this.myPW = pw;
  this.alive = true;
  while(this.newRequest()) {
  }
};
FirebaseIFrameScriptHolder.prototype.newRequest = function() {
  if(this.alive && this.outstandingRequests.count() < (this.pendingSegs.length > 0 ? 2 : 1)) {
    this.currentSerial++;
    var theURL = this.myBaseURL + "?" + FIREBASE_LONGPOLL_ID_PARAM + "=" + this.myID + "&" + FIREBASE_LONGPOLL_PW_PARAM + "=" + this.myPW + "&" + FIREBASE_LONGPOLL_SERIAL_PARAM + "=" + this.currentSerial;
    var curDataString = "";
    var i = 0;
    while(this.pendingSegs.length > 0) {
      var nextSeg = this.pendingSegs[0];
      if(nextSeg.d.length + SEG_HEADER_SIZE + curDataString.length <= MAX_URL_DATA_SIZE) {
        var theSeg = this.pendingSegs.shift();
        curDataString = curDataString + "&" + FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM + i + "=" + theSeg.seg + "&" + FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET + i + "=" + theSeg.ts + "&" + FIREBASE_LONGPOLL_DATA_PARAM + i + "=" + theSeg.d;
        i++
      }else {
        break
      }
    }
    theURL = theURL + curDataString;
    this.addLongPollTag(theURL, this.currentSerial);
    return true
  }else {
    return false
  }
};
FirebaseIFrameScriptHolder.prototype.enqueueSegment = function(segnum, totalsegs, data) {
  this.pendingSegs.push({seg:segnum, ts:totalsegs, d:data});
  if(this.alive) {
    this.newRequest()
  }
};
FirebaseIFrameScriptHolder.prototype.addLongPollTag = function(url, serial) {
  var self = this;
  self.outstandingRequests.add(serial);
  var doNewRequest = function() {
    self.outstandingRequests.remove(serial);
    self.newRequest()
  };
  var keepaliveTimeout = setTimeout(doNewRequest, KEEPALIVE_REQUEST_INTERVAL);
  var readyStateCB = function(theScript) {
    clearTimeout(keepaliveTimeout);
    doNewRequest()
  };
  this.addTag(url, readyStateCB)
};
FirebaseIFrameScriptHolder.prototype.addTag = function(url, loadCB) {
  var self = this;
  setTimeout(function() {
    try {
      var newScript = self.myIFrame.doc.createElement("script");
      newScript.type = "text/javascript";
      newScript.async = true;
      newScript.src = url;
      newScript.onload = newScript.onreadystatechange = function() {
        var rstate = newScript.readyState;
        if(!rstate || rstate === "loaded" || rstate === "complete") {
          newScript.onload = newScript.onreadystatechange = null;
          if(newScript.parentNode) {
            newScript.parentNode.removeChild(newScript)
          }
          loadCB()
        }
      };
      newScript.onerror = function() {
        fb.core.util.log("Long-poll script failed to load.");
        self.close()
      };
      self.myIFrame.doc.body.appendChild(newScript)
    }catch(e) {
    }
  }, 1)
};
function splitStringIntoSegmentsOfMaxSize(str, segsize) {
  if(str.length <= segsize) {
    return[str]
  }
  var dataSegs = [];
  for(var c = 0;c < str.length;c += segsize) {
    if(c + segsize > str) {
      dataSegs.push(str.substring(c, str.length))
    }else {
      dataSegs.push(str.substring(c, c + segsize))
    }
  }
  return dataSegs
}
;goog.provide("fb.realtime.TransportChooser");
goog.require("fb.realtime.WebSocketConnection");
goog.require("fb.realtime.LongPollConnection");
var LONG_POLL_TRY_DELAY = 450;
var ConnectionState = {START:0, CONNECTING:1, CONNECTED:2, CANCELED:3};
fb.realtime.TransportChooser = function(repoInfo, onMessage, onReady, onDisconnect, onKill) {
  this.repoInfo_ = repoInfo;
  this.onMessage_ = onMessage;
  this.onReady_ = onReady;
  this.onDisconnect_ = onDisconnect;
  this.onKill_ = onKill;
  this.longPollState_ = ConnectionState.START;
  this.longPollConnection_ = null;
  this.webSocketState_ = ConnectionState.START;
  this.webSocketConnection_ = null;
  if(fb.realtime.WebSocketConnection.isAvailable()) {
    this.startWebSocketConnection_()
  }else {
    this.cancelWebSocketConnection_()
  }
  if(fb.realtime.LongPollConnection.isAvailable()) {
    if(this.webSocketState_ !== ConnectionState.CANCELED) {
      fb.core.util.log("CHOOSER: Trying long-poll connection in " + LONG_POLL_TRY_DELAY + "ms.");
      var self = this;
      setTimeout(function() {
        self.startLongPollConnection_()
      }, LONG_POLL_TRY_DELAY)
    }else {
      this.startLongPollConnection_()
    }
  }else {
    this.cancelLongPollConnection_()
  }
};
fb.realtime.TransportChooser.prototype.startWebSocketConnection_ = function() {
  fb.core.util.log("CHOOSER: Starting WebSocket connection.");
  fb.core.util.assert(fb.realtime.WebSocketConnection.isAvailable(), "WebSocket isn't supported.");
  fb.core.util.assert(this.webSocketState_ === ConnectionState.START, "webSocketState should be START.");
  fb.core.util.assert(this.longPollState_ !== ConnectionState.CONNECTED, "longPollState should not be CONNECTED");
  this.webSocketState_ = ConnectionState.CONNECTING;
  try {
    this.webSocketConnection_ = new fb.realtime.WebSocketConnection(this.repoInfo_, this.onMessage_, goog.bind(this.onWebSocketConnected_, this), goog.bind(this.onWebSocketDisconnected_, this), this.onKill_)
  }catch(e) {
    fb.core.util.error("WebSocket constructor threw exception: " + e.toString());
    this.cancelWebSocketConnection_()
  }
};
fb.realtime.TransportChooser.prototype.onWebSocketConnected_ = function() {
  fb.core.util.log("CHOOSER: WebSocket connection connected.");
  fb.core.util.assertWeak(this.webSocketState_ === ConnectionState.CONNECTING, "webSocketState should be CONNECTING.");
  if(this.longPollState_ === ConnectionState.CONNECTED) {
    this.cancelWebSocketConnection_()
  }else {
    this.webSocketState_ = ConnectionState.CONNECTED;
    this.cancelLongPollConnection_();
    if(this.onReady_) {
      this.onReady_(this.webSocketConnection_);
      this.onReady_ = null
    }
  }
};
fb.realtime.TransportChooser.prototype.onWebSocketDisconnected_ = function() {
  fb.core.util.log("CHOOSER: WebSocket connection disconnected.");
  fb.core.util.assert(this.webSocketState_ !== ConnectionState.START, "webSocketState should not be START.");
  fb.core.util.assert(this.longPollState_ === ConnectionState.CANCELED || this.webSocketState_ !== ConnectionState.CONNECTED, "Was CONNECTED via websocket, but long-polling wasn't canceled.");
  this.cancelWebSocketConnection_()
};
fb.realtime.TransportChooser.prototype.startLongPollConnection_ = function() {
  if(this.longPollState_ !== ConnectionState.START) {
    return
  }
  fb.core.util.log("CHOOSER: Starting Long-polling connection.");
  fb.core.util.assert(fb.realtime.LongPollConnection.isAvailable(), "Long-polling isn't supported.");
  fb.core.util.assert(this.webSocketState_ !== ConnectionState.CONNECTED, "webSocketState should not be CONNECTED.");
  this.longPollState_ = ConnectionState.CONNECTING;
  this.longPollConnection_ = new fb.realtime.LongPollConnection(this.repoInfo_, this.onMessage_, goog.bind(this.onLongPollConnected_, this), goog.bind(this.onLongPollDisconnected_, this), this.onKill_)
};
fb.realtime.TransportChooser.prototype.onLongPollConnected_ = function() {
  fb.core.util.log("CHOOSER: Long-polling connection connected.");
  fb.core.util.assertWeak(this.longPollState_ === ConnectionState.CONNECTING, "longPollState should be CONNECTING.");
  if(this.webSocketState_ === ConnectionState.CONNECTED) {
    this.cancelLongPollConnection_()
  }else {
    this.longPollState_ = ConnectionState.CONNECTED;
    this.cancelWebSocketConnection_();
    if(this.onReady_) {
      this.onReady_(this.longPollConnection_);
      this.onReady_ = null
    }
  }
};
fb.realtime.TransportChooser.prototype.onLongPollDisconnected_ = function() {
  fb.core.util.log("CHOOSER: Long-polling connection disconnected.");
  fb.core.util.assert(this.longPollState_ !== ConnectionState.START, "longPollState should not be START.");
  fb.core.util.assert(this.webSocketState_ === ConnectionState.CANCELED || this.longPollState_ !== ConnectionState.CONNECTED, "Was CONNECTED via long-polling, but websocket wasn't canceled.");
  this.cancelLongPollConnection_()
};
fb.realtime.TransportChooser.prototype.cancelLongPollConnection_ = function() {
  if(this.longPollState_ === ConnectionState.CANCELED) {
    return
  }
  fb.core.util.log("CHOOSER: Canceling long-polling connection.");
  this.longPollState_ = ConnectionState.CANCELED;
  if(this.longPollConnection_) {
    this.longPollConnection_.close();
    this.longPollConnection_ = null
  }
  this.checkForDisconnect_()
};
fb.realtime.TransportChooser.prototype.cancelWebSocketConnection_ = function() {
  if(this.webSocketState_ === ConnectionState.CANCELED) {
    return
  }
  fb.core.util.log("CHOOSER: Canceling websocket connection.");
  this.webSocketState_ = ConnectionState.CANCELED;
  if(this.webSocketConnection_) {
    this.webSocketConnection_.close();
    this.webSocketConnection_ = null
  }
  if(this.longPollState_ === ConnectionState.START) {
    this.startLongPollConnection_()
  }
  this.checkForDisconnect_()
};
fb.realtime.TransportChooser.prototype.checkForDisconnect_ = function() {
  if(this.webSocketState_ === ConnectionState.CANCELED && this.longPollState_ === ConnectionState.CANCELED && this.onDisconnect_) {
    fb.core.util.log("CHOOSER: Both websocket and long-polling were canceled.  Connection lost.");
    this.onDisconnect_();
    this.onDisconnect_ = null
  }
};
fb.realtime.TransportChooser.prototype.close = function() {
  this.cancelLongPollConnection_();
  this.cancelWebSocketConnection_();
  if(this.onDisconnect_) {
    this.onDisconnect_();
    this.onDisconnect_ = null
  }
};
goog.provide("fb.realtime.Connection");
goog.require("fb.core.util");
goog.require("fb.core.util.json");
goog.require("fb.realtime.TransportChooser");
var REQUEST_TIMEOUT = 45E3;
var REALTIME_STATE_CONNECTING = 0;
var REALTIME_STATE_CONNECTED = 1;
var REALTIME_STATE_DISCONNECTED = 2;
fb.realtime.Connection = function(repoInfo, onMessage, onReady, onDisconnect, onKill) {
  this.onMessage_ = onMessage;
  this.onReady_ = onReady;
  this.onDisconnect_ = onDisconnect;
  this.onKill_ = onKill;
  this.requestCBHash_ = {};
  this.requestNumber_ = 0;
  this.pendingSendQueue_ = [];
  this.state_ = REALTIME_STATE_CONNECTING;
  var onMessageReceived = goog.bind(this.onMessageReceived_, this);
  var onConnectionEstablished = goog.bind(this.onConnectionEstablished_, this);
  var onConnectionLost = goog.bind(this.onConnectionLost_, this);
  var onConnectionShutdown = goog.bind(this.onConnectionShutdown_, this);
  this.conn_ = new fb.realtime.TransportChooser(repoInfo, onMessageReceived, onConnectionEstablished, onConnectionLost, onConnectionShutdown)
};
fb.realtime.Connection.prototype.sendRequest = function(message, onMessage, onTimeout) {
  var curReqNum = ++this.requestNumber_;
  this.sendData_({"rn":curReqNum, "payload":message});
  var self = this;
  var timeoutTimer = setTimeout(function() {
    var cbData = self.requestCBHash_[curReqNum];
    if(cbData) {
      delete self.requestCBHash_[curReqNum];
      if(cbData.cb && cbData.cb.onTimeout) {
        cbData.cb.onTimeout()
      }
    }
  }, REQUEST_TIMEOUT);
  var callbacks = {onMessage:onMessage, onTimeout:onTimeout};
  this.requestCBHash_[curReqNum] = {cb:callbacks, timer:timeoutTimer}
};
fb.realtime.Connection.prototype.onMessageReceived_ = function(parsedData) {
  if("rn" in parsedData) {
    var reqNum = parsedData["rn"];
    var cbData = this.requestCBHash_[reqNum];
    if(cbData) {
      delete this.requestCBHash_[reqNum];
      clearTimeout(cbData.timer);
      if(cbData.cb && cbData.cb.onMessage) {
        cbData.cb.onMessage(parsedData["data"])
      }
    }
  }else {
    if("error" in parsedData) {
      throw"A server-side error has occurred: " + parsedData["error"];
    }else {
      if(this.onMessage_) {
        this.onMessage_(parsedData)
      }
    }
  }
};
fb.realtime.Connection.prototype.onConnectionEstablished_ = function(conn) {
  fb.core.util.log("Realtime connection established.");
  this.conn_ = conn;
  this.state_ = REALTIME_STATE_CONNECTED;
  for(var messNum = 0;messNum < this.pendingSendQueue_.length;messNum++) {
    this.sendData_(this.pendingSendQueue_[messNum])
  }
  this.pendingSendQueue_ = null;
  if(this.onReady_) {
    this.onReady_();
    this.onReady_ = null
  }
};
fb.realtime.Connection.prototype.onConnectionLost_ = function() {
  this.conn_ = null;
  if(this.state_ === REALTIME_STATE_CONNECTING) {
    fb.core.util.log("Realtime connection failed.")
  }else {
    if(this.state_ === REALTIME_STATE_CONNECTED) {
      fb.core.util.log("Realtime connection lost.")
    }
  }
  this.close()
};
fb.realtime.Connection.prototype.onConnectionShutdown_ = function() {
  fb.core.util.log("Connection shutdown command received. Shutting down...");
  if(this.onKill_) {
    this.onKill_();
    this.onKill_ = null
  }
  this.onDisconnect_ = null;
  this.close()
};
fb.realtime.Connection.prototype.sendData_ = function(data) {
  if(this.state_ === REALTIME_STATE_DISCONNECTED) {
    throw"Connection has already been closed.";
  }else {
    if(this.state_ === REALTIME_STATE_CONNECTING) {
      this.pendingSendQueue_.push(data)
    }else {
      this.conn_.send(data)
    }
  }
};
fb.realtime.Connection.prototype.close = function() {
  if(this.state_ !== REALTIME_STATE_DISCONNECTED) {
    fb.core.util.log("Closing realtime connection.");
    this.state_ = REALTIME_STATE_DISCONNECTED;
    if(this.conn_) {
      this.conn_.close();
      this.conn_ = null
    }
    if(this.onDisconnect_) {
      this.onDisconnect_();
      this.onDisconnect_ = null
    }
    for(var cbInd in this.requestCBHash_) {
      var cbData = this.requestCBHash_[cbInd];
      delete this.requestCBHash_[cbInd];
      if(cbData !== null) {
        if(cbData.cb && cbData.cb.onTimeout) {
          cbData.cb.onTimeout()
        }
        clearTimeout(cbData.timer)
      }
    }
  }
};
goog.provide("fb.core.PersistentConnection");
goog.require("fb.realtime.Connection");
var RECONNECT_MIN_DELAY = 1E3;
var RECONNECT_MAX_DELAY = 3E4;
var RECONNECT_DELAY_MULTIPLIER = 1.3;
var RECONNECT_DELAY_RESET_TIMEOUT = 3E4;
fb.core.PersistentConnection = function(repoInfo, onDataUpdate, onConnect, onDisconnect) {
  this.id = fb.core.PersistentConnection.nextConnectionId_++;
  this.credentials_ = {};
  this.listens_ = {};
  this.outstandingPuts_ = [];
  this.outstandingPutCount_ = 0;
  this.onDisconnectMap_ = {};
  this.connected_ = false;
  this.reconnectDelay_ = RECONNECT_MIN_DELAY;
  this.onConnect_ = onConnect;
  this.onDisconnect_ = onDisconnect;
  this.establishConnection_(repoInfo, onDataUpdate)
};
fb.core.PersistentConnection.nextConnectionId_ = 0;
fb.core.PersistentConnection.prototype.listen = function(pathString, query) {
  var queryId = fb.core.util.ObjectToUniqueKey(query);
  this.listens_[pathString] = this.listens_[pathString] || {};
  fb.core.util.assert(!this.listens_[pathString][queryId], "listen() called twice for same path/queryId.");
  this.listens_[pathString][queryId] = query;
  if(this.connected_) {
    this.sendListen_(pathString, query)
  }
};
fb.core.PersistentConnection.prototype.sendListen_ = function(pathString, query) {
  var self = this;
  var queryId = fb.core.util.ObjectToUniqueKey(query);
  this.log_("Listen on " + pathString + " for " + queryId);
  var req = {"action":"listen", "path":pathString};
  if(queryId !== "default") {
    req["query"] = query
  }
  this.realtime_.sendRequest(req, null, function() {
    self.log_("timed out on listen...")
  })
};
fb.core.PersistentConnection.prototype.auth = function(user, cred, callback) {
  var authdata = {user:user, cred:cred, firstRequestSent:false, callback:callback};
  var userKey = null;
  if(user !== null) {
    this.log_("Authenticating user using credential: " + cred);
    userKey = "u:" + user
  }else {
    this.log_("Authenticating admin using secret: " + cred);
    userKey = "admin"
  }
  this.credentials_[userKey] = authdata;
  this.tryAuthWithCredential(userKey)
};
fb.core.PersistentConnection.prototype.tryAuthWithCredential = function(userKey) {
  var authdata = this.credentials_[userKey];
  var self = this;
  if(this.connected_) {
    var requestData = {"action":"auth", "authtype":"cred", "user":authdata.user, "cred":authdata.cred};
    if(authdata.user !== null) {
      requestData["user"] = authdata.user
    }
    this.realtime_.sendRequest(requestData, function(res) {
      var authSuccess = res["status"] == "success";
      if(!authSuccess) {
        delete self.credentials_[userKey]
      }
      if(!authdata.firstRequestSent) {
        authdata.firstRequestSent = true;
        if(authdata.callback) {
          authdata.callback(authSuccess)
        }
      }
    }, function() {
      self.log_("timed out on auth...")
    })
  }
};
fb.core.PersistentConnection.prototype.unlisten = function(pathString, query) {
  var queryId = fb.core.util.ObjectToUniqueKey(query);
  fb.core.util.assert(this.listens_[pathString][queryId], "unlisten() called for path/queryId we're not listening on.");
  delete this.listens_[pathString][queryId];
  if(this.connected_) {
    this.sendUnlisten_(pathString, query)
  }
};
fb.core.PersistentConnection.prototype.sendUnlisten_ = function(pathString, query) {
  var queryId = fb.core.util.ObjectToUniqueKey(query);
  this.log_("Unlisten on " + pathString + " for " + queryId);
  var self = this;
  var req = {"action":"unlisten", "path":pathString};
  if(queryId !== "default") {
    req["query"] = query
  }
  this.realtime_.sendRequest(req, null, function() {
    self.log_("timed out on unlisten...")
  })
};
fb.core.PersistentConnection.prototype.onDisconnect = function(pathString, data) {
  this.onDisconnectMap_[pathString] = data;
  if(this.connected_) {
    this.sendOnDisconnect_(pathString, data)
  }
};
fb.core.PersistentConnection.prototype.sendOnDisconnect_ = function(pathString, data) {
  var self = this;
  var request = {"action":"onDisconnect", "path":pathString, "data":data};
  this.log_("onDisconnect", request);
  this.realtime_.sendRequest(request, function(response) {
    if(response["status"] !== "success") {
      throw"onDisconnect failed: " + fb.core.util.json.stringify(response["data"]);
    }
  }, function() {
    self.log_("timed out on onDisconnect...")
  })
};
fb.core.PersistentConnection.prototype.put = function(pathString, data, opt_onComplete, opt_hash) {
  var request = {"action":"put", "path":pathString, "data":data};
  if(goog.isDef(opt_hash)) {
    request["hash"] = opt_hash
  }
  this.outstandingPuts_.push({request:request, onComplete:opt_onComplete});
  this.outstandingPutCount_++;
  var index = this.outstandingPuts_.length - 1;
  if(this.connected_) {
    this.sendPut_(index)
  }
};
fb.core.PersistentConnection.prototype.sendPut_ = function(index) {
  var self = this;
  var request = this.outstandingPuts_[index].request;
  var onComplete = this.outstandingPuts_[index].onComplete;
  this.log_("put", request);
  this.realtime_.sendRequest(request, function(message) {
    self.log_("put response", message);
    delete self.outstandingPuts_[index];
    self.outstandingPutCount_--;
    if(self.outstandingPutCount_ === 0) {
      self.outstandingPuts_ = []
    }
    if(onComplete) {
      onComplete(message["status"])
    }
  }, function() {
    self.log_("timed out on put...")
  })
};
fb.core.PersistentConnection.prototype.establishConnection_ = function(repoInfo, onDataUpdate) {
  var self = this;
  var lastConnectionAttemptTime = (new Date).getTime();
  var lastConnectionEstablishedTime = null;
  this.realtime_ = new fb.realtime.Connection(repoInfo, function(message) {
    self.log_("handleServerMessage", message);
    if("data" in message) {
      onDataUpdate(message["data"]["path"], message["data"]["data"])
    }else {
      if("timestamp" in message) {
        self.handleTimestamp_(message["timestamp"])
      }else {
        fb.core.util.error("Unrecognized message returned from server: " + fb.core.util.json.stringify(message) + "\nAre you using the latest client?")
      }
    }
  }, function() {
    self.connected_ = true;
    lastConnectionEstablishedTime = (new Date).getTime();
    self.restoreState_();
    if(self.onConnect_) {
      self.onConnect_()
    }
  }, function() {
    self.connected_ = false;
    self.cancelTransactions_();
    if(lastConnectionEstablishedTime) {
      var timeSinceLastConnectSucceeded = (new Date).getTime() - lastConnectionEstablishedTime;
      if(timeSinceLastConnectSucceeded > RECONNECT_DELAY_RESET_TIMEOUT) {
        self.reconnectDelay_ = RECONNECT_MIN_DELAY
      }
      lastConnectionEstablishedTime = null
    }
    var timeSinceLastConnectAttempt = (new Date).getTime() - lastConnectionAttemptTime;
    var reconnectDelay = Math.max(0, self.reconnectDelay_ - timeSinceLastConnectAttempt);
    reconnectDelay = Math.random() * reconnectDelay;
    setTimeout(function() {
      self.establishConnection_(repoInfo, onDataUpdate)
    }, reconnectDelay);
    self.reconnectDelay_ = Math.min(RECONNECT_MAX_DELAY, self.reconnectDelay_ * RECONNECT_DELAY_MULTIPLIER);
    if(self.onDisconnect_) {
      self.onDisconnect_()
    }
  }, function() {
    throw new Error("Firebase connection was forcefully killed by the server.  Will not attempt reconnect.");
  })
};
fb.core.PersistentConnection.prototype.handleTimestamp_ = function(timestamp) {
  var delta = timestamp - (new Date).getTime();
  fb.core.util.setClockDelta(delta)
};
fb.core.PersistentConnection.prototype.cancelTransactions_ = function() {
  for(var i = 0;i < this.outstandingPuts_.length;i++) {
    var put = this.outstandingPuts_[i];
    if(put && put.request["hash"]) {
      if(put.onComplete) {
        put.onComplete("disconnect")
      }
      delete this.outstandingPuts_[i];
      this.outstandingPutCount_--
    }
  }
  if(this.outstandingPutCount_ === 0) {
    this.outstandingPuts_ = []
  }
};
fb.core.PersistentConnection.prototype.restoreState_ = function() {
  for(var userKey in this.credentials_) {
    this.tryAuthWithCredential(userKey)
  }
  for(var pathString in this.listens_) {
    for(var queryId in this.listens_[pathString]) {
      this.sendListen_(pathString, this.listens_[pathString][queryId])
    }
  }
  for(var pathString in this.onDisconnectMap_) {
    this.sendOnDisconnect_(pathString, this.onDisconnectMap_[pathString])
  }
  for(var i = 0;i < this.outstandingPuts_.length;i++) {
    if(this.outstandingPuts_[i]) {
      this.sendPut_(i)
    }
  }
};
fb.core.PersistentConnection.prototype.log_ = function() {
  fb.core.util.log(this.id + ":", arguments)
};
goog.provide("fb.core.SnapshotHolder");
fb.core.SnapshotHolder = function() {
  this.rootNode_ = fb.core.snap.EMPTY_NODE
};
fb.core.SnapshotHolder.prototype.getNode = function(path) {
  return this.rootNode_.getChild(path)
};
fb.core.SnapshotHolder.prototype.updateSnapshot = function(path, newSnapshotNode) {
  this.rootNode_ = this.rootNode_.updateChild(path, newSnapshotNode)
};
goog.provide("fb.core.FirebaseData");
goog.require("fb.core.SnapshotHolder");
fb.core.FirebaseData = function() {
  this.serverData = new fb.core.SnapshotHolder;
  this.mergedData = new fb.core.SnapshotHolder;
  this.visibleData = new fb.core.SnapshotHolder;
  this.pendingPuts = new fb.core.util.Tree
};
fb.core.FirebaseData.prototype.updateServerData = function(path, serverNode) {
  this.serverData.updateSnapshot(path, serverNode);
  var mergedNode = this.mergedData.getNode(path);
  var pendingPuts = this.pendingPuts.subTree(path);
  var hiddenBySet = false;
  var tempSet = pendingPuts;
  while(tempSet !== null) {
    if(tempSet.getValue() !== null) {
      hiddenBySet = true;
      break
    }
    tempSet = tempSet.parent()
  }
  if(hiddenBySet) {
    return false
  }
  var newMergedNode = fb.core.FirebaseData.mergeSnapshotNodes_(serverNode, mergedNode, pendingPuts);
  if(newMergedNode !== mergedNode) {
    this.mergedData.updateSnapshot(path, newMergedNode);
    return true
  }
  return false
};
fb.core.FirebaseData.mergeSnapshotNodes_ = function(serverNode, pendingNode, pendingPuts) {
  if(pendingPuts.isEmpty()) {
    return serverNode
  }
  if(pendingPuts.getValue() !== null) {
    return pendingNode
  }
  serverNode = serverNode || fb.core.snap.EMPTY_NODE;
  pendingPuts.forEachChild(function(node) {
    var childName = node.name();
    var serverChild = serverNode.getImmediateChild(childName);
    var pendingChild = pendingNode.getImmediateChild(childName);
    var pendingPutsChild = pendingPuts.subTree(childName);
    var mergedChild = fb.core.FirebaseData.mergeSnapshotNodes_(serverChild, pendingChild, pendingPutsChild);
    serverNode = serverNode.updateImmediateChild(childName, mergedChild)
  });
  return serverNode
};
fb.core.FirebaseData.prototype.set = function(path, newNode) {
  var setId = fb.core.util.LUIDGenerator();
  this.pendingPuts.subTree(path).setValue(setId);
  this.mergedData.updateSnapshot(path, newNode);
  return setId
};
fb.core.FirebaseData.prototype.setCompleted = function(path, setId) {
  var pendingPutTree = this.pendingPuts.subTree(path);
  var pendingPut = pendingPutTree.getValue();
  fb.core.util.assert(pendingPut !== null, "pendingPut should not be null.");
  if(pendingPut === setId) {
    pendingPutTree.setValue(null)
  }
};
goog.provide("fb.core.view.EventRaiser");
fb.core.view.EventRaiser = function() {
  this.events = []
};
fb.core.view.EventRaiser.prototype.raiseEvents = function(eventDataList) {
  if(eventDataList.length === 0) {
    return
  }
  this.events.push.apply(this.events, eventDataList);
  for(var i = 0;i < this.events.length;i++) {
    if(this.events[i]) {
      var eventData = this.events[i];
      this.events[i] = null;
      this.raiseEvent_(eventData)
    }
  }
  this.events = []
};
fb.core.view.EventRaiser.prototype.raiseEvent_ = function(eventData) {
  var callback = eventData.callback;
  var snapshot = eventData.snapshot;
  var prevName = eventData.prevName;
  callback(snapshot, prevName)
};
goog.provide("fb.core.view.Change");
fb.core.view.Change = function(type, snapshotNode, childName, prevChildName) {
  this.type = type;
  this.snapshotNode = snapshotNode;
  this.childName = childName;
  this.prevName = prevChildName
};
fb.core.view.Change.CHILD_ADDED = "child_added";
fb.core.view.Change.CHILD_REMOVED = "child_removed";
fb.core.view.Change.CHILD_CHANGED = "child_changed";
fb.core.view.Change.CHILD_MOVED = "child_moved";
fb.core.view.Change.VALUE = "value";
goog.provide("fb.core.view.ViewBase");
goog.require("fb.core.view.EventRaiser");
goog.require("fb.core.view.Change");
fb.core.view.ViewBase = function(query) {
  this.query_ = query;
  this.callbacks_ = [];
  this.eventRaiser_ = new fb.core.view.EventRaiser
};
fb.core.view.ViewBase.prototype.addEventCallback = function(eventType, callback) {
  this.callbacks_.push({type:eventType, callback:callback});
  var eventDataList = [];
  var changes = this.generateChangesForSnapshot(this.snapshotNode_);
  if(this.isComplete_) {
    changes.push(new fb.core.view.Change("value", this.snapshotNode_))
  }
  for(var i = 0;i < changes.length;i++) {
    if(changes[i].type === eventType) {
      var firebaseRef = new Firebase(this.query_.repo, this.query_.path);
      if(changes[i].childName) {
        firebaseRef = firebaseRef.child(changes[i].childName)
      }
      eventDataList.push({callback:callback, snapshot:new fb.api.DataSnapshot(changes[i].snapshotNode, firebaseRef), prevName:changes[i].prevName})
    }
  }
  this.eventRaiser_.raiseEvents(eventDataList)
};
fb.core.view.ViewBase.prototype.removeEventCallback = function(eventType, callback) {
  var found = false;
  for(var i = 0;i < this.callbacks_.length;i++) {
    var cbObject = this.callbacks_[i];
    if(cbObject.type === eventType && cbObject.callback === callback) {
      this.callbacks_.splice(i, 1);
      found = true;
      break
    }
  }
  return found
};
fb.core.view.ViewBase.prototype.hasCallbacks = function() {
  return this.callbacks_.length > 0
};
fb.core.view.ViewBase.prototype.processChanges = function(newSnapshotNode, changes) {
  changes = this.processChanges_(newSnapshotNode, changes);
  this.raiseEventsForChanges_(changes)
};
fb.core.view.ViewBase.prototype.raiseEventsForChanges_ = function(changes) {
  var eventDataList = [];
  for(var i = 0;i < changes.length;i++) {
    var event = changes[i], logData = event.type;
    var firebaseRef = new Firebase(this.query_.repo, this.query_.path);
    if(changes[i].childName) {
      firebaseRef = firebaseRef.child(changes[i].childName)
    }
    var snapshot = new fb.api.DataSnapshot(changes[i].snapshotNode, firebaseRef);
    if(event.type === "value" && !snapshot.hasChildren()) {
      logData += "(" + snapshot.val() + ")"
    }else {
      if(event.type !== "value") {
        logData += " " + snapshot.name()
      }
    }
    fb.core.util.log(this.query_.repo.connection_.id + ": event:" + this.query_.path + ":" + this.query_.queryIdentifier() + ":" + logData);
    for(var j = 0;j < this.callbacks_.length;j++) {
      var cbObj = this.callbacks_[j];
      if(changes[i].type === cbObj.type) {
        eventDataList.push({callback:cbObj.callback, snapshot:snapshot, prevName:event.prevName})
      }
    }
  }
  this.eventRaiser_.raiseEvents(eventDataList)
};
fb.core.view.ViewBase.prototype.generateChangesForSnapshot = function(snapshotNode) {
  var events = [];
  if(!snapshotNode.isLeafNode()) {
    var prevName = null;
    snapshotNode.forEachChild(function(name, childNode) {
      events.push(new fb.core.view.Change(fb.core.view.Change.CHILD_ADDED, childNode, name, prevName));
      prevName = name
    })
  }
  return events
};
fb.core.view.ViewBase.prototype.isComplete = function() {
  return this.isComplete_
};
fb.core.view.ViewBase.prototype.markComplete = function() {
  if(!this.isComplete_) {
    this.isComplete_ = true;
    this.raiseEventsForChanges_([new fb.core.view.Change("value", this.snapshotNode_)])
  }
};
fb.core.view.ViewBase.prototype.processChanges_ = goog.abstractMethod;
goog.provide("fb.core.view.DefaultView");
goog.require("fb.core.view.ViewBase");
fb.core.view.DefaultView = function(query, snapshotNode, eventQueue) {
  fb.core.view.ViewBase.call(this, query, eventQueue);
  this.snapshotNode_ = snapshotNode
};
goog.inherits(fb.core.view.DefaultView, fb.core.view.ViewBase);
fb.core.view.DefaultView.prototype.processChanges_ = function(snapshotNode, changes) {
  this.snapshotNode_ = snapshotNode;
  if(this.isComplete_) {
    changes.push(new fb.core.view.Change("value", this.snapshotNode_))
  }
  return changes
};
goog.provide("fb.core.view.SnapshotDiffer");
fb.core.view.SnapshotDiffer = function(diffMaskTree, onDiffCallback) {
  this.diffMaskTree_ = diffMaskTree;
  this.onDiffCallback_ = onDiffCallback
};
fb.core.view.SnapshotDiffer.Diff = function(oldRootNode, newRootNode, path, diffMaskTree, onDiffCallback) {
  var oldNode = oldRootNode.getChild(path), newNode = newRootNode.getChild(path);
  var snapshotDiffer = new fb.core.view.SnapshotDiffer(diffMaskTree, onDiffCallback);
  var changed = snapshotDiffer.diffRecursive_(path, oldNode, newNode);
  var moved = oldNode.getPriority() !== newNode.getPriority();
  if(changed || moved) {
    snapshotDiffer.propagateDiffUpward_(path, oldRootNode, newRootNode, changed, moved)
  }
};
fb.core.view.SnapshotDiffer.prototype.propagateDiffUpward_ = function(path, oldRootNode, newRootNode, changed, moved) {
  while(path.parent() !== null) {
    var oldNode = oldRootNode.getChild(path);
    var newNode = newRootNode.getChild(path);
    var parentPath = path.parent();
    if(this.diffMaskTree_.subTree(parentPath).getValue()) {
      var parentSnapshotNode = newRootNode.getChild(parentPath);
      var events = [];
      var nodeName = path.getBack(), prevName;
      if(oldNode.isEmpty()) {
        prevName = parentSnapshotNode.getPredecessorChildName(nodeName, newNode);
        events.push(new fb.core.view.Change("child_added", newNode, nodeName, prevName))
      }else {
        if(newNode.isEmpty()) {
          events.push(new fb.core.view.Change("child_removed", oldNode, nodeName))
        }else {
          if(changed) {
            prevName = parentSnapshotNode.getPredecessorChildName(nodeName, newNode);
            events.push(new fb.core.view.Change("child_changed", newNode, nodeName, prevName))
          }
          if(moved) {
            prevName = parentSnapshotNode.getPredecessorChildName(nodeName, newNode);
            events.push(new fb.core.view.Change("child_moved", newNode, nodeName, prevName));
            changed = true
          }
        }
      }
      this.onDiffCallback_(parentPath, parentSnapshotNode, events)
    }
    path = parentPath;
    moved = false
  }
};
fb.core.view.SnapshotDiffer.prototype.diffRecursive_ = function(path, oldNode, newNode) {
  var changed;
  var events = [];
  if(oldNode === newNode) {
    changed = false
  }else {
    if(oldNode.isLeafNode() && newNode.isLeafNode()) {
      changed = oldNode.getValue() !== newNode.getValue()
    }else {
      if(oldNode.isLeafNode()) {
        this.diffChildrenRecursive_(path, fb.core.snap.EMPTY_NODE, newNode, events);
        changed = true
      }else {
        if(newNode.isLeafNode()) {
          this.diffChildrenRecursive_(path, oldNode, fb.core.snap.EMPTY_NODE, events);
          changed = true
        }else {
          changed = this.diffChildrenRecursive_(path, oldNode, newNode, events)
        }
      }
    }
  }
  changed = changed || oldNode.getPriority() !== newNode.getPriority();
  if(changed) {
    this.onDiffCallback_(path, newNode, events)
  }
  return changed
};
fb.core.view.SnapshotDiffer.prototype.diffChildrenRecursive_ = function(path, oldNode, newNode, events) {
  var changed = false;
  var shouldDiff = !this.diffMaskTree_.subTree(path).isEmpty();
  var addedChildList = [], removedChildList = [], movedChildList = [];
  var addedChildMap = {}, removedChildMap = {};
  var oldIterator, newIterator, oldChild, newChild, childPath, prevChildName, childChanged;
  oldIterator = oldNode.getIterator();
  oldChild = oldIterator.getNext();
  newIterator = newNode.getIterator();
  newChild = newIterator.getNext();
  while(oldChild !== null || newChild !== null) {
    var comparison = this.compareChildren_(oldChild, newChild);
    if(comparison < 0) {
      var addedIndex = addedChildMap[oldChild.key];
      if(goog.isDef(addedIndex)) {
        movedChildList.push({from:oldChild, to:addedChildList[addedIndex]});
        addedChildList[addedIndex] = null
      }else {
        removedChildMap[oldChild.key] = removedChildList.length;
        removedChildList.push(oldChild)
      }
      changed = true;
      oldChild = oldIterator.getNext()
    }else {
      if(comparison > 0) {
        var removedIndex = removedChildMap[newChild.key];
        if(goog.isDef(removedIndex)) {
          movedChildList.push({from:removedChildList[removedIndex], to:newChild});
          removedChildList[removedIndex] = null
        }else {
          addedChildMap[newChild.key] = addedChildList.length;
          addedChildList.push(newChild)
        }
        changed = true;
        newChild = newIterator.getNext()
      }else {
        childPath = path.child(newChild.key);
        childChanged = this.diffRecursive_(childPath, oldChild.value, newChild.value);
        if(childChanged) {
          prevChildName = newNode.getPredecessorChildName(newChild.key, newChild.value);
          events.push(new fb.core.view.Change("child_changed", newChild.value, newChild.key, prevChildName));
          changed = true
        }
        oldChild = oldIterator.getNext();
        newChild = newIterator.getNext()
      }
    }
    if(!shouldDiff && changed) {
      return true
    }
  }
  for(var i = 0;i < removedChildList.length;i++) {
    var removedChild = removedChildList[i];
    if(removedChild) {
      childPath = path.child(removedChild.key);
      this.diffRecursive_(childPath, removedChild.value, fb.core.snap.EMPTY_NODE);
      events.push(new fb.core.view.Change("child_removed", removedChild.value, removedChild.key))
    }
  }
  for(i = 0;i < addedChildList.length;i++) {
    var addedChild = addedChildList[i];
    if(addedChild) {
      childPath = path.child(addedChild.key);
      prevChildName = newNode.getPredecessorChildName(addedChild.key, addedChild.value);
      this.diffRecursive_(childPath, fb.core.snap.EMPTY_NODE, addedChild.value);
      events.push(new fb.core.view.Change("child_added", addedChild.value, addedChild.key, prevChildName))
    }
  }
  for(i = 0;i < movedChildList.length;i++) {
    var fromChild = movedChildList[i].from, toChild = movedChildList[i].to;
    childPath = path.child(toChild.key);
    prevChildName = newNode.getPredecessorChildName(toChild.key, toChild.value);
    events.push(new fb.core.view.Change("child_moved", toChild.value, toChild.key, prevChildName));
    childChanged = this.diffRecursive_(childPath, fromChild.value, toChild.value);
    if(childChanged) {
      events.push(new fb.core.view.Change("child_changed", toChild.value, toChild.key, prevChildName))
    }
  }
  return changed
};
fb.core.view.SnapshotDiffer.prototype.compareChildren_ = function(a, b) {
  if(a === null) {
    return 1
  }else {
    if(b === null) {
      return-1
    }else {
      if(a.key === b.key) {
        return 0
      }else {
        return fb.core.snap.NAME_AND_PRIORITY_COMPARATOR({name:a.key, priority:a.value.getPriority()}, {name:b.key, priority:b.value.getPriority()})
      }
    }
  }
};
goog.provide("fb.core.view.QueryView");
goog.require("fb.core.view.ViewBase");
fb.core.view.QueryView = function(query, snapshotNode, eventQueue) {
  fb.core.view.ViewBase.call(this, query, eventQueue);
  this.snapshotNode_ = fb.core.snap.EMPTY_NODE;
  this.processChanges_(snapshotNode, this.generateChangesForSnapshot(snapshotNode))
};
goog.inherits(fb.core.view.QueryView, fb.core.view.ViewBase);
fb.core.view.QueryView.prototype.processChanges_ = function(snapshotNode, changes) {
  var constraints = [], query = this.query_;
  if(goog.isDef(this.query_.startName)) {
    constraints.push(function(name, priority) {
      return fb.core.util.nameCompare(name, query.startName) >= 0
    })
  }
  if(goog.isDef(this.query_.endName)) {
    constraints.push(function(name, priority) {
      return fb.core.util.nameCompare(name, query.endName) <= 0
    })
  }
  if(goog.isDef(this.query_.startPriority)) {
    constraints.push(function(name, priority) {
      return fb.core.util.priorityCompare(priority, query.startPriority) >= 0
    })
  }
  if(goog.isDef(this.query_.endPriority)) {
    constraints.push(function(name, priority) {
      return fb.core.util.priorityCompare(priority, query.endPriority) <= 0
    })
  }
  var limitEndName = null, limitStartName = null;
  if(goog.isDef(this.query_.itemLimit)) {
    if(goog.isDef(this.query_.startPriority)) {
      limitEndName = this.getLimitName_(snapshotNode, constraints, this.query_.itemLimit, false);
      if(limitEndName) {
        var endPriority = snapshotNode.getImmediateChild(limitEndName).getPriority();
        constraints.push(function(name, priority) {
          var priorityDiff = fb.core.util.priorityCompare(priority, endPriority);
          return priorityDiff < 0 || priorityDiff === 0 && name <= limitEndName
        })
      }
    }else {
      limitStartName = this.getLimitName_(snapshotNode, constraints, this.query_.itemLimit, true);
      if(limitStartName) {
        var startPriority = snapshotNode.getImmediateChild(limitStartName).getPriority();
        constraints.push(function(name, priority) {
          var priorityDiff = fb.core.util.priorityCompare(priority, startPriority);
          return priorityDiff > 0 || priorityDiff === 0 && name >= limitStartName
        })
      }
    }
  }
  var filteredChanges = [];
  var addedChildren = [], movedChildren = [], changedChildren = [];
  for(var i = 0;i < changes.length;i++) {
    var type = changes[i].type;
    var childName = changes[i].childName, childNode = changes[i].snapshotNode;
    switch(type) {
      case fb.core.view.Change.CHILD_ADDED:
        if(this.meetsConstraints_(constraints, childName, childNode)) {
          this.snapshotNode_ = this.snapshotNode_.updateImmediateChild(childName, childNode);
          addedChildren.push(changes[i])
        }
        break;
      case fb.core.view.Change.CHILD_REMOVED:
        if(!this.snapshotNode_.getImmediateChild(childName).isEmpty()) {
          this.snapshotNode_ = this.snapshotNode_.updateImmediateChild(childName, null);
          filteredChanges.push(changes[i])
        }
        break;
      case fb.core.view.Change.CHILD_CHANGED:
        if(!this.snapshotNode_.getImmediateChild(childName).isEmpty() && this.meetsConstraints_(constraints, childName, childNode)) {
          this.snapshotNode_ = this.snapshotNode_.updateImmediateChild(childName, childNode);
          changedChildren.push(changes[i])
        }
        break;
      case fb.core.view.Change.CHILD_MOVED:
        var wasVisible = !this.snapshotNode_.getImmediateChild(childName).isEmpty();
        var isNowVisible = this.meetsConstraints_(constraints, childName, childNode);
        if(wasVisible) {
          if(isNowVisible) {
            this.snapshotNode_ = this.snapshotNode_.updateImmediateChild(childName, childNode);
            movedChildren.push(changes[i])
          }else {
            filteredChanges.push(new fb.core.view.Change("child_removed", this.snapshotNode_.getImmediateChild(childName), childName));
            this.snapshotNode_ = this.snapshotNode_.updateImmediateChild(childName, null)
          }
        }else {
          if(isNowVisible) {
            this.snapshotNode_ = this.snapshotNode_.updateImmediateChild(childName, childNode);
            addedChildren.push(changes[i])
          }
        }
        break
    }
  }
  var startDeletingAt = limitEndName || limitStartName;
  if(startDeletingAt) {
    var reverse = limitStartName !== null;
    var startAddingAt = reverse ? this.snapshotNode_.getFirstChildName() : this.snapshotNode_.getLastChildName();
    var traversal = reverse ? snapshotNode.forEachChildReverse : snapshotNode.forEachChild;
    var deleting = false, adding = false;
    var self = this;
    traversal.call(snapshotNode, function(name, node) {
      if(deleting) {
        filteredChanges.push(new fb.core.view.Change("child_removed", self.snapshotNode_.getImmediateChild(name), name));
        self.snapshotNode_ = self.snapshotNode_.updateImmediateChild(name, null)
      }else {
        if(adding) {
          addedChildren.push(new fb.core.view.Change("child_added", node, name));
          self.snapshotNode_ = self.snapshotNode_.updateImmediateChild(name, node)
        }
      }
      if(name === startAddingAt) {
        adding = true
      }
      if(name === startDeletingAt) {
        deleting = true
      }
      if(adding && deleting) {
        return true
      }
    })
  }
  for(i = 0;i < addedChildren.length;i++) {
    var item = addedChildren[i];
    var prevName = this.snapshotNode_.getPredecessorChildName(item.childName, item.snapshotNode);
    filteredChanges.push(new fb.core.view.Change("child_added", item.snapshotNode, item.childName, prevName))
  }
  for(i = 0;i < movedChildren.length;i++) {
    item = movedChildren[i];
    prevName = this.snapshotNode_.getPredecessorChildName(item.childName, item.snapshotNode);
    filteredChanges.push(new fb.core.view.Change("child_moved", item.snapshotNode, item.childName, prevName))
  }
  for(i = 0;i < changedChildren.length;i++) {
    item = changedChildren[i];
    prevName = this.snapshotNode_.getPredecessorChildName(item.childName, item.snapshotNode);
    filteredChanges.push(new fb.core.view.Change("child_changed", item.snapshotNode, item.childName, prevName))
  }
  if(this.isComplete_ && filteredChanges.length > 0) {
    filteredChanges.push(new fb.core.view.Change("value", this.snapshotNode_))
  }
  return filteredChanges
};
fb.core.view.QueryView.prototype.getLimitName_ = function(snapshotNode, constraints, limit, reverse) {
  var forEachChild = reverse ? snapshotNode.forEachChildReverse : snapshotNode.forEachChild;
  var self = this, lastChild = null;
  forEachChild.call(snapshotNode, function(childName, child) {
    if(self.meetsConstraints_(constraints, childName, child)) {
      lastChild = childName;
      limit--;
      if(limit === 0) {
        return true
      }
    }
  });
  return lastChild
};
fb.core.view.QueryView.prototype.meetsConstraints_ = function(constraints, childName, child) {
  for(var i = 0;i < constraints.length;i++) {
    if(!constraints[i](childName, child.getPriority())) {
      return false
    }
  }
  return true
};
goog.provide("fb.core.ViewManager");
goog.require("fb.core.view.DefaultView");
goog.require("fb.core.view.QueryView");
goog.require("fb.core.view.SnapshotDiffer");
fb.core.ViewManager = function(connection, data) {
  this.connection_ = connection;
  this.data_ = data;
  this.oldDataNode_ = data.rootNode_;
  this.viewsTree_ = new fb.core.util.Tree
};
fb.core.ViewManager.prototype.addEventCallbackForQuery = function(query, eventType, callback) {
  var path = query.path;
  var viewsNode = this.viewsTree_.subTree(path);
  var queryMap = viewsNode.getValue();
  if(queryMap === null) {
    queryMap = {};
    viewsNode.setValue(queryMap)
  }
  var queryId = query.queryIdentifier();
  if(!(queryId in queryMap)) {
    queryMap = queryMap || {};
    queryMap[queryId] = {};
    this.ensureListening_(viewsNode, queryMap, queryId, query)
  }
  var view = queryMap[queryId].view;
  if(!view) {
    var snapNode = this.data_.rootNode_.getChild(path);
    view = this.createView_(query, snapNode);
    queryMap[queryId].view = view;
    var isComplete = this.viewsTree_.subTree(path).forEachAncestor(function(viewsNode) {
      if(viewsNode.getValue() && viewsNode.getValue()["default"] && viewsNode.getValue()["default"].view.isComplete()) {
        return true
      }
    });
    isComplete = isComplete || this.connection_ === null;
    if(isComplete) {
      view.markComplete()
    }
  }
  view.addEventCallback(eventType, callback)
};
fb.core.ViewManager.prototype.removeEventCallbackForQuery = function(query, eventType, callback) {
  var path = query.path;
  var viewsNode = this.viewsTree_.subTree(path);
  var queryMap = viewsNode.getValue();
  var r;
  if(queryMap === null || !queryId in queryMap) {
    return
  }
  var queryId = query.queryIdentifier();
  if(queryId !== "default") {
    var view = queryMap[queryId].view;
    view.removeEventCallback(eventType, callback);
    if(!view.hasCallbacks()) {
      if(queryMap[queryId].stopListener) {
        queryMap[queryId].stopListener();
        delete queryMap[queryId].stopListener
      }
      delete queryMap[queryId]
    }
  }else {
    var foundQueryId = null, lastCallback = false;
    for(var qid in queryMap) {
      if(queryMap[qid].view.removeEventCallback(eventType, callback)) {
        foundQueryId = qid;
        break
      }
    }
    if(foundQueryId && !queryMap[foundQueryId].view.hasCallbacks()) {
      if(queryMap[foundQueryId].stopListener) {
        if(foundQueryId === "default") {
          this.addNecessaryListens_(viewsNode, queryMap[foundQueryId].view.isComplete())
        }
        queryMap[foundQueryId].stopListener();
        delete queryMap[foundQueryId].stopListener
      }
      delete queryMap[foundQueryId]
    }
  }
};
fb.core.ViewManager.prototype.markQueriesComplete = function(path, includeSelf) {
  var viewsNode = this.viewsTree_.subTree(path), self = this;
  viewsNode.forEachDescendant(function(descendant) {
    var queryMap = descendant.getValue();
    if(queryMap) {
      for(var qid in queryMap) {
        queryMap[qid].view.markComplete()
      }
    }
  }, includeSelf, true)
};
fb.core.ViewManager.prototype.raiseEventsForChange = function(changePath) {
  var self = this;
  var oldNode = this.oldDataNode_;
  var newNode = this.data_.rootNode_;
  this.oldDataNode_ = newNode;
  var changePathString = changePath.toString();
  var onDiff = function(path, snapNode, changes) {
    if(path.toString().substring(0, changePathString.length) === changePathString) {
      self.markQueriesComplete(path, false);
      self.processChanges(path, snapNode, changes);
      self.markQueriesComplete(path, true)
    }else {
      self.processChanges(path, snapNode, changes)
    }
  };
  fb.core.view.SnapshotDiffer.Diff(oldNode, newNode, changePath, this.viewsTree_, onDiff);
  this.markQueriesComplete(changePath, true)
};
fb.core.ViewManager.prototype.processChanges = function(path, snapNode, changes) {
  var queryMap = this.viewsTree_.subTree(path).getValue();
  if(queryMap === null) {
    return
  }
  for(var queryId in queryMap) {
    queryMap[queryId].view.processChanges(snapNode, changes)
  }
};
fb.core.ViewManager.prototype.ensureListening_ = function(viewNode, queryMap, queryId, query) {
  var ancestorListeningOnFullSubtree = false;
  viewNode.forEachAncestor(function(node) {
    if(node.getValue() && node.getValue()["default"] && node.getValue()["default"].stopListener) {
      ancestorListeningOnFullSubtree = true
    }
  });
  if(!ancestorListeningOnFullSubtree) {
    queryMap[queryId].stopListener = this.startListening(query);
    if(queryId === "default") {
      viewNode.forEachDescendant(function(node) {
        var descendantQueryMap = node.getValue();
        if(descendantQueryMap !== null) {
          for(var queryId in descendantQueryMap) {
            if(descendantQueryMap[queryId].stopListener) {
              descendantQueryMap[queryId].stopListener();
              delete descendantQueryMap[queryId].stopListener
            }
          }
        }
      })
    }
  }
};
fb.core.ViewManager.prototype.addNecessaryListens_ = function(viewsNode, isComplete) {
  var self = this;
  viewsNode.forEachChild(function(child) {
    var childQueryMap = child.getValue();
    if(childQueryMap && "default" in childQueryMap) {
      fb.core.util.assert(!childQueryMap["default"].stopListener);
      childQueryMap["default"].stopListener = self.startListening(childQueryMap["default"].view.query_)
    }else {
      if(childQueryMap) {
        for(var queryId in childQueryMap) {
          fb.core.util.assert(!childQueryMap[queryId].stopListener);
          childQueryMap[queryId].stopListener = self.startListening(childQueryMap[queryId].view.query_)
        }
      }
      self.addNecessaryListens_(child, isComplete)
    }
  })
};
fb.core.ViewManager.prototype.startListening = function(query) {
  if(this.connection_) {
    var path = query.path.toString();
    this.connection_.listen(path, query.queryObject());
    return goog.bind(this.connection_.unlisten, this.connection_, path, query.queryObject())
  }else {
    return goog.nullFunction
  }
};
fb.core.ViewManager.prototype.createView_ = function(query, snapNode, isComplete) {
  if(query.queryIdentifier() === "default") {
    return new fb.core.view.DefaultView(query, snapNode)
  }else {
    return new fb.core.view.QueryView(query, snapNode)
  }
};
goog.provide("fb.core.Repo");
goog.require("fb.core.PersistentConnection");
goog.require("fb.api.DataSnapshot");
goog.require("fb.core.FirebaseData");
goog.require("fb.core.FirebaseData");
goog.require("fb.core.ViewManager");
goog.require("fb.core.util.Tree");
goog.require("fb.core.util.json");
goog.require("goog.string");
fb.core.Repo = function(repoInfo) {
  this.repoInfo_ = repoInfo;
  this.connection_ = new fb.core.PersistentConnection(this.repoInfo_, goog.bind(this.onDataUpdate_, this), goog.bind(this.onConnected_, this), goog.bind(this.onDisconnected_, this));
  this.transactionQueues_ = new fb.core.util.Tree;
  this.data_ = new fb.core.FirebaseData;
  this.viewManager_ = new fb.core.ViewManager(this.connection_, this.data_.visibleData);
  this.infoData_ = new fb.core.SnapshotHolder(this);
  this.infoViewManager_ = new fb.core.ViewManager(null, this.infoData_);
  this.updateInfo_("connected", false)
};
fb.core.Repo.prototype.toString = function() {
  return(this.repoInfo_.secure ? "https://" : "http://") + this.repoInfo_.host + "/" + goog.string.urlEncode(this.repoInfo_.namespace)
};
fb.core.Repo.prototype.name = function() {
  return this.repoInfo_.namespace
};
fb.core.Repo.prototype.onDataUpdate_ = function(pathString, data) {
  var path, newNode;
  if(pathString.length >= 9 && pathString.lastIndexOf(".priority") === pathString.length - 9) {
    path = new fb.core.util.Path(pathString.substring(0, pathString.length - 9));
    var priority = data;
    if(priority !== null && fb.core.util.isNumeric(priority)) {
      priority = Number(priority)
    }
    newNode = this.data_.serverData.getNode(path).updatePriority(priority)
  }else {
    path = new fb.core.util.Path(pathString);
    newNode = fb.core.snap.NodeFromJSON(data)
  }
  var changed = this.data_.updateServerData(path, newNode);
  if(changed) {
    var rootMostTransactionNode = this.getAncestorTransactionNode_(path);
    this.rerunTransactionsUnderNode_(rootMostTransactionNode);
    path = rootMostTransactionNode.path()
  }
  this.viewManager_.raiseEventsForChange(path)
};
fb.core.Repo.prototype.onConnected_ = function() {
  this.updateInfo_("connected", true)
};
fb.core.Repo.prototype.onDisconnected_ = function() {
  this.updateInfo_("connected", false)
};
fb.core.Repo.prototype.updateInfo_ = function(pathString, value) {
  var path = new fb.core.util.Path("/.info/" + pathString);
  this.infoData_.updateSnapshot(path, fb.core.snap.NodeFromJSON(value));
  this.infoViewManager_.raiseEventsForChange(path)
};
fb.core.Repo.prototype.auth = function(user, cred, callback) {
  this.connection_.auth(user, cred, callback)
};
fb.core.Repo.prototype.setWithPriority = function(path, newVal, newPriority, onComplete) {
  if(newPriority !== null && fb.core.util.isNumeric(newPriority)) {
    newPriority = Number(newPriority)
  }
  this.log_("set", {path:path.toString(), value:newVal});
  var newNode = fb.core.snap.NodeFromJSON(newVal, newPriority);
  var setId = this.data_.set(path, newNode);
  var self = this;
  this.connection_.put(path.toString(), newNode.val(true), function(status) {
    var success = status === "success";
    fb.core.util.assert(success, "put at " + path + " failed.");
    self.data_.setCompleted(path, setId);
    if(onComplete) {
      onComplete(true)
    }
  });
  var rootMostTransactionNode = this.getAncestorTransactionNode_(path);
  this.abortTransactions_(path);
  this.rerunTransactionsUnderNode_(rootMostTransactionNode);
  this.viewManager_.raiseEventsForChange(rootMostTransactionNode.path())
};
fb.core.Repo.prototype.setPriority = function(path, priority, opt_onComplete) {
  this.log_("setPriority", {path:path.toString(), priority:priority});
  var newNode = this.data_.mergedData.getNode(path).updatePriority(priority);
  var setId = this.data_.set(path, newNode);
  var self = this;
  this.connection_.put(path.toString() + "/.priority", priority, function(status) {
    var success = status === "success";
    self.data_.setCompleted(path, setId);
    if(opt_onComplete) {
      opt_onComplete(success)
    }
  });
  var transactionNode = this.getAncestorTransactionNode_(path);
  this.rerunTransactionsUnderNode_(transactionNode);
  this.viewManager_.raiseEventsForChange(transactionNode.path())
};
fb.core.Repo.prototype.setOnDisconnect = function(path, value) {
  this.connection_.onDisconnect(path.toString(), value)
};
fb.core.Repo.prototype.addEventCallbackForQuery = function(query, eventType, callback) {
  if(query.path.getFront() === ".info") {
    this.infoViewManager_.addEventCallbackForQuery(query, eventType, callback)
  }else {
    this.viewManager_.addEventCallbackForQuery(query, eventType, callback)
  }
};
fb.core.Repo.prototype.removeEventCallbackForQuery = function(query, eventType, callback) {
  if(query.path.getFront() === ".info") {
    this.infoViewManager_.removeEventCallbackForQuery(query, eventType, callback)
  }else {
    this.viewManager_.removeEventCallbackForQuery(query, eventType, callback)
  }
};
fb.core.Repo.prototype.log_ = function() {
  fb.core.util.log(this.connection_.id + ":", arguments)
};
fb.core.Repo.prototype.getSnapshot_ = function(path) {
  var snapshotRef = new Firebase(this, path);
  return new fb.api.DataSnapshot(this.data_.visibleData.getNode(path), snapshotRef)
};
goog.provide("fb.core.Repo_transaction");
goog.require("fb.core.Repo");
fb.core.TransactionStatus = {RUN:1, SENT:2, COMPLETED:3, SENT_NEEDS_ABORT_DUE_TO_SET:4, NEEDS_ABORT_DUE_TO_SET:5, NEEDS_ABORT_DUE_TO_DISCONNECT:6};
fb.core.MAX_TRANSACTION_RETRIES_ = 25;
fb.core.Repo.prototype.abortTransactions_ = function(path) {
  var transactionNode = this.transactionQueues_.subTree(path);
  var self = this;
  transactionNode.forEachAncestor(function(node) {
    self.abortTransactionsOnNode_(node)
  });
  this.abortTransactionsOnNode_(transactionNode);
  transactionNode.forEachDescendant(function(node) {
    self.abortTransactionsOnNode_(node)
  })
};
fb.core.Repo.prototype.abortTransactionsOnNode_ = function(node) {
  var queue = node.getValue();
  if(queue !== null) {
    var lastSent = -1;
    for(var i = 0;i < queue.length;i++) {
      if(queue[i].status === fb.core.TransactionStatus.SENT) {
        fb.core.util.assert(lastSent === i - 1, "All SENT items should be at beginning of queue.");
        lastSent = i;
        queue[i].status = fb.core.TransactionStatus.SENT_NEEDS_ABORT_DUE_TO_SET
      }else {
        queue[i].unwatcher();
        if(queue[i].onComplete) {
          var snapshot = this.getSnapshot_(node.path());
          queue[i].onComplete(false, snapshot)
        }
      }
    }
    if(lastSent === -1) {
      node.setValue(null)
    }else {
      queue.length = lastSent + 1
    }
  }
};
fb.core.Repo.prototype.startTransaction = function(path, transactionUpdate, onComplete) {
  this.log_("transaction on " + path);
  var valueCallback = function() {
  };
  var watchRef = new Firebase(this, path);
  watchRef.on("value", valueCallback);
  var unwatcher = function() {
    watchRef.off("value", valueCallback)
  };
  var transaction = {path:path, update:transactionUpdate, onComplete:onComplete, order:fb.core.util.LUIDGenerator(), retryCount:0, unwatcher:unwatcher};
  var visibleData = this.data_.visibleData;
  var newVal = transaction.update(visibleData.getNode(path).val());
  if(!goog.isDef(newVal)) {
    transaction.unwatcher();
    if(transaction.onComplete) {
      var snapshot = this.getSnapshot_(path);
      transaction.onComplete(false, snapshot)
    }
  }else {
    fb.core.util.validateFirebaseData("transaction failed: Data returned ", newVal);
    var currentNode = this.data_.mergedData.getNode(path);
    var priorityForNode = currentNode.getPriority();
    visibleData.updateSnapshot(path, fb.core.snap.NodeFromJSON(newVal, priorityForNode));
    this.viewManager_.raiseEventsForChange(path);
    transaction.status = fb.core.TransactionStatus.RUN;
    var transactionNode = this.transactionQueues_.subTree(path);
    var nodeQueue = transactionNode.getValue() || [];
    nodeQueue.push(transaction);
    transactionNode.setValue(nodeQueue);
    this.sendTransactions_()
  }
};
fb.core.Repo.prototype.sendTransactions_ = function(opt_node) {
  var node = opt_node || this.transactionQueues_;
  if(!opt_node) {
    this.pruneCompletedTransactionsBelowNode_(node)
  }
  if(node.isEmpty()) {
    return
  }else {
    if(node.getValue() !== null) {
      this.tryToSendTransactionForNode_(node)
    }else {
      var self = this;
      node.forEachChild(function(childNode) {
        self.sendTransactions_(childNode)
      })
    }
  }
};
fb.core.Repo.prototype.tryToSendTransactionForNode_ = function(node) {
  var queue = this.buildTransactionQueue_(node);
  if(queue.length === 0) {
    return
  }
  var path = node.path();
  if(queue[0].status !== fb.core.TransactionStatus.SENT && queue[0].status !== fb.core.TransactionStatus.SENT_NEEDS_ABORT_DUE_TO_SET) {
    for(var i = 0;i < queue.length;i++) {
      fb.core.util.assert(queue[i].status === fb.core.TransactionStatus.RUN, "tryToSendTransactionForNode_: items in queue should all be run.");
      queue[i].status = fb.core.TransactionStatus.SENT;
      queue[i].retryCount++
    }
    var beforeHash = this.data_.mergedData.getNode(path).hash();
    this.data_.mergedData.updateSnapshot(path, this.data_.visibleData.getNode(path));
    var currData = this.data_.mergedData.getNode(path).val(true);
    var putId = fb.core.util.LUIDGenerator();
    this.data_.pendingPuts.subTree(path).setValue(putId);
    var self = this;
    this.connection_.put(path.toString(), currData, function(status) {
      self.log_("transaction put response", {path:path.toString(), status:status});
      var pendingPutTree = self.data_.pendingPuts.subTree(path);
      var pendingPut = pendingPutTree.getValue();
      fb.core.util.assert(pendingPut !== null, "tryToSendTransactionsForNode_: pendingPut should not be null.");
      if(pendingPut === putId) {
        pendingPutTree.setValue(null);
        self.data_.mergedData.updateSnapshot(path, self.data_.serverData.getNode(path))
      }
      if(status === "success") {
        var callbacks = [];
        for(i = 0;i < queue.length;i++) {
          queue[i].status = fb.core.TransactionStatus.COMPLETED;
          if(queue[i].onComplete) {
            var snapshot = self.getSnapshot_(queue[i].path);
            callbacks.push(goog.bind(queue[i].onComplete, null, true, snapshot))
          }
          queue[i].unwatcher()
        }
        self.pruneCompletedTransactionsBelowNode_(node);
        for(i = 0;i < callbacks.length;i++) {
          callbacks[i]()
        }
        self.sendTransactions_()
      }else {
        if(status === "datastale" || status === "disconnect") {
          if(status === "datastale") {
            for(i = 0;i < queue.length;i++) {
              if(queue[i].status === fb.core.TransactionStatus.SENT_NEEDS_ABORT_DUE_TO_SET) {
                queue[i].status = fb.core.TransactionStatus.NEEDS_ABORT_DUE_TO_SET
              }else {
                queue[i].status = fb.core.TransactionStatus.RUN
              }
            }
          }else {
            if(status === "disconnect") {
              for(i = 0;i < queue.length;i++) {
                queue[i].status = fb.core.TransactionStatus.NEEDS_ABORT_DUE_TO_DISCONNECT
              }
            }
          }
          var rootMostTransactionNode = self.getAncestorTransactionNode_(path);
          self.rerunTransactionsUnderNode_(rootMostTransactionNode);
          self.viewManager_.raiseEventsForChange(rootMostTransactionNode.path())
        }else {
          fb.core.util.assert(false, "Got unexpected put response to transaction: " + status)
        }
      }
    }, beforeHash)
  }
};
fb.core.Repo.prototype.rerunTransactionsUnderNode_ = function(node) {
  var path = node.path();
  this.data_.visibleData.updateSnapshot(path, this.data_.mergedData.getNode(path));
  var queue = this.buildTransactionQueue_(node);
  if(queue.length !== 0) {
    var currNode = this.data_.visibleData.getNode(path);
    for(var i = 0;i < queue.length;i++) {
      var relativePath = fb.core.util.Path.RelativePath(path, queue[i].path);
      var abortTransaction = false, abortReason;
      fb.core.util.assert(relativePath !== null, "rerunTransactionsUnderNode_: relativePath should not be null.");
      if(queue[i].status === fb.core.TransactionStatus.NEEDS_ABORT_DUE_TO_SET) {
        abortTransaction = true;
        abortReason = "set"
      }else {
        if(queue[i].status === fb.core.TransactionStatus.NEEDS_ABORT_DUE_TO_DISCONNECT) {
          abortTransaction = true;
          abortReason = "disconnect"
        }else {
          if(queue[i].status === fb.core.TransactionStatus.RUN) {
            if(queue[i].retryCount >= fb.core.MAX_TRANSACTION_RETRIES_) {
              abortTransaction = true;
              abortReason = "maxretry"
            }else {
              var newData = queue[i].update(currNode.getChild(relativePath).val());
              if(goog.isDef(newData)) {
                fb.core.util.validateFirebaseData("transaction failed: Data returned ", newData);
                currNode = currNode.updateChild(relativePath, fb.core.snap.NodeFromJSON(newData))
              }else {
                abortTransaction = true;
                abortReason = "nodata"
              }
            }
          }
        }
      }
      if(abortTransaction) {
        queue[i].unwatcher();
        queue[i].status = fb.core.TransactionStatus.COMPLETED;
        if(queue[i].onComplete) {
          var ref = new Firebase(this, queue[i].path);
          var snapshot = new fb.api.DataSnapshot(currNode.getChild(relativePath), ref);
          queue[i].onComplete(false, snapshot, abortReason)
        }
      }
    }
    var currentNode = this.data_.mergedData.getNode(path);
    var priorityForNode = currentNode.getPriority();
    this.data_.visibleData.updateSnapshot(path, currNode.updatePriority(priorityForNode));
    this.sendTransactions_()
  }
};
fb.core.Repo.prototype.getAncestorTransactionNode_ = function(path) {
  var front;
  var transactionNode = this.transactionQueues_;
  while((front = path.getFront()) !== null && transactionNode.getValue() === null) {
    transactionNode = transactionNode.subTree(front);
    path = path.popFront()
  }
  return transactionNode
};
fb.core.Repo.prototype.buildTransactionQueue_ = function(transactionNode) {
  var transactionQueue = [];
  this.aggregateTransactionQueuesForNode_(transactionNode, transactionQueue);
  transactionQueue.sort(function(a, b) {
    return a.order - b.order
  });
  return transactionQueue
};
fb.core.Repo.prototype.aggregateTransactionQueuesForNode_ = function(node, queue) {
  var nodeQueue = node.getValue();
  if(nodeQueue !== null) {
    for(var i = 0;i < nodeQueue.length;i++) {
      queue.push(nodeQueue[i])
    }
  }
  var self = this;
  node.forEachChild(function(child) {
    self.aggregateTransactionQueuesForNode_(child, queue)
  })
};
fb.core.Repo.prototype.pruneCompletedTransactionsBelowNode_ = function(node) {
  var queue = node.getValue();
  if(queue) {
    var to = 0;
    for(var from = 0;from < queue.length;from++) {
      if(queue[from].status !== fb.core.TransactionStatus.COMPLETED) {
        queue[to] = queue[from];
        to++
      }
    }
    queue.length = to;
    node.setValue(queue.length > 0 ? queue : null)
  }
  var self = this;
  node.forEachChild(function(childNode) {
    self.pruneCompletedTransactionsBelowNode_(childNode)
  })
};
goog.provide("fb.core.RepoManager");
goog.require("fb.core.Repo");
goog.require("fb.core.Repo_transaction");
fb.core.RepoManager = function() {
  this.repos_ = {}
};
goog.addSingletonGetter(fb.core.RepoManager);
fb.core.RepoManager.prototype.getRepo = function(repoInfo) {
  var repoHashString = (repoInfo.secure ? "https://" : "http://") + repoInfo.host + "/" + repoInfo.namespace;
  var repo = this.repos_[repoHashString];
  if(!repo) {
    repo = new fb.core.Repo(repoInfo);
    this.repos_[repoHashString] = repo
  }
  return repo
};
goog.provide("fb.api.TEST_HOOKS");
goog.require("fb.realtime.Connection");
fb.api.TEST_HOOKS = {};
fb.api.TEST_HOOKS.repos = function() {
  return fb.core.RepoManager.getInstance().repos_
};
goog.exportProperty(fb.api.TEST_HOOKS, "repos", fb.api.TEST_HOOKS.repos);
fb.api.TEST_HOOKS.hijackHash = function(newHash) {
  var oldHash = fb.core.snap.ChildrenNode.prototype.hash;
  fb.core.snap.ChildrenNode.prototype.hash = newHash;
  return function() {
    fb.core.snap.ChildrenNode.prototype.hash = oldHash
  }
};
goog.exportProperty(fb.api.TEST_HOOKS, "hijackHash", fb.api.TEST_HOOKS.hijackHash);
fb.api.TEST_HOOKS.queryIdentifier = function(query) {
  return query.queryIdentifier()
};
goog.exportProperty(fb.api.TEST_HOOKS, "queryIdentifier", fb.api.TEST_HOOKS.queryIdentifier);
fb.api.TEST_HOOKS.listens = function(firebaseRef) {
  return firebaseRef.repo.connection_.listens_
};
goog.exportProperty(fb.api.TEST_HOOKS, "listens", fb.api.TEST_HOOKS.listens);
fb.api.TEST_HOOKS.refConnection = function(firebaseRef) {
  return firebaseRef.repo.connection_.realtime_
};
goog.exportProperty(fb.api.TEST_HOOKS, "refConnection", fb.api.TEST_HOOKS.refConnection);
fb.api.TEST_HOOKS.RealTimeConnection = fb.realtime.Connection;
goog.exportProperty(fb.api.TEST_HOOKS, "RealTimeConnection", fb.api.TEST_HOOKS.RealTimeConnection);
goog.exportProperty(fb.realtime.Connection.prototype, "sendRequest", fb.realtime.Connection.prototype.sendRequest);
goog.exportProperty(fb.realtime.Connection.prototype, "close", fb.realtime.Connection.prototype.close);
goog.provide("fb.core.util.NextPushId");
goog.require("fb.core.util");
fb.core.util.NextPushId = function() {
  var PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
  var lastPushTime = 0;
  var lastRandChars = [];
  return function() {
    var now = fb.core.util.getTime();
    var duplicateTime = now === lastPushTime;
    lastPushTime = now;
    var timeStampChars = new Array(8);
    for(var i = 7;i >= 0;i--) {
      timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
      now = Math.floor(now / 64)
    }
    fb.core.util.assert(now === 0);
    var id = timeStampChars.join("");
    if(!duplicateTime) {
      for(i = 0;i < 12;i++) {
        lastRandChars[i] = Math.floor(Math.random() * 64)
      }
    }else {
      for(i = 11;i >= 0 && lastRandChars[i] === 63;i--) {
        lastRandChars[i] = 0
      }
      lastRandChars[i]++
    }
    for(i = 0;i < 12;i++) {
      id += PUSH_CHARS.charAt(lastRandChars[i])
    }
    fb.core.util.assert(id.length === 20, "NextPushId: Length should be 20.");
    return id
  }
}();
goog.provide("Firebase");
goog.require("fb.constants");
goog.require("fb.core.util");
goog.require("fb.core.RepoManager");
goog.require("fb.api.Query");
goog.require("fb.core.util_validation");
goog.require("fb.core.util.NextPushId");
goog.require("goog.string");
goog.require("fb.api.TEST_HOOKS");
Firebase = function() {
  var repo, path;
  if(arguments[0] instanceof fb.core.Repo) {
    repo = arguments[0];
    path = arguments[1]
  }else {
    fb.core.util.validateArgCount("new Firebase", 1, 1, arguments.length);
    var parsedUrl = fb.core.util.parseURL(arguments[0]);
    fb.core.util.validateUrl("new Firebase", 1, parsedUrl, false);
    fb.core.util.validateDemoServer(parsedUrl.repoInfo.host);
    var repoManager = fb.core.RepoManager.getInstance();
    repo = repoManager.getRepo(parsedUrl.repoInfo);
    path = parsedUrl.path
  }
  fb.api.Query.call(this, repo, path)
};
goog.inherits(Firebase, fb.api.Query);
if(NODE_CLIENT) {
  module["exports"] = Firebase
}
Firebase.prototype.name = function() {
  fb.core.util.validateArgCount("Firebase.name", 0, 0, arguments.length);
  if(this.path.isEmpty()) {
    return this.repo.name()
  }else {
    return this.path.getBack()
  }
};
Firebase.prototype.child = function(pathString) {
  fb.core.util.validateArgCount("Firebase.child", 1, 1, arguments.length);
  if(goog.isNumber(pathString)) {
    pathString = String(pathString)
  }else {
    if(!(pathString instanceof fb.core.util.Path)) {
      if(this.path.getFront() === null) {
        fb.core.util.validateRootPathString("Firebase.child", 1, pathString, false)
      }else {
        fb.core.util.validatePathString("Firebase.child", 1, pathString, false)
      }
    }
  }
  return new Firebase(this.repo, this.path.child(pathString))
};
Firebase.prototype.parent = function() {
  fb.core.util.validateArgCount("Firebase.parent", 0, 0, arguments.length);
  var parentPath = this.path.parent();
  return parentPath === null ? null : new Firebase(this.repo, parentPath)
};
Firebase.prototype.toString = function() {
  fb.core.util.validateArgCount("Firebase.toString", 0, 0, arguments.length);
  if(this.parent() === null) {
    return this.repo.toString()
  }else {
    return this.parent().toString() + "/" + goog.string.urlEncode(this.name())
  }
};
Firebase.prototype.set = function(newVal, onComplete) {
  fb.core.util.validateArgCount("Firebase.set", 1, 2, arguments.length);
  fb.core.util.validateWritablePath("Firebase.set", this.path);
  fb.core.util.validateFirebaseDataArg("Firebase.set", 1, newVal, false);
  fb.core.util.validateCallback("Firebase.set", 2, onComplete, true);
  if(this.name() === ".length" || this.name() === ".keys") {
    throw"Firebase.set failed: " + this.name() + " is a read-only object.";
  }
  return this.repo.setWithPriority(this.path, newVal, null, onComplete)
};
Firebase.prototype.setWithPriority = function(newVal, newPriority, onComplete) {
  fb.core.util.validateArgCount("Firebase.setWithPriority", 2, 3, arguments.length);
  fb.core.util.validateWritablePath("Firebase.setWithPriority", this.path);
  fb.core.util.validateFirebaseDataArg("Firebase.setWithPriority", 1, newVal, false);
  fb.core.util.validatePriority("Firebase.setWithPriority", 2, newPriority, false);
  fb.core.util.validateCallback("Firebase.setWithPriority", 3, onComplete, true);
  if(this.name() === ".length" || this.name() === ".keys") {
    throw"Firebase.setWithPriority failed: " + this.name() + " is a read-only object.";
  }
  return this.repo.setWithPriority(this.path, newVal, newPriority, onComplete)
};
Firebase.prototype.remove = function(onComplete) {
  fb.core.util.validateArgCount("Firebase.remove", 0, 1, arguments.length);
  fb.core.util.validateWritablePath("Firebase.remove", this.path);
  fb.core.util.validateCallback("Firebase.remove", 1, onComplete, true);
  this.set(null, onComplete)
};
Firebase.prototype.transaction = function(transactionUpdate, onComplete) {
  fb.core.util.validateArgCount("Firebase.transaction", 1, 2, arguments.length);
  fb.core.util.validateWritablePath("Firebase.transaction", this.path);
  fb.core.util.validateCallback("Firebase.transaction", 1, transactionUpdate, false);
  fb.core.util.validateCallback("Firebase.transaction", 2, onComplete, true);
  if(this.name() === ".length" || this.name() === ".keys") {
    throw"Firebase.transaction failed: " + this.name() + " is a read-only object.";
  }
  this.repo.startTransaction(this.path, transactionUpdate, onComplete)
};
Firebase.prototype.setPriority = function(priority, opt_onComplete) {
  fb.core.util.validateArgCount("Firebase.setPriority", 1, 2, arguments.length);
  fb.core.util.validateWritablePath("Firebase.setPriority", this.path);
  fb.core.util.validatePriority("Firebase.setPriority", 1, priority, false);
  fb.core.util.validateCallback("Firebase.setPriority", 2, opt_onComplete, true);
  if(priority !== null && fb.core.util.isNumeric(priority)) {
    priority = Number(priority)
  }
  this.repo.setPriority(this.path, priority, opt_onComplete)
};
Firebase.prototype.push = function(value, callback) {
  fb.core.util.validateArgCount("Firebase.push", 0, 2, arguments.length);
  fb.core.util.validateWritablePath("Firebase.push", this.path);
  fb.core.util.validateFirebaseDataArg("Firebase.push", 1, value, true);
  fb.core.util.validateCallback("Firebase.push", 2, callback, true);
  var name = fb.core.util.NextPushId();
  var pushedRef = this.child(name);
  if(typeof value !== "undefined" && value !== null) {
    pushedRef.set(value, callback)
  }
  return pushedRef
};
Firebase.prototype.removeOnDisconnect = function() {
  fb.core.util.validateArgCount("Firebase.removeOnDisconnect", 0, 0, arguments.length);
  this.repo.setOnDisconnect(this.path, null)
};
Firebase.prototype.setOnDisconnect = function(value) {
  fb.core.util.validateArgCount("Firebase.setOnDisconnect", 1, 1, arguments.length);
  fb.core.util.validateFirebaseDataArg("Firebase.setOnDisconnect", 1, value, false);
  this.repo.setOnDisconnect(this.path, value)
};
Firebase.prototype.authAdmin = function(secret, callback) {
  fb.core.util.validateArgCount("Firebase.authAdmin", 1, 2, arguments.length);
  fb.core.util.validateCredential("Firebase.authAdmin", 1, secret, false);
  fb.core.util.validateCallback("Firebase.authAdmin", 2, callback, true);
  this.repo.auth(null, secret, callback)
};
Firebase.prototype.authUser = function(user, cred, callback) {
  fb.core.util.validateArgCount("Firebase.authUser", 2, 3, arguments.length);
  fb.core.util.validateUser("Firebase.authUser", 1, user, false);
  fb.core.util.validateCredential("Firebase.authUser", 2, cred, false);
  fb.core.util.validateCallback("Firebase.authUser", 3, callback, true);
  this.repo.auth(user, cred, callback)
};
Firebase.enableLogging = function(logger) {
  if(logger === true) {
    if(typeof console !== "undefined") {
      fb.core.util.logger = goog.bind(console.log, console)
    }
  }else {
    if(logger) {
      fb.core.util.logger = logger
    }else {
      fb.core.util.logger = null
    }
  }
};
Firebase.TEST_HOOKS = fb.api.TEST_HOOKS;

