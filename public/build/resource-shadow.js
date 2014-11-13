!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.resourceShadow=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){

// global exports

var ResourceShadow = require('./resource-shadow');
exports.ResourceShadow = ResourceShadow;
exports.create = ResourceShadow.create;

if (process.browser) {
  // exports only for browser bundle
  exports.version = '0.0.4';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbWFpbi5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9ub2RlX21vZHVsZXMvbWljcm9lZS9pbmRleC5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9odHRwLWhhbmRsZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbG9jYWwtc3RvcmFnZS1vYnNlcnZlci5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9yZXNvdXJjZS1zaGFkb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG5cbi8vIGdsb2JhbCBleHBvcnRzXG5cbnZhciBSZXNvdXJjZVNoYWRvdyA9IHJlcXVpcmUoJy4vcmVzb3VyY2Utc2hhZG93Jyk7XG5leHBvcnRzLlJlc291cmNlU2hhZG93ID0gUmVzb3VyY2VTaGFkb3c7XG5leHBvcnRzLmNyZWF0ZSA9IFJlc291cmNlU2hhZG93LmNyZWF0ZTtcblxuaWYgKHByb2Nlc3MuYnJvd3Nlcikge1xuICAvLyBleHBvcnRzIG9ubHkgZm9yIGJyb3dzZXIgYnVuZGxlXG4gIGV4cG9ydHMudmVyc2lvbiA9ICd7e3BhY2thZ2UtdmVyc2lvbn19JztcbiAgZXhwb3J0cy5ob21lcGFnZSA9ICd7e3BhY2thZ2UtaG9tZXBhZ2V9fSc7XG59IGVsc2Uge1xuICAvLyBleHBvcnRzIG9ubHkgZm9yIG5vZGUuanNcbiAgdmFyIHBhY2thZ2VJbmZvID0gcmVxdWlyZSgnLi4vcGFjaycgKyAnYWdlLmpzb24nKTtcbiAgZXhwb3J0cy52ZXJzaW9uID0gcGFja2FnZUluZm8udmVyc2lvbjtcbiAgZXhwb3J0cy5ob21lcGFnZSA9IHBhY2thZ2VJbmZvLmhvbWVwYWdlO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsImZ1bmN0aW9uIE0oKSB7IHRoaXMuX2V2ZW50cyA9IHt9OyB9XG5NLnByb3RvdHlwZSA9IHtcbiAgb246IGZ1bmN0aW9uKGV2LCBjYikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgIHZhciBlID0gdGhpcy5fZXZlbnRzO1xuICAgIChlW2V2XSB8fCAoZVtldl0gPSBbXSkpLnB1c2goY2IpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmVMaXN0ZW5lcjogZnVuY3Rpb24oZXYsIGNiKSB7XG4gICAgdmFyIGUgPSB0aGlzLl9ldmVudHNbZXZdIHx8IFtdLCBpO1xuICAgIGZvcihpID0gZS5sZW5ndGgtMTsgaSA+PSAwICYmIGVbaV07IGktLSl7XG4gICAgICBpZihlW2ldID09PSBjYiB8fCBlW2ldLmNiID09PSBjYikgeyBlLnNwbGljZShpLCAxKTsgfVxuICAgIH1cbiAgfSxcbiAgcmVtb3ZlQWxsTGlzdGVuZXJzOiBmdW5jdGlvbihldikge1xuICAgIGlmKCFldikgeyB0aGlzLl9ldmVudHMgPSB7fTsgfVxuICAgIGVsc2UgeyB0aGlzLl9ldmVudHNbZXZdICYmICh0aGlzLl9ldmVudHNbZXZdID0gW10pOyB9XG4gIH0sXG4gIGVtaXQ6IGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBpLCBlID0gdGhpcy5fZXZlbnRzW2V2XSB8fCBbXTtcbiAgICBmb3IoaSA9IGUubGVuZ3RoLTE7IGkgPj0gMCAmJiBlW2ldOyBpLS0pe1xuICAgICAgZVtpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHdoZW46IGZ1bmN0aW9uKGV2LCBjYikge1xuICAgIHJldHVybiB0aGlzLm9uY2UoZXYsIGNiLCB0cnVlKTtcbiAgfSxcbiAgb25jZTogZnVuY3Rpb24oZXYsIGNiLCB3aGVuKSB7XG4gICAgaWYoIWNiKSByZXR1cm4gdGhpcztcbiAgICBmdW5jdGlvbiBjKCkge1xuICAgICAgaWYoIXdoZW4pIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXYsIGMpO1xuICAgICAgaWYoY2IuYXBwbHkodGhpcywgYXJndW1lbnRzKSAmJiB3aGVuKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2LCBjKTtcbiAgICB9XG4gICAgYy5jYiA9IGNiO1xuICAgIHRoaXMub24oZXYsIGMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuTS5taXhpbiA9IGZ1bmN0aW9uKGRlc3QpIHtcbiAgdmFyIG8gPSBNLnByb3RvdHlwZSwgaztcbiAgZm9yIChrIGluIG8pIHtcbiAgICBvLmhhc093blByb3BlcnR5KGspICYmIChkZXN0LnByb3RvdHlwZVtrXSA9IG9ba10pO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBNO1xuIiwiXG5mdW5jdGlvbiBIdHRwSGFuZGxlcigpIHtcbn1cblxuSHR0cEhhbmRsZXIucHJvdG90eXBlLmFqYXggPSBmdW5jdGlvbihtZXRob2QsIHVybCwgaGVhZGVycywgYm9keSwgY2FsbGJhY2spIHtcblxuICAvLyBzaW1wbGUgYnJvd3NlciBpbXBsZW1lbnRhdGlvblxuICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICByZXF1ZXN0Lm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuICBpZiAoYm9keSkge1xuICAgIHJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgfVxuICBpZiAoaGVhZGVycykge1xuICAgIGZvciAodmFyIGhlYWRlciBpbiBoZWFkZXJzKSB7XG4gICAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyLCBoZWFkZXJzW2hlYWRlcl0pO1xuICAgIH1cbiAgfVxuXG4gIHZhciBkYXRhO1xuICB2YXIgY29tcGxldGUgPSBmYWxzZTtcbiAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoY29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29tcGxldGUgPSB0cnVlO1xuICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA+PSAyMDAgJiYgcmVxdWVzdC5zdGF0dXMgPCA0MDApIHtcbiAgICAgIC8vIFN1Y2Nlc3MhXG4gICAgICBkYXRhID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XG4gICAgICBjYWxsYmFjayhudWxsLCBkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2UgcmVhY2hlZCBvdXIgdGFyZ2V0IHNlcnZlciwgYnV0IGl0IHJldHVybmVkIGFuIGVycm9yXG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdodHRwIGVycm9yICcgKyByZXF1ZXN0LnN0YXR1cyk7XG4gICAgICBlcnIuc3RhdHVzID0gcmVxdWVzdC5zdGF0dXM7XG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgIH1cbiAgfTtcblxuICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAvLyBUaGVyZSB3YXMgYSBjb25uZWN0aW9uIGVycm9yIG9mIHNvbWUgc29ydFxuICAgIGlmIChjb21wbGV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb21wbGV0ZSA9IHRydWU7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgfTtcblxuICBpZiAoYm9keSkge1xuICAgIHJlcXVlc3Quc2VuZChib2R5KTtcbiAgfSBlbHNlIHtcbiAgICByZXF1ZXN0LnNlbmQoKTtcbiAgfVxufTtcblxuSHR0cEhhbmRsZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHVybCwgaGVhZGVycywgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuYWpheCgnR0VUJywgdXJsLCBoZWFkZXJzLCBudWxsLCBjYWxsYmFjayk7XG59O1xuXG5IdHRwSGFuZGxlci5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24odXJsLCBoZWFkZXJzLCBib2R5LCBjYWxsYmFjaykge1xuICByZXR1cm4gdGhpcy5hamF4KCdQVVQnLCB1cmwsIGhlYWRlcnMsIGJvZHksIGNhbGxiYWNrKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEh0dHBIYW5kbGVyKCk7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuXG5mdW5jdGlvbiBMb2NhbFN0b3JhZ2VPYnNlcnZlcigpIHtcbn1cblxuZnVuY3Rpb24gYWRkRXZlbnRMaXN0ZW5lcihlbCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gIGlmIChlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGhhbmRsZXIsIGZhbHNlKTtcbiAgfSBlbHNlIGlmIChlbC5hdHRhY2hFdmVudCkge1xuICAgIGVsLmF0dGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGZ1bmN0aW9uKCkge1xuICAgICAgaGFuZGxlci5hcHBseShlbCwgYXJndW1lbnRzKTtcbiAgICB9KTtcbiAgfVxufVxuXG5Mb2NhbFN0b3JhZ2VPYnNlcnZlci5wcm90b3R5cGUub25LZXlDaGFuZ2UgPSBmdW5jdGlvbihrZXksIGhhbmRsZXIpIHtcbiAgaWYgKCFwcm9jZXNzLmJyb3dzZXIpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih3aW5kb3csICdzdG9yYWdlJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleSA9PT0ga2V5KSB7XG4gICAgICBoYW5kbGVyKCk7XG4gICAgfVxuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IExvY2FsU3RvcmFnZU9ic2VydmVyKCk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsInZhciBtaWNyb2VlID0gcmVxdWlyZSgnbWljcm9lZScpO1xudmFyIGRlZmF1bHRIdHRwSGFuZGxlcjtcbnZhciBkZWZhdWx0TG9jYWxTdG9yYWdlT2JzZXJ2ZXI7XG5cbmZ1bmN0aW9uIFJlc291cmNlU2hhZG93KG9wdGlvbnMpIHtcbiAgdGhpcy5kYXRhID0ge307XG4gIHRoaXMubG9jYWxLZXkgPSBvcHRpb25zLmxvY2FsS2V5O1xuICB0aGlzLnVybCA9IG9wdGlvbnMudXJsO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB0aGlzLmxvY2FsU3RvcmFnZSA9IG9wdGlvbnMubG9jYWxTdG9yYWdlIHx8IGxvY2FsU3RvcmFnZTtcbiAgdGhpcy5sb2NhbFN0b3JhZ2VPYnNlcnZlciA9IG9wdGlvbnMubG9jYWxTdG9yYWdlT2JzZXJ2ZXIgfHxcbiAgICAoZGVmYXVsdExvY2FsU3RvcmFnZU9ic2VydmVyID0gZGVmYXVsdExvY2FsU3RvcmFnZU9ic2VydmVyIHx8IHJlcXVpcmUoJy4vbG9jYWwtc3RvcmFnZS1vYnNlcnZlcicpKTtcbiAgdGhpcy5odHRwSGFuZGxlciA9IG9wdGlvbnMuaHR0cEhhbmRsZXIgfHxcbiAgICAoZGVmYXVsdEh0dHBIYW5kbGVyID0gZGVmYXVsdEh0dHBIYW5kbGVyIHx8IHJlcXVpcmUoJy4vaHR0cC1oYW5kbGVyJykpO1xuICB0aGlzLmxvYWQoKTtcbiAgaWYgKHRoaXMubG9jYWxTdG9yYWdlT2JzZXJ2ZXIpIHtcbiAgICB0aGlzLmxpc3RlbkZvclN0b3JhZ2VFdmVudCgpO1xuICB9XG59XG5cbm1pY3JvZWUubWl4aW4oUmVzb3VyY2VTaGFkb3cpO1xuXG5SZXNvdXJjZVNoYWRvdy5jcmVhdGUgPSBmdW5jdGlvbiByZXNvdXJjZUNyZWF0ZShvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgUmVzb3VyY2VTaGFkb3cob3B0aW9ucyk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbiByZXNvdXJjZUNoYW5nZUFwcGx5KGNoYW5nZUZuKSB7XG4gIHRoaXMuYmVmb3JlQXBwbHkoKTtcbiAgdHJ5IHtcbiAgICBpZiAodHlwZW9mIGNoYW5nZUZuID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5taXJyb3JPYmplY3QoY2hhbmdlRm4sIHRoaXMuZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoYW5nZUZuLmNhbGwodGhpcywgdGhpcy5kYXRhKTtcbiAgICB9XG4gIH0gZmluYWxseSB7XG4gICAgdGhpcy5hZnRlckFwcGx5KCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5iZWZvcmVBcHBseSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm1pcnJvck9iamVjdCh0aGlzLmdldExvY2FsU3RvcmFnZVZhbHVlKCksIHRoaXMuZGF0YSk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuYWZ0ZXJBcHBseSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnNldExvY2FsU3RvcmFnZVZhbHVlKHRoaXMuZGF0YSk7XG4gIHRoaXMuc2F2ZSgpO1xuICB0aGlzLm9uQ2hhbmdlKCk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5sb2FkaW5nIHx8IHRoaXMuc2F2aW5nKSB7XG4gICAgLy8gY2hhbmdlcyB3aWxsIGJlIGRldGVjdGVkIGF0IHRoZSBlbmQgb2YgY3VycmVudCBwcm9jZXNzXG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuc2F2ZVJlcXVlc3RlZCA9IGZhbHNlO1xuICBpZiAoIXRoaXMudXJsKSB7XG4gICAgLy8gbm8gcmVtb3RlIHVybCBmb3IgdGhpcyByZXNvdXJjZVxuICAgIHRoaXMub25TYXZlZCgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIganNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIGlmICh0aGlzLnNoYWRvdyAhPT0ganNvbikge1xuICAgIC8vIHdlIGhhdmUgY2hhbmdlcyB0byBzYXZlXG4gICAgdGhpcy5zYXZpbmcgPSB0cnVlO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmh0dHBIYW5kbGVyLnB1dCh0aGlzLnVybCwgdGhpcy5odHRwSGVhZGVycygpLCBqc29uLCBmdW5jdGlvbihlcnIsIHNlcnZlckpzb24pIHtcbiAgICAgIHNlbGYuc2F2aW5nID0gZmFsc2U7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHNlbGYub25TYXZlRXJyb3IoZXJyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VsZi5vblNhdmVkKCk7XG4gICAgICBzZWxmLnByb2Nlc3NKc29uRnJvbVNlcnZlcihzZXJ2ZXJKc29uLCBqc29uKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm9uU2F2ZWQoKTtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxvYWRBbmRSZWJhc2UgPSBmdW5jdGlvbigpIHtcbiAgLy8gbG9hZCBmcm9tIHNlcnZlciwgYW5kIGNvbnNpZGVyIGFsbCBsb2NhbCBkYXRhIGFzIG1vc3QgcmVjZW50XG4gIC8vIG5vdGU6IHRoaXMgd2lsbCBjYXVzZSBhIDMtd2F5IG1lcmdlXG4gIHJldHVybiB0aGlzLmxvYWQoe30pO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxvYWRMb2NhbCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY3VycmVudERhdGFKc29uID0gdGhpcy5zdHJpbmdpZnkodGhpcy5kYXRhKTtcbiAgaWYgKHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSkgIT09IGN1cnJlbnREYXRhSnNvbikge1xuICAgIHRoaXMubWlycm9yT2JqZWN0KHRoaXMuZ2V0TG9jYWxTdG9yYWdlVmFsdWUoKSwgdGhpcy5kYXRhKTtcbiAgICB0aGlzLm9uQ2hhbmdlKCk7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24ocHJlSnNvbikge1xuXG4gIHRoaXMubG9hZExvY2FsKCk7XG5cbiAgaWYgKHRoaXMubG9hZGluZyB8fCB0aGlzLnNhdmluZykge1xuICAgIC8vIGNoYW5nZXMgd2lsbCBiZSBkZXRlY3RlZCBhdCB0aGUgZW5kIG9mIGN1cnJlbnQgcHJvY2Vzc1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIGlmICghdGhpcy51cmwpIHtcbiAgICAvLyBubyByZW1vdGUgdXJsIGZvciB0aGlzIHJlc291cmNlXG4gICAgdGhpcy5vbkxvYWRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGpzb247XG4gIGlmIChwcmVKc29uKSB7XG4gICAganNvbiA9IHByZUpzb247XG4gICAgaWYgKHR5cGVvZiBqc29uICE9PSAnc3RyaW5nJykge1xuICAgICAganNvbiA9IHRoaXMuc3RyaW5naWZ5KGpzb24pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBqc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgfVxuXG4gIHRoaXMubG9hZGluZyA9IHRydWU7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5odHRwSGFuZGxlci5nZXQodGhpcy51cmwsIHRoaXMuaHR0cEhlYWRlcnMoKSwgZnVuY3Rpb24oZXJyLCBzZXJ2ZXJKc29uKSB7XG4gICAgc2VsZi5sb2FkaW5nID0gZmFsc2U7XG4gICAgaWYgKGVycikge1xuICAgICAgZXJyLmxvYWRBcmd1bWVudHMgPSBbcHJlSnNvbl07XG4gICAgICBzZWxmLm9uTG9hZEVycm9yKGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNlbGYucHJvY2Vzc0pzb25Gcm9tU2VydmVyKHNlcnZlckpzb24sIGpzb24pO1xuICAgIHNlbGYub25Mb2FkZWQoKTtcbiAgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnByb2Nlc3NKc29uRnJvbVNlcnZlciA9IGZ1bmN0aW9uKHNlcnZlckpzb24sIHByZUpzb24pIHtcbiAgdGhpcy5zaGFkb3cgPSBzZXJ2ZXJKc29uO1xuICB2YXIgbmV3SnNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG5cbiAgaWYgKHNlcnZlckpzb24gIT09IHByZUpzb24pIHtcbiAgICAvLyBzZXJ2ZXIgY2hhbmdlc1xuICAgIHZhciBzYXZlQWdhaW4gPSBmYWxzZTtcbiAgICBpZiAocHJlSnNvbiAhPT0gbmV3SnNvbikge1xuICAgICAgLy8gY29uZmxpY3QhIGJvdGggc2VydmVyIGFuZCBsb2NhbCBjaGFuZ2VzIGhhcHBlbmVkXG4gICAgICBzZXJ2ZXJKc29uID0gdGhpcy50aHJlZVdheU1lcmdlKHByZUpzb24sIHNlcnZlckpzb24sIG5ld0pzb24pO1xuICAgICAgaWYgKHR5cGVvZiBzZXJ2ZXJKc29uID09PSAnb2JqZWN0Jykge1xuICAgICAgICBzZXJ2ZXJKc29uID0gdGhpcy5zdHJpbmdpZnkoc2VydmVySnNvbik7XG4gICAgICB9XG4gICAgICBzYXZlQWdhaW4gPSBzZXJ2ZXJKc29uICE9PSB0aGlzLnNoYWRvdztcbiAgICB9XG5cbiAgICB2YXIgc2VydmVyRGF0YTtcbiAgICB0cnkge1xuICAgICAgc2VydmVyRGF0YSA9IHRoaXMucGFyc2Uoc2VydmVySnNvbik7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzZXJ2ZXJEYXRhID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBzZXJ2ZXJEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5taXJyb3JPYmplY3Qoc2VydmVyRGF0YSwgdGhpcy5kYXRhKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZVZhbHVlKHRoaXMuZGF0YSk7XG4gICAgdGhpcy5vbkNoYW5nZSgpO1xuXG4gICAgaWYgKHNhdmVBZ2Fpbikge1xuICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHByZUpzb24gIT09IG5ld0pzb24pIHtcbiAgICAvLyBvbmx5IGxvY2FsIGNoYW5nZXMsIHN0YXJ0IGEgbmV3IHNhdmVcbiAgICB0aGlzLnNhdmUoKTtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxpc3RlbkZvclN0b3JhZ2VFdmVudCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5saXN0ZW5pbmdGb3JTdG9yYWdlRXZlbnQgfHwgIXRoaXMubG9jYWxTdG9yYWdlT2JzZXJ2ZXIpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmxvY2FsU3RvcmFnZU9ic2VydmVyLm9uS2V5Q2hhbmdlKHRoaXMubG9jYWxLZXksIGZ1bmN0aW9uKCl7XG4gICAgaWYgKHRoaXMuc2V0dGluZ0xvY2FsU3RvcmFnZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZWxmLmxvYWRMb2NhbCgpO1xuICB9KTtcbiAgdGhpcy5saXN0ZW5pbmdGb3JTdG9yYWdlRXZlbnQgPSB0cnVlO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm1pcnJvck9iamVjdCA9IGZ1bmN0aW9uKHNvdXJjZSwgdGFyZ2V0KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHR5cGVvZiBzb3VyY2UgIT09ICdvYmplY3QnIHx8IHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gY29weU1lbWJlcihzb3VyY2UsIHRhcmdldCwga2V5KSB7XG4gICAgdmFyIHNvdXJjZVZhbHVlID0gc291cmNlW2tleV07XG4gICAgdmFyIHRhcmdldFZhbHVlID0gdGFyZ2V0W2tleV07XG4gICAgaWYgKHR5cGVvZiB0YXJnZXRWYWx1ZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBzb3VyY2VWYWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiB0YXJnZXRWYWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIChzb3VyY2VWYWx1ZSBpbnN0YW5jZW9mIEFycmF5KSA9PT0gKHRhcmdldFZhbHVlIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICBzZWxmLm1pcnJvck9iamVjdChzb3VyY2VWYWx1ZSwgdGFyZ2V0VmFsdWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVZhbHVlO1xuICB9XG5cbiAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEFycmF5ICYmIHRhcmdldCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgdmFyIHNvdXJjZUxlbmd0aCA9IHNvdXJjZS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzb3VyY2VMZW5ndGg7IGkrKykge1xuICAgICAgY29weU1lbWJlcihzb3VyY2UsIHRhcmdldCwgaSk7XG4gICAgfVxuICAgIHRhcmdldC5sZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGZvciAodmFyIG5hbWUgaW4gc291cmNlKSB7XG4gICAgY29weU1lbWJlcihzb3VyY2UsIHRhcmdldCwgbmFtZSk7XG4gIH1cbiAgZm9yIChuYW1lIGluIHRhcmdldCkge1xuICAgIGlmICh0eXBlb2Ygc291cmNlW25hbWVdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgZGVsZXRlIHRhcmdldFtuYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS50aHJlZVdheU1lcmdlID0gZnVuY3Rpb24ob3JpZ2luYWwsIHNlcnZlciwgbG9jYWwpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy50aHJlZVdheU1lcmdlKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy50aHJlZVdheU1lcmdlLmNhbGwodGhpcywgb3JpZ2luYWwsIHNlcnZlciwgbG9jYWwpO1xuICB9XG4gIC8vIGJ5IGRlZmF1bHQsIGxvY2FsIGFsd2F5cyB3aW5zXG4gIHJldHVybiBsb2NhbDtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKGpzb24pIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoanNvbik7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc3RyaW5naWZ5ID0gZnVuY3Rpb24oZGF0YSkge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuaHR0cEhlYWRlcnMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMub3B0aW9ucy5oZWFkZXJzO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW1pdCgnY2hhbmdlJywgdGhpcy5kYXRhKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vblNhdmVkID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW1pdCgnc2F2ZWQnKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vbkxvYWRlZCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2xvYWRlZCcpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnNob3VsZFJldHJ5ID0gZnVuY3Rpb24oZXJyKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMucmV0cnkgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChlcnIuc3RhdHVzICYmXG4gICAgW1xuICAgICAgLy8gc3RhdHVzZXMgdGhhdCBtaWdodCByZXByZXNlbnQgdGVtcG9yYWwgZmFpbHVyZXNcbiAgICAgIDQwOCwgNDA5LCA0MTAsIDQxOSwgNDIwLCA0MjksIDUwMCwgNTAyLFxuICAgICAgNTAzLCA1MDQsIDUwOSwgNTIxLCA1MjIsIDUyNCwgNTk4LCA1OTlcbiAgICAgIF0uaW5kZXhPZihlcnIuc3RhdHVzKSA8IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25TYXZlRXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodGhpcy5zaG91bGRSZXRyeShlcnIpKSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuc2F2ZSgpO1xuICAgIH0sIHRoaXMub3B0aW9ucy5yZXRyeURlbGF5IHx8IDUwMDApO1xuICB9XG4gIHRoaXMuZW1pdCgnc2F2ZWVycm9yJywgZXJyKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vbkxvYWRFcnJvciA9IGZ1bmN0aW9uKGVycikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0aGlzLnNob3VsZFJldHJ5KGVycikpIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5sb2FkLmFwcGx5KHNlbGYsIGVyci5sb2FkQXJndW1lbnRzKTtcbiAgICB9LCB0aGlzLm9wdGlvbnMucmV0cnlEZWxheSB8fCA1MDAwKTtcbiAgfVxuICB0aGlzLmVtaXQoJ2xvYWRlcnJvcicsIGVycik7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc2V0VXJsID0gZnVuY3Rpb24odXJsLCBoZWFkZXJzKSB7XG4gIHRoaXMudXJsID0gdXJsO1xuICBpZiAoaGVhZGVycykge1xuICAgIHRoaXMub3B0aW9ucy5oZWFkZXJzID0gaGVhZGVycztcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5nZXRMb2NhbFN0b3JhZ2VWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIganNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIGlmIChqc29uID09PSBudWxsIHx8IHR5cGVvZiBqc29uID09PSAndW5kZWZpbmVkJyB8fCBqc29uID09PSAnJykge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICB0cnkge1xuICAgIHJldHVybiB0aGlzLnBhcnNlKGpzb24pIHx8IHt9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5zZXRMb2NhbFN0b3JhZ2VWYWx1ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdmFyIGpzb247XG4gIGlmIChkYXRhID09PSBudWxsIHx8IHR5cGVvZiBkYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgIGpzb24gPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBqc29uID0gdGhpcy5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBqc29uID0gbnVsbDtcbiAgICB9XG4gIH1cbiAgdmFyIHByZXZpb3VzSnNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIHRoaXMuc2V0dGluZ0xvY2FsU3RvcmFnZSA9IHRydWU7XG4gIHRyeSB7XG4gICAgaWYgKHByZXZpb3VzSnNvbiAhPT0ganNvbikge1xuICAgICAgaWYgKGpzb24gPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5sb2NhbEtleSwganNvbik7XG4gICAgICB9XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHRoaXMuc2V0dGluZ0xvY2FsU3RvcmFnZSA9IGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGpzb247XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc291cmNlU2hhZG93O1xuIl19
