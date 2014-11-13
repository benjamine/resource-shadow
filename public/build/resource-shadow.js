!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.resourceShadow=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){

// global exports

var ResourceShadow = require('./resource-shadow');
exports.ResourceShadow = ResourceShadow;
exports.create = ResourceShadow.create;

if (process.browser) {
  // exports only for browser bundle
  exports.version = '0.0.5';
  exports.homepage = 'https://github.com/benjamine/resource-shadow';
} else {
  // exports only for node.js
  var packageInfo = require('../pack' + 'age.json');
  exports.version = packageInfo.version;
  exports.homepage = packageInfo.homepage;
}

}).call(this,require('_process'))
},{"./resource-shadow":6,"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
function M() { this._events = {}; }
M.prototype = {
  on: function(ev, cb) {
    this._events || (this._events = {});
    var e = this._events;
    (e[ev] || (e[ev] = [])).push(cb);
    return this;
  },
  removeListener: function(ev, cb) {
    var e = this._events[ev] || [], i;
    for(i = e.length-1; i >= 0 && e[i]; i--){
      if(e[i] === cb || e[i].cb === cb) { e.splice(i, 1); }
    }
  },
  removeAllListeners: function(ev) {
    if(!ev) { this._events = {}; }
    else { this._events[ev] && (this._events[ev] = []); }
  },
  emit: function(ev) {
    this._events || (this._events = {});
    var args = Array.prototype.slice.call(arguments, 1), i, e = this._events[ev] || [];
    for(i = e.length-1; i >= 0 && e[i]; i--){
      e[i].apply(this, args);
    }
    return this;
  },
  when: function(ev, cb) {
    return this.once(ev, cb, true);
  },
  once: function(ev, cb, when) {
    if(!cb) return this;
    function c() {
      if(!when) this.removeListener(ev, c);
      if(cb.apply(this, arguments) && when) this.removeListener(ev, c);
    }
    c.cb = cb;
    this.on(ev, c);
    return this;
  }
};
M.mixin = function(dest) {
  var o = M.prototype, k;
  for (k in o) {
    o.hasOwnProperty(k) && (dest.prototype[k] = o[k]);
  }
};
module.exports = M;

},{}],4:[function(require,module,exports){

function HttpHandler() {
}

HttpHandler.prototype.ajax = function(method, url, headers, body, callback) {

  // simple browser implementation
  var request = new XMLHttpRequest();
  request.open(method, url, true);
  if (body) {
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  }
  if (headers) {
    for (var header in headers) {
      request.setRequestHeader(header, headers[header]);
    }
  }

  var data;
  var complete = false;
  request.onload = function() {
    if (complete) {
      return;
    }
    complete = true;
    if (request.status >= 200 && request.status < 400) {
      // Success!
      data = request.responseText;
      callback(null, data);
    } else {
      // We reached our target server, but it returned an error
      var err = new Error('http error ' + request.status);
      err.status = request.status;
      callback(err);
    }
  };

  request.onerror = function(err) {
    // There was a connection error of some sort
    if (complete) {
      return;
    }
    complete = true;
    callback(err);
  };

  if (body) {
    request.send(body);
  } else {
    request.send();
  }
};

HttpHandler.prototype.get = function(url, headers, callback) {
  return this.ajax('GET', url, headers, null, callback);
};

HttpHandler.prototype.put = function(url, headers, body, callback) {
  return this.ajax('PUT', url, headers, body, callback);
};

module.exports = new HttpHandler();

},{}],5:[function(require,module,exports){
(function (process){

function LocalStorageObserver() {
}

function addEventListener(el, eventName, handler) {
  if (el.addEventListener) {
    el.addEventListener(eventName, handler, false);
  } else if (el.attachEvent) {
    el.attachEvent('on' + eventName, function() {
      handler.apply(el, arguments);
    });
  }
}

LocalStorageObserver.prototype.onKeyChange = function(key, handler) {
  if (!process.browser) {
    return;
  }
  addEventListener(window, 'storage', function(e) {
    if (e.key === key) {
      handler();
    }
  });
};

module.exports = new LocalStorageObserver();

}).call(this,require('_process'))
},{"_process":2}],6:[function(require,module,exports){
var microee = require('microee');
var defaultHttpHandler;
var defaultLocalStorageObserver;

function ResourceShadow(options) {
  this.data = {};
  this.localKey = options.localKey;
  this.url = options.url;
  this.options = options;
  this.localStorage = options.localStorage || localStorage;
  this.localStorageObserver = options.localStorageObserver ||
    (defaultLocalStorageObserver = defaultLocalStorageObserver || require('./local-storage-observer'));
  this.httpHandler = options.httpHandler ||
    (defaultHttpHandler = defaultHttpHandler || require('./http-handler'));
  this.load();
  if (this.localStorageObserver) {
    this.listenForStorageEvent();
  }
}

microee.mixin(ResourceShadow);

ResourceShadow.create = function resourceCreate(options) {
  return new ResourceShadow(options);
};

ResourceShadow.prototype.apply = function resourceChangeApply(changeFn) {
  this.beforeApply();
  try {
    if (typeof changeFn === 'object') {
      this.mirrorObject(changeFn, this.data);
    } else {
      changeFn.call(this, this.data);
    }
  } finally {
    this.afterApply();
    return this;
  }
};

ResourceShadow.prototype.beforeApply = function() {
  this.mirrorObject(this.getLocalStorageValue(), this.data);
};

ResourceShadow.prototype.afterApply = function() {
  this.setLocalStorageValue(this.data);
  this.save();
  // TODO: call only if there are real changes
  this.onChange();
};

ResourceShadow.prototype.save = function() {
  if (this.loading || this.saving) {
    // changes will be detected at the end of current process
    return;
  }
  this.saveRequested = false;
  if (!this.url) {
    // no remote url for this resource
    this.onSaved();
    return;
  }
  var json = this.localStorage.getItem(this.localKey);
  if (this.shadow !== json) {
    // we have changes to save
    this.saving = true;
    var self = this;
    this.httpHandler.put(this.url, this.httpHeaders(), json, function(err, serverJson) {
      self.saving = false;
      if (err) {
        self.onSaveError(err);
        return;
      }
      self.onSaved();
      self.processJsonFromServer(serverJson, json);
    });
  } else {
    this.onSaved();
  }
};

ResourceShadow.prototype.loadAndRebase = function() {
  // load from server, and consider all local data as most recent
  // note: this will cause a 3-way merge
  return this.load({});
};

ResourceShadow.prototype.loadLocal = function() {
  var currentDataJson = this.stringify(this.data);
  if (this.localStorage.getItem(this.localKey) !== currentDataJson) {
    this.mirrorObject(this.getLocalStorageValue(), this.data);
    // TODO: call only if there are real changes
    this.onChange();
  }
};

ResourceShadow.prototype.load = function(preJson) {

  this.loadLocal();

  if (this.loading || this.saving) {
    // changes will be detected at the end of current process
    return this;
  }
  if (!this.url) {
    // no remote url for this resource
    this.onLoaded();
    return this;
  }

  var json;
  if (preJson) {
    json = preJson;
    if (typeof json !== 'string') {
      json = this.stringify(json);
    }
  } else {
    json = this.localStorage.getItem(this.localKey);
  }

  this.loading = true;
  var self = this;
  this.httpHandler.get(this.url, this.httpHeaders(), function(err, serverJson) {
    self.loading = false;
    if (err) {
      err.loadArguments = [preJson];
      self.onLoadError(err);
      return;
    }
    self.processJsonFromServer(serverJson, json);
    self.onLoaded();
  });
  return this;
};

ResourceShadow.prototype.processJsonFromServer = function(serverJson, preJson) {
  this.shadow = serverJson;
  var newJson = this.localStorage.getItem(this.localKey);

  if (serverJson !== preJson) {
    // server changes
    var saveAgain = false;
    if (preJson !== newJson) {
      // conflict! both server and local changes happened
      serverJson = this.threeWayMerge(preJson, serverJson, newJson);
      if (typeof serverJson === 'object') {
        serverJson = this.stringify(serverJson);
      }
      saveAgain = serverJson !== this.shadow;
    }

    var serverData;
    try {
      serverData = this.parse(serverJson);
    } catch (err) {
      serverData = null;
    }
    if (typeof serverData === 'object') {
      this.mirrorObject(serverData, this.data);
    }

    this.setLocalStorageValue(this.data);
    // TODO: call only if there are real changes
    this.onChange();

    if (saveAgain) {
      this.save();
    }
  } else if (preJson !== newJson) {
    // only local changes, start a new save
    this.save();
  }
};

ResourceShadow.prototype.listenForStorageEvent = function() {
  if (this.listeningForStorageEvent || !this.localStorageObserver) {
    return;
  }
  var self = this;
  this.localStorageObserver.onKeyChange(this.localKey, function(){
    if (this.settingLocalStorage) {
      return;
    }
    self.loadLocal();
  });
  this.listeningForStorageEvent = true;
};

ResourceShadow.prototype.mirrorObject = function(source, target) {
  var self = this;
  if (typeof source !== 'object' || typeof target !== 'object') {
    return;
  }

  function copyMember(source, target, key) {
    var sourceValue = source[key];
    var targetValue = target[key];
    if (typeof targetValue !== 'undefined' &&
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      (sourceValue instanceof Array) === (targetValue instanceof Array)) {
      self.mirrorObject(sourceValue, targetValue);
      return;
    }
    target[key] = sourceValue;
  }

  if (source instanceof Array && target instanceof Array) {
    var sourceLength = source.length;
    for (var i = 0; i < sourceLength; i++) {
      copyMember(source, target, i);
    }
    target.length = source.length;
    return;
  }

  for (var name in source) {
    copyMember(source, target, name);
  }
  for (name in target) {
    if (typeof source[name] === 'undefined') {
      delete target[name];
    }
  }
};

ResourceShadow.prototype.threeWayMerge = function(original, server, local) {
  if (this.options.threeWayMerge) {
    return this.options.threeWayMerge.call(this, original, server, local);
  }
  // by default, local always wins
  return local;
};

ResourceShadow.prototype.parse = function(json) {
  return JSON.parse(json);
};

ResourceShadow.prototype.stringify = function(data) {
  return JSON.stringify(data);
};

ResourceShadow.prototype.httpHeaders = function() {
  return this.options.headers;
};

ResourceShadow.prototype.onChange = function() {
  this.emit('change', this.data);
};

ResourceShadow.prototype.onSaved = function() {
  this.emit('saved');
};

ResourceShadow.prototype.onLoaded = function() {
  this.emit('loaded');
};

ResourceShadow.prototype.shouldRetry = function(err) {
  if (this.options.retry === false) {
    return false;
  }
  if (err.status &&
    [
      // statuses that might represent temporal failures
      408, 409, 410, 419, 420, 429, 500, 502,
      503, 504, 509, 521, 522, 524, 598, 599
      ].indexOf(err.status) < 0) {
    return false;
  }
  return true;
};

ResourceShadow.prototype.onSaveError = function(err) {
  var self = this;
  if (this.shouldRetry(err)) {
    setTimeout(function() {
      self.save();
    }, this.options.retryDelay || 5000);
  }
  this.emit('saveerror', err);
};

ResourceShadow.prototype.onLoadError = function(err) {
  var self = this;
  if (this.shouldRetry(err)) {
    setTimeout(function() {
      self.load.apply(self, err.loadArguments);
    }, this.options.retryDelay || 5000);
  }
  this.emit('loaderror', err);
};

ResourceShadow.prototype.setUrl = function(url, headers) {
  this.url = url;
  if (headers) {
    this.options.headers = headers;
  }
  return this;
};

ResourceShadow.prototype.getLocalStorageValue = function() {
  var json = this.localStorage.getItem(this.localKey);
  if (json === null || typeof json === 'undefined' || json === '') {
    return {};
  }
  try {
    return this.parse(json) || {};
  } catch (err) {
    return {};
  }
};

ResourceShadow.prototype.setLocalStorageValue = function(data) {
  var json;
  if (data === null || typeof data === 'undefined') {
    json = null;
  } else {
    try {
      json = this.stringify(data);
    } catch (err) {
      json = null;
    }
  }
  var previousJson = this.localStorage.getItem(this.localKey);
  this.settingLocalStorage = true;
  try {
    if (previousJson !== json) {
      if (json === null) {
        this.localStorage.removeItem(this.localKey);
      } else {
        this.localStorage.setItem(this.localKey, json);
      }
    }
  } finally {
    this.settingLocalStorage = false;
  }

  return json;
};

module.exports = ResourceShadow;

},{"./http-handler":4,"./local-storage-observer":5,"microee":3}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbWFpbi5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9ub2RlX21vZHVsZXMvbWljcm9lZS9pbmRleC5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9odHRwLWhhbmRsZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbG9jYWwtc3RvcmFnZS1vYnNlcnZlci5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9yZXNvdXJjZS1zaGFkb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG5cbi8vIGdsb2JhbCBleHBvcnRzXG5cbnZhciBSZXNvdXJjZVNoYWRvdyA9IHJlcXVpcmUoJy4vcmVzb3VyY2Utc2hhZG93Jyk7XG5leHBvcnRzLlJlc291cmNlU2hhZG93ID0gUmVzb3VyY2VTaGFkb3c7XG5leHBvcnRzLmNyZWF0ZSA9IFJlc291cmNlU2hhZG93LmNyZWF0ZTtcblxuaWYgKHByb2Nlc3MuYnJvd3Nlcikge1xuICAvLyBleHBvcnRzIG9ubHkgZm9yIGJyb3dzZXIgYnVuZGxlXG4gIGV4cG9ydHMudmVyc2lvbiA9ICd7e3BhY2thZ2UtdmVyc2lvbn19JztcbiAgZXhwb3J0cy5ob21lcGFnZSA9ICd7e3BhY2thZ2UtaG9tZXBhZ2V9fSc7XG59IGVsc2Uge1xuICAvLyBleHBvcnRzIG9ubHkgZm9yIG5vZGUuanNcbiAgdmFyIHBhY2thZ2VJbmZvID0gcmVxdWlyZSgnLi4vcGFjaycgKyAnYWdlLmpzb24nKTtcbiAgZXhwb3J0cy52ZXJzaW9uID0gcGFja2FnZUluZm8udmVyc2lvbjtcbiAgZXhwb3J0cy5ob21lcGFnZSA9IHBhY2thZ2VJbmZvLmhvbWVwYWdlO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsImZ1bmN0aW9uIE0oKSB7IHRoaXMuX2V2ZW50cyA9IHt9OyB9XG5NLnByb3RvdHlwZSA9IHtcbiAgb246IGZ1bmN0aW9uKGV2LCBjYikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgIHZhciBlID0gdGhpcy5fZXZlbnRzO1xuICAgIChlW2V2XSB8fCAoZVtldl0gPSBbXSkpLnB1c2goY2IpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmVMaXN0ZW5lcjogZnVuY3Rpb24oZXYsIGNiKSB7XG4gICAgdmFyIGUgPSB0aGlzLl9ldmVudHNbZXZdIHx8IFtdLCBpO1xuICAgIGZvcihpID0gZS5sZW5ndGgtMTsgaSA+PSAwICYmIGVbaV07IGktLSl7XG4gICAgICBpZihlW2ldID09PSBjYiB8fCBlW2ldLmNiID09PSBjYikgeyBlLnNwbGljZShpLCAxKTsgfVxuICAgIH1cbiAgfSxcbiAgcmVtb3ZlQWxsTGlzdGVuZXJzOiBmdW5jdGlvbihldikge1xuICAgIGlmKCFldikgeyB0aGlzLl9ldmVudHMgPSB7fTsgfVxuICAgIGVsc2UgeyB0aGlzLl9ldmVudHNbZXZdICYmICh0aGlzLl9ldmVudHNbZXZdID0gW10pOyB9XG4gIH0sXG4gIGVtaXQ6IGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBpLCBlID0gdGhpcy5fZXZlbnRzW2V2XSB8fCBbXTtcbiAgICBmb3IoaSA9IGUubGVuZ3RoLTE7IGkgPj0gMCAmJiBlW2ldOyBpLS0pe1xuICAgICAgZVtpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHdoZW46IGZ1bmN0aW9uKGV2LCBjYikge1xuICAgIHJldHVybiB0aGlzLm9uY2UoZXYsIGNiLCB0cnVlKTtcbiAgfSxcbiAgb25jZTogZnVuY3Rpb24oZXYsIGNiLCB3aGVuKSB7XG4gICAgaWYoIWNiKSByZXR1cm4gdGhpcztcbiAgICBmdW5jdGlvbiBjKCkge1xuICAgICAgaWYoIXdoZW4pIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXYsIGMpO1xuICAgICAgaWYoY2IuYXBwbHkodGhpcywgYXJndW1lbnRzKSAmJiB3aGVuKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2LCBjKTtcbiAgICB9XG4gICAgYy5jYiA9IGNiO1xuICAgIHRoaXMub24oZXYsIGMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuTS5taXhpbiA9IGZ1bmN0aW9uKGRlc3QpIHtcbiAgdmFyIG8gPSBNLnByb3RvdHlwZSwgaztcbiAgZm9yIChrIGluIG8pIHtcbiAgICBvLmhhc093blByb3BlcnR5KGspICYmIChkZXN0LnByb3RvdHlwZVtrXSA9IG9ba10pO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBNO1xuIiwiXG5mdW5jdGlvbiBIdHRwSGFuZGxlcigpIHtcbn1cblxuSHR0cEhhbmRsZXIucHJvdG90eXBlLmFqYXggPSBmdW5jdGlvbihtZXRob2QsIHVybCwgaGVhZGVycywgYm9keSwgY2FsbGJhY2spIHtcblxuICAvLyBzaW1wbGUgYnJvd3NlciBpbXBsZW1lbnRhdGlvblxuICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICByZXF1ZXN0Lm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuICBpZiAoYm9keSkge1xuICAgIHJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgfVxuICBpZiAoaGVhZGVycykge1xuICAgIGZvciAodmFyIGhlYWRlciBpbiBoZWFkZXJzKSB7XG4gICAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyLCBoZWFkZXJzW2hlYWRlcl0pO1xuICAgIH1cbiAgfVxuXG4gIHZhciBkYXRhO1xuICB2YXIgY29tcGxldGUgPSBmYWxzZTtcbiAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoY29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29tcGxldGUgPSB0cnVlO1xuICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA+PSAyMDAgJiYgcmVxdWVzdC5zdGF0dXMgPCA0MDApIHtcbiAgICAgIC8vIFN1Y2Nlc3MhXG4gICAgICBkYXRhID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XG4gICAgICBjYWxsYmFjayhudWxsLCBkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2UgcmVhY2hlZCBvdXIgdGFyZ2V0IHNlcnZlciwgYnV0IGl0IHJldHVybmVkIGFuIGVycm9yXG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdodHRwIGVycm9yICcgKyByZXF1ZXN0LnN0YXR1cyk7XG4gICAgICBlcnIuc3RhdHVzID0gcmVxdWVzdC5zdGF0dXM7XG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgIH1cbiAgfTtcblxuICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAvLyBUaGVyZSB3YXMgYSBjb25uZWN0aW9uIGVycm9yIG9mIHNvbWUgc29ydFxuICAgIGlmIChjb21wbGV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb21wbGV0ZSA9IHRydWU7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgfTtcblxuICBpZiAoYm9keSkge1xuICAgIHJlcXVlc3Quc2VuZChib2R5KTtcbiAgfSBlbHNlIHtcbiAgICByZXF1ZXN0LnNlbmQoKTtcbiAgfVxufTtcblxuSHR0cEhhbmRsZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHVybCwgaGVhZGVycywgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuYWpheCgnR0VUJywgdXJsLCBoZWFkZXJzLCBudWxsLCBjYWxsYmFjayk7XG59O1xuXG5IdHRwSGFuZGxlci5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24odXJsLCBoZWFkZXJzLCBib2R5LCBjYWxsYmFjaykge1xuICByZXR1cm4gdGhpcy5hamF4KCdQVVQnLCB1cmwsIGhlYWRlcnMsIGJvZHksIGNhbGxiYWNrKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEh0dHBIYW5kbGVyKCk7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuXG5mdW5jdGlvbiBMb2NhbFN0b3JhZ2VPYnNlcnZlcigpIHtcbn1cblxuZnVuY3Rpb24gYWRkRXZlbnRMaXN0ZW5lcihlbCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gIGlmIChlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGhhbmRsZXIsIGZhbHNlKTtcbiAgfSBlbHNlIGlmIChlbC5hdHRhY2hFdmVudCkge1xuICAgIGVsLmF0dGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGZ1bmN0aW9uKCkge1xuICAgICAgaGFuZGxlci5hcHBseShlbCwgYXJndW1lbnRzKTtcbiAgICB9KTtcbiAgfVxufVxuXG5Mb2NhbFN0b3JhZ2VPYnNlcnZlci5wcm90b3R5cGUub25LZXlDaGFuZ2UgPSBmdW5jdGlvbihrZXksIGhhbmRsZXIpIHtcbiAgaWYgKCFwcm9jZXNzLmJyb3dzZXIpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih3aW5kb3csICdzdG9yYWdlJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleSA9PT0ga2V5KSB7XG4gICAgICBoYW5kbGVyKCk7XG4gICAgfVxuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IExvY2FsU3RvcmFnZU9ic2VydmVyKCk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsInZhciBtaWNyb2VlID0gcmVxdWlyZSgnbWljcm9lZScpO1xudmFyIGRlZmF1bHRIdHRwSGFuZGxlcjtcbnZhciBkZWZhdWx0TG9jYWxTdG9yYWdlT2JzZXJ2ZXI7XG5cbmZ1bmN0aW9uIFJlc291cmNlU2hhZG93KG9wdGlvbnMpIHtcbiAgdGhpcy5kYXRhID0ge307XG4gIHRoaXMubG9jYWxLZXkgPSBvcHRpb25zLmxvY2FsS2V5O1xuICB0aGlzLnVybCA9IG9wdGlvbnMudXJsO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB0aGlzLmxvY2FsU3RvcmFnZSA9IG9wdGlvbnMubG9jYWxTdG9yYWdlIHx8IGxvY2FsU3RvcmFnZTtcbiAgdGhpcy5sb2NhbFN0b3JhZ2VPYnNlcnZlciA9IG9wdGlvbnMubG9jYWxTdG9yYWdlT2JzZXJ2ZXIgfHxcbiAgICAoZGVmYXVsdExvY2FsU3RvcmFnZU9ic2VydmVyID0gZGVmYXVsdExvY2FsU3RvcmFnZU9ic2VydmVyIHx8IHJlcXVpcmUoJy4vbG9jYWwtc3RvcmFnZS1vYnNlcnZlcicpKTtcbiAgdGhpcy5odHRwSGFuZGxlciA9IG9wdGlvbnMuaHR0cEhhbmRsZXIgfHxcbiAgICAoZGVmYXVsdEh0dHBIYW5kbGVyID0gZGVmYXVsdEh0dHBIYW5kbGVyIHx8IHJlcXVpcmUoJy4vaHR0cC1oYW5kbGVyJykpO1xuICB0aGlzLmxvYWQoKTtcbiAgaWYgKHRoaXMubG9jYWxTdG9yYWdlT2JzZXJ2ZXIpIHtcbiAgICB0aGlzLmxpc3RlbkZvclN0b3JhZ2VFdmVudCgpO1xuICB9XG59XG5cbm1pY3JvZWUubWl4aW4oUmVzb3VyY2VTaGFkb3cpO1xuXG5SZXNvdXJjZVNoYWRvdy5jcmVhdGUgPSBmdW5jdGlvbiByZXNvdXJjZUNyZWF0ZShvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgUmVzb3VyY2VTaGFkb3cob3B0aW9ucyk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbiByZXNvdXJjZUNoYW5nZUFwcGx5KGNoYW5nZUZuKSB7XG4gIHRoaXMuYmVmb3JlQXBwbHkoKTtcbiAgdHJ5IHtcbiAgICBpZiAodHlwZW9mIGNoYW5nZUZuID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5taXJyb3JPYmplY3QoY2hhbmdlRm4sIHRoaXMuZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoYW5nZUZuLmNhbGwodGhpcywgdGhpcy5kYXRhKTtcbiAgICB9XG4gIH0gZmluYWxseSB7XG4gICAgdGhpcy5hZnRlckFwcGx5KCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5iZWZvcmVBcHBseSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm1pcnJvck9iamVjdCh0aGlzLmdldExvY2FsU3RvcmFnZVZhbHVlKCksIHRoaXMuZGF0YSk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuYWZ0ZXJBcHBseSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnNldExvY2FsU3RvcmFnZVZhbHVlKHRoaXMuZGF0YSk7XG4gIHRoaXMuc2F2ZSgpO1xuICAvLyBUT0RPOiBjYWxsIG9ubHkgaWYgdGhlcmUgYXJlIHJlYWwgY2hhbmdlc1xuICB0aGlzLm9uQ2hhbmdlKCk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5sb2FkaW5nIHx8IHRoaXMuc2F2aW5nKSB7XG4gICAgLy8gY2hhbmdlcyB3aWxsIGJlIGRldGVjdGVkIGF0IHRoZSBlbmQgb2YgY3VycmVudCBwcm9jZXNzXG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuc2F2ZVJlcXVlc3RlZCA9IGZhbHNlO1xuICBpZiAoIXRoaXMudXJsKSB7XG4gICAgLy8gbm8gcmVtb3RlIHVybCBmb3IgdGhpcyByZXNvdXJjZVxuICAgIHRoaXMub25TYXZlZCgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIganNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIGlmICh0aGlzLnNoYWRvdyAhPT0ganNvbikge1xuICAgIC8vIHdlIGhhdmUgY2hhbmdlcyB0byBzYXZlXG4gICAgdGhpcy5zYXZpbmcgPSB0cnVlO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmh0dHBIYW5kbGVyLnB1dCh0aGlzLnVybCwgdGhpcy5odHRwSGVhZGVycygpLCBqc29uLCBmdW5jdGlvbihlcnIsIHNlcnZlckpzb24pIHtcbiAgICAgIHNlbGYuc2F2aW5nID0gZmFsc2U7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHNlbGYub25TYXZlRXJyb3IoZXJyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VsZi5vblNhdmVkKCk7XG4gICAgICBzZWxmLnByb2Nlc3NKc29uRnJvbVNlcnZlcihzZXJ2ZXJKc29uLCBqc29uKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm9uU2F2ZWQoKTtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxvYWRBbmRSZWJhc2UgPSBmdW5jdGlvbigpIHtcbiAgLy8gbG9hZCBmcm9tIHNlcnZlciwgYW5kIGNvbnNpZGVyIGFsbCBsb2NhbCBkYXRhIGFzIG1vc3QgcmVjZW50XG4gIC8vIG5vdGU6IHRoaXMgd2lsbCBjYXVzZSBhIDMtd2F5IG1lcmdlXG4gIHJldHVybiB0aGlzLmxvYWQoe30pO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxvYWRMb2NhbCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY3VycmVudERhdGFKc29uID0gdGhpcy5zdHJpbmdpZnkodGhpcy5kYXRhKTtcbiAgaWYgKHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSkgIT09IGN1cnJlbnREYXRhSnNvbikge1xuICAgIHRoaXMubWlycm9yT2JqZWN0KHRoaXMuZ2V0TG9jYWxTdG9yYWdlVmFsdWUoKSwgdGhpcy5kYXRhKTtcbiAgICAvLyBUT0RPOiBjYWxsIG9ubHkgaWYgdGhlcmUgYXJlIHJlYWwgY2hhbmdlc1xuICAgIHRoaXMub25DaGFuZ2UoKTtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihwcmVKc29uKSB7XG5cbiAgdGhpcy5sb2FkTG9jYWwoKTtcblxuICBpZiAodGhpcy5sb2FkaW5nIHx8IHRoaXMuc2F2aW5nKSB7XG4gICAgLy8gY2hhbmdlcyB3aWxsIGJlIGRldGVjdGVkIGF0IHRoZSBlbmQgb2YgY3VycmVudCBwcm9jZXNzXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgaWYgKCF0aGlzLnVybCkge1xuICAgIC8vIG5vIHJlbW90ZSB1cmwgZm9yIHRoaXMgcmVzb3VyY2VcbiAgICB0aGlzLm9uTG9hZGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIganNvbjtcbiAgaWYgKHByZUpzb24pIHtcbiAgICBqc29uID0gcHJlSnNvbjtcbiAgICBpZiAodHlwZW9mIGpzb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICBqc29uID0gdGhpcy5zdHJpbmdpZnkoanNvbik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGpzb24gPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpO1xuICB9XG5cbiAgdGhpcy5sb2FkaW5nID0gdHJ1ZTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmh0dHBIYW5kbGVyLmdldCh0aGlzLnVybCwgdGhpcy5odHRwSGVhZGVycygpLCBmdW5jdGlvbihlcnIsIHNlcnZlckpzb24pIHtcbiAgICBzZWxmLmxvYWRpbmcgPSBmYWxzZTtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBlcnIubG9hZEFyZ3VtZW50cyA9IFtwcmVKc29uXTtcbiAgICAgIHNlbGYub25Mb2FkRXJyb3IoZXJyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5wcm9jZXNzSnNvbkZyb21TZXJ2ZXIoc2VydmVySnNvbiwganNvbik7XG4gICAgc2VsZi5vbkxvYWRlZCgpO1xuICB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUucHJvY2Vzc0pzb25Gcm9tU2VydmVyID0gZnVuY3Rpb24oc2VydmVySnNvbiwgcHJlSnNvbikge1xuICB0aGlzLnNoYWRvdyA9IHNlcnZlckpzb247XG4gIHZhciBuZXdKc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcblxuICBpZiAoc2VydmVySnNvbiAhPT0gcHJlSnNvbikge1xuICAgIC8vIHNlcnZlciBjaGFuZ2VzXG4gICAgdmFyIHNhdmVBZ2FpbiA9IGZhbHNlO1xuICAgIGlmIChwcmVKc29uICE9PSBuZXdKc29uKSB7XG4gICAgICAvLyBjb25mbGljdCEgYm90aCBzZXJ2ZXIgYW5kIGxvY2FsIGNoYW5nZXMgaGFwcGVuZWRcbiAgICAgIHNlcnZlckpzb24gPSB0aGlzLnRocmVlV2F5TWVyZ2UocHJlSnNvbiwgc2VydmVySnNvbiwgbmV3SnNvbik7XG4gICAgICBpZiAodHlwZW9mIHNlcnZlckpzb24gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHNlcnZlckpzb24gPSB0aGlzLnN0cmluZ2lmeShzZXJ2ZXJKc29uKTtcbiAgICAgIH1cbiAgICAgIHNhdmVBZ2FpbiA9IHNlcnZlckpzb24gIT09IHRoaXMuc2hhZG93O1xuICAgIH1cblxuICAgIHZhciBzZXJ2ZXJEYXRhO1xuICAgIHRyeSB7XG4gICAgICBzZXJ2ZXJEYXRhID0gdGhpcy5wYXJzZShzZXJ2ZXJKc29uKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHNlcnZlckRhdGEgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHNlcnZlckRhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLm1pcnJvck9iamVjdChzZXJ2ZXJEYXRhLCB0aGlzLmRhdGEpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlVmFsdWUodGhpcy5kYXRhKTtcbiAgICAvLyBUT0RPOiBjYWxsIG9ubHkgaWYgdGhlcmUgYXJlIHJlYWwgY2hhbmdlc1xuICAgIHRoaXMub25DaGFuZ2UoKTtcblxuICAgIGlmIChzYXZlQWdhaW4pIHtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwcmVKc29uICE9PSBuZXdKc29uKSB7XG4gICAgLy8gb25seSBsb2NhbCBjaGFuZ2VzLCBzdGFydCBhIG5ldyBzYXZlXG4gICAgdGhpcy5zYXZlKCk7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5saXN0ZW5Gb3JTdG9yYWdlRXZlbnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMubGlzdGVuaW5nRm9yU3RvcmFnZUV2ZW50IHx8ICF0aGlzLmxvY2FsU3RvcmFnZU9ic2VydmVyKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5sb2NhbFN0b3JhZ2VPYnNlcnZlci5vbktleUNoYW5nZSh0aGlzLmxvY2FsS2V5LCBmdW5jdGlvbigpe1xuICAgIGlmICh0aGlzLnNldHRpbmdMb2NhbFN0b3JhZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5sb2FkTG9jYWwoKTtcbiAgfSk7XG4gIHRoaXMubGlzdGVuaW5nRm9yU3RvcmFnZUV2ZW50ID0gdHJ1ZTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5taXJyb3JPYmplY3QgPSBmdW5jdGlvbihzb3VyY2UsIHRhcmdldCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2Ygc291cmNlICE9PSAnb2JqZWN0JyB8fCB0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvcHlNZW1iZXIoc291cmNlLCB0YXJnZXQsIGtleSkge1xuICAgIHZhciBzb3VyY2VWYWx1ZSA9IHNvdXJjZVtrZXldO1xuICAgIHZhciB0YXJnZXRWYWx1ZSA9IHRhcmdldFtrZXldO1xuICAgIGlmICh0eXBlb2YgdGFyZ2V0VmFsdWUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2Ygc291cmNlVmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2YgdGFyZ2V0VmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICAoc291cmNlVmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgPT09ICh0YXJnZXRWYWx1ZSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgc2VsZi5taXJyb3JPYmplY3Qoc291cmNlVmFsdWUsIHRhcmdldFZhbHVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGFyZ2V0W2tleV0gPSBzb3VyY2VWYWx1ZTtcbiAgfVxuXG4gIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheSAmJiB0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIHZhciBzb3VyY2VMZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlTGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvcHlNZW1iZXIoc291cmNlLCB0YXJnZXQsIGkpO1xuICAgIH1cbiAgICB0YXJnZXQubGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICByZXR1cm47XG4gIH1cblxuICBmb3IgKHZhciBuYW1lIGluIHNvdXJjZSkge1xuICAgIGNvcHlNZW1iZXIoc291cmNlLCB0YXJnZXQsIG5hbWUpO1xuICB9XG4gIGZvciAobmFtZSBpbiB0YXJnZXQpIHtcbiAgICBpZiAodHlwZW9mIHNvdXJjZVtuYW1lXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRlbGV0ZSB0YXJnZXRbbmFtZV07XG4gICAgfVxuICB9XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUudGhyZWVXYXlNZXJnZSA9IGZ1bmN0aW9uKG9yaWdpbmFsLCBzZXJ2ZXIsIGxvY2FsKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMudGhyZWVXYXlNZXJnZSkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMudGhyZWVXYXlNZXJnZS5jYWxsKHRoaXMsIG9yaWdpbmFsLCBzZXJ2ZXIsIGxvY2FsKTtcbiAgfVxuICAvLyBieSBkZWZhdWx0LCBsb2NhbCBhbHdheXMgd2luc1xuICByZXR1cm4gbG9jYWw7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihqc29uKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKGpzb24pO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnN0cmluZ2lmeSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmh0dHBIZWFkZXJzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm9wdGlvbnMuaGVhZGVycztcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vbkNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2NoYW5nZScsIHRoaXMuZGF0YSk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25TYXZlZCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ3NhdmVkJyk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25Mb2FkZWQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbWl0KCdsb2FkZWQnKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5zaG91bGRSZXRyeSA9IGZ1bmN0aW9uKGVycikge1xuICBpZiAodGhpcy5vcHRpb25zLnJldHJ5ID09PSBmYWxzZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoZXJyLnN0YXR1cyAmJlxuICAgIFtcbiAgICAgIC8vIHN0YXR1c2VzIHRoYXQgbWlnaHQgcmVwcmVzZW50IHRlbXBvcmFsIGZhaWx1cmVzXG4gICAgICA0MDgsIDQwOSwgNDEwLCA0MTksIDQyMCwgNDI5LCA1MDAsIDUwMixcbiAgICAgIDUwMywgNTA0LCA1MDksIDUyMSwgNTIyLCA1MjQsIDU5OCwgNTk5XG4gICAgICBdLmluZGV4T2YoZXJyLnN0YXR1cykgPCAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm9uU2F2ZUVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHRoaXMuc2hvdWxkUmV0cnkoZXJyKSkge1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLnNhdmUoKTtcbiAgICB9LCB0aGlzLm9wdGlvbnMucmV0cnlEZWxheSB8fCA1MDAwKTtcbiAgfVxuICB0aGlzLmVtaXQoJ3NhdmVlcnJvcicsIGVycik7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25Mb2FkRXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodGhpcy5zaG91bGRSZXRyeShlcnIpKSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYubG9hZC5hcHBseShzZWxmLCBlcnIubG9hZEFyZ3VtZW50cyk7XG4gICAgfSwgdGhpcy5vcHRpb25zLnJldHJ5RGVsYXkgfHwgNTAwMCk7XG4gIH1cbiAgdGhpcy5lbWl0KCdsb2FkZXJyb3InLCBlcnIpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnNldFVybCA9IGZ1bmN0aW9uKHVybCwgaGVhZGVycykge1xuICB0aGlzLnVybCA9IHVybDtcbiAgaWYgKGhlYWRlcnMpIHtcbiAgICB0aGlzLm9wdGlvbnMuaGVhZGVycyA9IGhlYWRlcnM7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuZ2V0TG9jYWxTdG9yYWdlVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGpzb24gPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpO1xuICBpZiAoanNvbiA9PT0gbnVsbCB8fCB0eXBlb2YganNvbiA9PT0gJ3VuZGVmaW5lZCcgfHwganNvbiA9PT0gJycpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbiAgdHJ5IHtcbiAgICByZXR1cm4gdGhpcy5wYXJzZShqc29uKSB8fCB7fTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc2V0TG9jYWxTdG9yYWdlVmFsdWUgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHZhciBqc29uO1xuICBpZiAoZGF0YSA9PT0gbnVsbCB8fCB0eXBlb2YgZGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBqc29uID0gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAganNvbiA9IHRoaXMuc3RyaW5naWZ5KGRhdGEpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAganNvbiA9IG51bGw7XG4gICAgfVxuICB9XG4gIHZhciBwcmV2aW91c0pzb24gPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpO1xuICB0aGlzLnNldHRpbmdMb2NhbFN0b3JhZ2UgPSB0cnVlO1xuICB0cnkge1xuICAgIGlmIChwcmV2aW91c0pzb24gIT09IGpzb24pIHtcbiAgICAgIGlmIChqc29uID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGhpcy5sb2NhbEtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvY2FsU3RvcmFnZS5zZXRJdGVtKHRoaXMubG9jYWxLZXksIGpzb24pO1xuICAgICAgfVxuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICB0aGlzLnNldHRpbmdMb2NhbFN0b3JhZ2UgPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBqc29uO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXNvdXJjZVNoYWRvdztcbiJdfQ==
