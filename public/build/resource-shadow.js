!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.resourceShadow=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){

// global exports

var ResourceShadow = require('./resource-shadow');
exports.ResourceShadow = ResourceShadow;
exports.create = ResourceShadow.create;

if (process.browser) {
  // exports only for browser bundle
  exports.version = '0.0.8';
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
  var previousJson = this.beforeApply();
  try {
    if (typeof changeFn === 'object') {
      this.mirrorObject(changeFn, this.data);
    } else {
      changeFn.call(this, this.data);
    }
  } finally {
    this.afterApply(previousJson);
    return this;
  }
};

ResourceShadow.prototype.beforeApply = function() {
  var json = this.localStorage.getItem(this.localKey);
  this.mirrorObject(this.getLocalStorageValue(), this.data);
  return json;
};

ResourceShadow.prototype.afterApply = function(previousJson) {
  this.setLocalStorageValue(this.data);
  this.save();

  var json = this.localStorage.getItem(this.localKey);
  if (json !== previousJson) {
    this.onChange({
      source: 'apply'
    });
  }
};

ResourceShadow.prototype.save = function() {
  if (this.loading || this.saving) {
    // changes will be detected at the end of current process
    return;
  }

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
      if (self.discardNextServerResponse) {
        self.discardNextServerResponse = false;
        self.emit('serverresponsediscarded');
        return;
      }
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

ResourceShadow.prototype.loadLocal = function(changeInfo) {
  var currentDataJson = this.stringify(this.data);
  if (this.localStorage.getItem(this.localKey) !== currentDataJson) {
    var changed = this.mirrorObject(this.getLocalStorageValue(), this.data);
    if (changed) {
      changeInfo = changeInfo || {};
      changeInfo.source = changeInfo.source || 'localStorage';
      this.onChange(changeInfo);
    }
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
    if (self.discardNextServerResponse) {
      self.emit('serverresponsediscarded');
      self.discardNextServerResponse = false;
      return;
    }
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
  var currentLocalJson = this.localStorage.getItem(this.localKey);

  if (serverJson !== preJson) {
    // server changes
    var saveAgain = false;
    if (preJson !== currentLocalJson) {
      // conflict! both server and local changes happened
      serverJson = this.threeWayMerge(preJson, serverJson, currentLocalJson);
      if (typeof serverJson === 'object') {
        serverJson = this.stringify(serverJson);
      }
      saveAgain = serverJson !== this.shadow;
    }

    if (serverJson !== currentLocalJson) {
      var serverData;
      var changed = true;
      try {
        serverData = this.parse(serverJson);
      } catch (err) {
        serverData = null;
      }
      if (typeof serverData === 'object') {
        changed = this.mirrorObject(serverData, this.data);
      }
      if (changed) {
        this.setLocalStorageValue(this.data);
        this.onChange({
          source: 'server'
        });
      }
    }

    if (saveAgain) {
      this.save();
    }
  } else if (preJson !== currentLocalJson) {
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
    self.loadLocal({
      source: 'localStorageEvent'
    });
  });
  this.listeningForStorageEvent = true;
};

ResourceShadow.prototype.mirrorObject = function(source, target) {
  var self = this;
  if (typeof source !== 'object' || typeof target !== 'object') {
    return false;
  }
  var changed = false;
  function copyMember(source, target, key) {
    var sourceValue = source[key];
    var targetValue = target[key];
    if (targetValue === sourceValue) {
      return false;
    }
    if (typeof targetValue !== 'undefined' &&
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      (sourceValue instanceof Array) === (targetValue instanceof Array)) {
      return self.mirrorObject(sourceValue, targetValue);
    }
    target[key] = sourceValue;
    return true;
  }

  if (source instanceof Array && target instanceof Array) {
    var sourceLength = source.length;
    for (var i = 0; i < sourceLength; i++) {
      if (copyMember(source, target, i)) {
        changed = true;
      }
    }
    if (target.length !== source.length) {
      target.length = source.length;
      changed = true;
    }
    return changed;
  }

  for (var name in source) {
    if (copyMember(source, target, name)) {
      changed = true;
    }
  }
  for (name in target) {
    if (typeof source[name] === 'undefined') {
      delete target[name];
      changed = true;
    }
  }
  return changed;
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

ResourceShadow.prototype.onChange = function(changeInfo) {
  this.emit('change', this.data, changeInfo);
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

ResourceShadow.prototype.reset = function(data) {
  if (this.loading || this.saving) {
    this.discardNextServerResponse = true;
  }
  this.url = null;
  this.mirrorObject(data || {}, this.data);
  this.setLocalStorageValue(this.data);
  this.onChange({
    source: 'reset'
  });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbWFpbi5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9ub2RlX21vZHVsZXMvbWljcm9lZS9pbmRleC5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9odHRwLWhhbmRsZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbG9jYWwtc3RvcmFnZS1vYnNlcnZlci5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9yZXNvdXJjZS1zaGFkb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuXG4vLyBnbG9iYWwgZXhwb3J0c1xuXG52YXIgUmVzb3VyY2VTaGFkb3cgPSByZXF1aXJlKCcuL3Jlc291cmNlLXNoYWRvdycpO1xuZXhwb3J0cy5SZXNvdXJjZVNoYWRvdyA9IFJlc291cmNlU2hhZG93O1xuZXhwb3J0cy5jcmVhdGUgPSBSZXNvdXJjZVNoYWRvdy5jcmVhdGU7XG5cbmlmIChwcm9jZXNzLmJyb3dzZXIpIHtcbiAgLy8gZXhwb3J0cyBvbmx5IGZvciBicm93c2VyIGJ1bmRsZVxuICBleHBvcnRzLnZlcnNpb24gPSAne3twYWNrYWdlLXZlcnNpb259fSc7XG4gIGV4cG9ydHMuaG9tZXBhZ2UgPSAne3twYWNrYWdlLWhvbWVwYWdlfX0nO1xufSBlbHNlIHtcbiAgLy8gZXhwb3J0cyBvbmx5IGZvciBub2RlLmpzXG4gIHZhciBwYWNrYWdlSW5mbyA9IHJlcXVpcmUoJy4uL3BhY2snICsgJ2FnZS5qc29uJyk7XG4gIGV4cG9ydHMudmVyc2lvbiA9IHBhY2thZ2VJbmZvLnZlcnNpb247XG4gIGV4cG9ydHMuaG9tZXBhZ2UgPSBwYWNrYWdlSW5mby5ob21lcGFnZTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJmdW5jdGlvbiBNKCkgeyB0aGlzLl9ldmVudHMgPSB7fTsgfVxuTS5wcm90b3R5cGUgPSB7XG4gIG9uOiBmdW5jdGlvbihldiwgY2IpIHtcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICB2YXIgZSA9IHRoaXMuX2V2ZW50cztcbiAgICAoZVtldl0gfHwgKGVbZXZdID0gW10pKS5wdXNoKGNiKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlTGlzdGVuZXI6IGZ1bmN0aW9uKGV2LCBjYikge1xuICAgIHZhciBlID0gdGhpcy5fZXZlbnRzW2V2XSB8fCBbXSwgaTtcbiAgICBmb3IoaSA9IGUubGVuZ3RoLTE7IGkgPj0gMCAmJiBlW2ldOyBpLS0pe1xuICAgICAgaWYoZVtpXSA9PT0gY2IgfHwgZVtpXS5jYiA9PT0gY2IpIHsgZS5zcGxpY2UoaSwgMSk7IH1cbiAgICB9XG4gIH0sXG4gIHJlbW92ZUFsbExpc3RlbmVyczogZnVuY3Rpb24oZXYpIHtcbiAgICBpZighZXYpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cbiAgICBlbHNlIHsgdGhpcy5fZXZlbnRzW2V2XSAmJiAodGhpcy5fZXZlbnRzW2V2XSA9IFtdKTsgfVxuICB9LFxuICBlbWl0OiBmdW5jdGlvbihldikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgaSwgZSA9IHRoaXMuX2V2ZW50c1tldl0gfHwgW107XG4gICAgZm9yKGkgPSBlLmxlbmd0aC0xOyBpID49IDAgJiYgZVtpXTsgaS0tKXtcbiAgICAgIGVbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB3aGVuOiBmdW5jdGlvbihldiwgY2IpIHtcbiAgICByZXR1cm4gdGhpcy5vbmNlKGV2LCBjYiwgdHJ1ZSk7XG4gIH0sXG4gIG9uY2U6IGZ1bmN0aW9uKGV2LCBjYiwgd2hlbikge1xuICAgIGlmKCFjYikgcmV0dXJuIHRoaXM7XG4gICAgZnVuY3Rpb24gYygpIHtcbiAgICAgIGlmKCF3aGVuKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2LCBjKTtcbiAgICAgIGlmKGNiLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgJiYgd2hlbikgdGhpcy5yZW1vdmVMaXN0ZW5lcihldiwgYyk7XG4gICAgfVxuICAgIGMuY2IgPSBjYjtcbiAgICB0aGlzLm9uKGV2LCBjKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcbk0ubWl4aW4gPSBmdW5jdGlvbihkZXN0KSB7XG4gIHZhciBvID0gTS5wcm90b3R5cGUsIGs7XG4gIGZvciAoayBpbiBvKSB7XG4gICAgby5oYXNPd25Qcm9wZXJ0eShrKSAmJiAoZGVzdC5wcm90b3R5cGVba10gPSBvW2tdKTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gTTtcbiIsIlxuZnVuY3Rpb24gSHR0cEhhbmRsZXIoKSB7XG59XG5cbkh0dHBIYW5kbGVyLnByb3RvdHlwZS5hamF4ID0gZnVuY3Rpb24obWV0aG9kLCB1cmwsIGhlYWRlcnMsIGJvZHksIGNhbGxiYWNrKSB7XG5cbiAgLy8gc2ltcGxlIGJyb3dzZXIgaW1wbGVtZW50YXRpb25cbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcbiAgaWYgKGJvZHkpIHtcbiAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04Jyk7XG4gIH1cbiAgaWYgKGhlYWRlcnMpIHtcbiAgICBmb3IgKHZhciBoZWFkZXIgaW4gaGVhZGVycykge1xuICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlciwgaGVhZGVyc1toZWFkZXJdKTtcbiAgICB9XG4gIH1cblxuICB2YXIgZGF0YTtcbiAgdmFyIGNvbXBsZXRlID0gZmFsc2U7XG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKGNvbXBsZXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbXBsZXRlID0gdHJ1ZTtcbiAgICBpZiAocmVxdWVzdC5zdGF0dXMgPj0gMjAwICYmIHJlcXVlc3Quc3RhdHVzIDwgNDAwKSB7XG4gICAgICAvLyBTdWNjZXNzIVxuICAgICAgZGF0YSA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xuICAgICAgY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFdlIHJlYWNoZWQgb3VyIHRhcmdldCBzZXJ2ZXIsIGJ1dCBpdCByZXR1cm5lZCBhbiBlcnJvclxuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignaHR0cCBlcnJvciAnICsgcmVxdWVzdC5zdGF0dXMpO1xuICAgICAgZXJyLnN0YXR1cyA9IHJlcXVlc3Quc3RhdHVzO1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgLy8gVGhlcmUgd2FzIGEgY29ubmVjdGlvbiBlcnJvciBvZiBzb21lIHNvcnRcbiAgICBpZiAoY29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29tcGxldGUgPSB0cnVlO1xuICAgIGNhbGxiYWNrKGVycik7XG4gIH07XG5cbiAgaWYgKGJvZHkpIHtcbiAgICByZXF1ZXN0LnNlbmQoYm9keSk7XG4gIH0gZWxzZSB7XG4gICAgcmVxdWVzdC5zZW5kKCk7XG4gIH1cbn07XG5cbkh0dHBIYW5kbGVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbih1cmwsIGhlYWRlcnMsIGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLmFqYXgoJ0dFVCcsIHVybCwgaGVhZGVycywgbnVsbCwgY2FsbGJhY2spO1xufTtcblxuSHR0cEhhbmRsZXIucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uKHVybCwgaGVhZGVycywgYm9keSwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuYWpheCgnUFVUJywgdXJsLCBoZWFkZXJzLCBib2R5LCBjYWxsYmFjayk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBIdHRwSGFuZGxlcigpO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcblxuZnVuY3Rpb24gTG9jYWxTdG9yYWdlT2JzZXJ2ZXIoKSB7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIoZWwsIGV2ZW50TmFtZSwgaGFuZGxlcikge1xuICBpZiAoZWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBoYW5kbGVyLCBmYWxzZSk7XG4gIH0gZWxzZSBpZiAoZWwuYXR0YWNoRXZlbnQpIHtcbiAgICBlbC5hdHRhY2hFdmVudCgnb24nICsgZXZlbnROYW1lLCBmdW5jdGlvbigpIHtcbiAgICAgIGhhbmRsZXIuYXBwbHkoZWwsIGFyZ3VtZW50cyk7XG4gICAgfSk7XG4gIH1cbn1cblxuTG9jYWxTdG9yYWdlT2JzZXJ2ZXIucHJvdG90eXBlLm9uS2V5Q2hhbmdlID0gZnVuY3Rpb24oa2V5LCBoYW5kbGVyKSB7XG4gIGlmICghcHJvY2Vzcy5icm93c2VyKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIod2luZG93LCAnc3RvcmFnZScsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXkgPT09IGtleSkge1xuICAgICAgaGFuZGxlcigpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBMb2NhbFN0b3JhZ2VPYnNlcnZlcigpO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCJ2YXIgbWljcm9lZSA9IHJlcXVpcmUoJ21pY3JvZWUnKTtcbnZhciBkZWZhdWx0SHR0cEhhbmRsZXI7XG52YXIgZGVmYXVsdExvY2FsU3RvcmFnZU9ic2VydmVyO1xuXG5mdW5jdGlvbiBSZXNvdXJjZVNoYWRvdyhvcHRpb25zKSB7XG4gIHRoaXMuZGF0YSA9IHt9O1xuICB0aGlzLmxvY2FsS2V5ID0gb3B0aW9ucy5sb2NhbEtleTtcbiAgdGhpcy51cmwgPSBvcHRpb25zLnVybDtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgdGhpcy5sb2NhbFN0b3JhZ2UgPSBvcHRpb25zLmxvY2FsU3RvcmFnZSB8fCBsb2NhbFN0b3JhZ2U7XG4gIHRoaXMubG9jYWxTdG9yYWdlT2JzZXJ2ZXIgPSBvcHRpb25zLmxvY2FsU3RvcmFnZU9ic2VydmVyIHx8XG4gICAgKGRlZmF1bHRMb2NhbFN0b3JhZ2VPYnNlcnZlciA9IGRlZmF1bHRMb2NhbFN0b3JhZ2VPYnNlcnZlciB8fCByZXF1aXJlKCcuL2xvY2FsLXN0b3JhZ2Utb2JzZXJ2ZXInKSk7XG4gIHRoaXMuaHR0cEhhbmRsZXIgPSBvcHRpb25zLmh0dHBIYW5kbGVyIHx8XG4gICAgKGRlZmF1bHRIdHRwSGFuZGxlciA9IGRlZmF1bHRIdHRwSGFuZGxlciB8fCByZXF1aXJlKCcuL2h0dHAtaGFuZGxlcicpKTtcbiAgdGhpcy5sb2FkKCk7XG4gIGlmICh0aGlzLmxvY2FsU3RvcmFnZU9ic2VydmVyKSB7XG4gICAgdGhpcy5saXN0ZW5Gb3JTdG9yYWdlRXZlbnQoKTtcbiAgfVxufVxuXG5taWNyb2VlLm1peGluKFJlc291cmNlU2hhZG93KTtcblxuUmVzb3VyY2VTaGFkb3cuY3JlYXRlID0gZnVuY3Rpb24gcmVzb3VyY2VDcmVhdGUob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFJlc291cmNlU2hhZG93KG9wdGlvbnMpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24gcmVzb3VyY2VDaGFuZ2VBcHBseShjaGFuZ2VGbikge1xuICB2YXIgcHJldmlvdXNKc29uID0gdGhpcy5iZWZvcmVBcHBseSgpO1xuICB0cnkge1xuICAgIGlmICh0eXBlb2YgY2hhbmdlRm4gPT09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLm1pcnJvck9iamVjdChjaGFuZ2VGbiwgdGhpcy5kYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hhbmdlRm4uY2FsbCh0aGlzLCB0aGlzLmRhdGEpO1xuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICB0aGlzLmFmdGVyQXBwbHkocHJldmlvdXNKc29uKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmJlZm9yZUFwcGx5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBqc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgdGhpcy5taXJyb3JPYmplY3QodGhpcy5nZXRMb2NhbFN0b3JhZ2VWYWx1ZSgpLCB0aGlzLmRhdGEpO1xuICByZXR1cm4ganNvbjtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5hZnRlckFwcGx5ID0gZnVuY3Rpb24ocHJldmlvdXNKc29uKSB7XG4gIHRoaXMuc2V0TG9jYWxTdG9yYWdlVmFsdWUodGhpcy5kYXRhKTtcbiAgdGhpcy5zYXZlKCk7XG5cbiAgdmFyIGpzb24gPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpO1xuICBpZiAoanNvbiAhPT0gcHJldmlvdXNKc29uKSB7XG4gICAgdGhpcy5vbkNoYW5nZSh7XG4gICAgICBzb3VyY2U6ICdhcHBseSdcbiAgICB9KTtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMubG9hZGluZyB8fCB0aGlzLnNhdmluZykge1xuICAgIC8vIGNoYW5nZXMgd2lsbCBiZSBkZXRlY3RlZCBhdCB0aGUgZW5kIG9mIGN1cnJlbnQgcHJvY2Vzc1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghdGhpcy51cmwpIHtcbiAgICAvLyBubyByZW1vdGUgdXJsIGZvciB0aGlzIHJlc291cmNlXG4gICAgdGhpcy5vblNhdmVkKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBqc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgaWYgKHRoaXMuc2hhZG93ICE9PSBqc29uKSB7XG4gICAgLy8gd2UgaGF2ZSBjaGFuZ2VzIHRvIHNhdmVcbiAgICB0aGlzLnNhdmluZyA9IHRydWU7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuaHR0cEhhbmRsZXIucHV0KHRoaXMudXJsLCB0aGlzLmh0dHBIZWFkZXJzKCksIGpzb24sIGZ1bmN0aW9uKGVyciwgc2VydmVySnNvbikge1xuICAgICAgc2VsZi5zYXZpbmcgPSBmYWxzZTtcbiAgICAgIGlmIChzZWxmLmRpc2NhcmROZXh0U2VydmVyUmVzcG9uc2UpIHtcbiAgICAgICAgc2VsZi5kaXNjYXJkTmV4dFNlcnZlclJlc3BvbnNlID0gZmFsc2U7XG4gICAgICAgIHNlbGYuZW1pdCgnc2VydmVycmVzcG9uc2VkaXNjYXJkZWQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGVycikge1xuICAgICAgICBzZWxmLm9uU2F2ZUVycm9yKGVycik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlbGYub25TYXZlZCgpO1xuICAgICAgc2VsZi5wcm9jZXNzSnNvbkZyb21TZXJ2ZXIoc2VydmVySnNvbiwganNvbik7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5vblNhdmVkKCk7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5sb2FkQW5kUmViYXNlID0gZnVuY3Rpb24oKSB7XG4gIC8vIGxvYWQgZnJvbSBzZXJ2ZXIsIGFuZCBjb25zaWRlciBhbGwgbG9jYWwgZGF0YSBhcyBtb3N0IHJlY2VudFxuICAvLyBub3RlOiB0aGlzIHdpbGwgY2F1c2UgYSAzLXdheSBtZXJnZVxuICByZXR1cm4gdGhpcy5sb2FkKHt9KTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5sb2FkTG9jYWwgPSBmdW5jdGlvbihjaGFuZ2VJbmZvKSB7XG4gIHZhciBjdXJyZW50RGF0YUpzb24gPSB0aGlzLnN0cmluZ2lmeSh0aGlzLmRhdGEpO1xuICBpZiAodGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KSAhPT0gY3VycmVudERhdGFKc29uKSB7XG4gICAgdmFyIGNoYW5nZWQgPSB0aGlzLm1pcnJvck9iamVjdCh0aGlzLmdldExvY2FsU3RvcmFnZVZhbHVlKCksIHRoaXMuZGF0YSk7XG4gICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgIGNoYW5nZUluZm8gPSBjaGFuZ2VJbmZvIHx8IHt9O1xuICAgICAgY2hhbmdlSW5mby5zb3VyY2UgPSBjaGFuZ2VJbmZvLnNvdXJjZSB8fCAnbG9jYWxTdG9yYWdlJztcbiAgICAgIHRoaXMub25DaGFuZ2UoY2hhbmdlSW5mbyk7XG4gICAgfVxuICB9XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHByZUpzb24pIHtcblxuICB0aGlzLmxvYWRMb2NhbCgpO1xuXG4gIGlmICh0aGlzLmxvYWRpbmcgfHwgdGhpcy5zYXZpbmcpIHtcbiAgICAvLyBjaGFuZ2VzIHdpbGwgYmUgZGV0ZWN0ZWQgYXQgdGhlIGVuZCBvZiBjdXJyZW50IHByb2Nlc3NcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBpZiAoIXRoaXMudXJsKSB7XG4gICAgLy8gbm8gcmVtb3RlIHVybCBmb3IgdGhpcyByZXNvdXJjZVxuICAgIHRoaXMub25Mb2FkZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBqc29uO1xuICBpZiAocHJlSnNvbikge1xuICAgIGpzb24gPSBwcmVKc29uO1xuICAgIGlmICh0eXBlb2YganNvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGpzb24gPSB0aGlzLnN0cmluZ2lmeShqc29uKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAganNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIH1cblxuICB0aGlzLmxvYWRpbmcgPSB0cnVlO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuaHR0cEhhbmRsZXIuZ2V0KHRoaXMudXJsLCB0aGlzLmh0dHBIZWFkZXJzKCksIGZ1bmN0aW9uKGVyciwgc2VydmVySnNvbikge1xuICAgIHNlbGYubG9hZGluZyA9IGZhbHNlO1xuICAgIGlmIChzZWxmLmRpc2NhcmROZXh0U2VydmVyUmVzcG9uc2UpIHtcbiAgICAgIHNlbGYuZW1pdCgnc2VydmVycmVzcG9uc2VkaXNjYXJkZWQnKTtcbiAgICAgIHNlbGYuZGlzY2FyZE5leHRTZXJ2ZXJSZXNwb25zZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZXJyKSB7XG4gICAgICBlcnIubG9hZEFyZ3VtZW50cyA9IFtwcmVKc29uXTtcbiAgICAgIHNlbGYub25Mb2FkRXJyb3IoZXJyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5wcm9jZXNzSnNvbkZyb21TZXJ2ZXIoc2VydmVySnNvbiwganNvbik7XG4gICAgc2VsZi5vbkxvYWRlZCgpO1xuICB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUucHJvY2Vzc0pzb25Gcm9tU2VydmVyID0gZnVuY3Rpb24oc2VydmVySnNvbiwgcHJlSnNvbikge1xuICB0aGlzLnNoYWRvdyA9IHNlcnZlckpzb247XG4gIHZhciBjdXJyZW50TG9jYWxKc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcblxuICBpZiAoc2VydmVySnNvbiAhPT0gcHJlSnNvbikge1xuICAgIC8vIHNlcnZlciBjaGFuZ2VzXG4gICAgdmFyIHNhdmVBZ2FpbiA9IGZhbHNlO1xuICAgIGlmIChwcmVKc29uICE9PSBjdXJyZW50TG9jYWxKc29uKSB7XG4gICAgICAvLyBjb25mbGljdCEgYm90aCBzZXJ2ZXIgYW5kIGxvY2FsIGNoYW5nZXMgaGFwcGVuZWRcbiAgICAgIHNlcnZlckpzb24gPSB0aGlzLnRocmVlV2F5TWVyZ2UocHJlSnNvbiwgc2VydmVySnNvbiwgY3VycmVudExvY2FsSnNvbik7XG4gICAgICBpZiAodHlwZW9mIHNlcnZlckpzb24gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHNlcnZlckpzb24gPSB0aGlzLnN0cmluZ2lmeShzZXJ2ZXJKc29uKTtcbiAgICAgIH1cbiAgICAgIHNhdmVBZ2FpbiA9IHNlcnZlckpzb24gIT09IHRoaXMuc2hhZG93O1xuICAgIH1cblxuICAgIGlmIChzZXJ2ZXJKc29uICE9PSBjdXJyZW50TG9jYWxKc29uKSB7XG4gICAgICB2YXIgc2VydmVyRGF0YTtcbiAgICAgIHZhciBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHNlcnZlckRhdGEgPSB0aGlzLnBhcnNlKHNlcnZlckpzb24pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHNlcnZlckRhdGEgPSBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBzZXJ2ZXJEYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjaGFuZ2VkID0gdGhpcy5taXJyb3JPYmplY3Qoc2VydmVyRGF0YSwgdGhpcy5kYXRhKTtcbiAgICAgIH1cbiAgICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlVmFsdWUodGhpcy5kYXRhKTtcbiAgICAgICAgdGhpcy5vbkNoYW5nZSh7XG4gICAgICAgICAgc291cmNlOiAnc2VydmVyJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2F2ZUFnYWluKSB7XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocHJlSnNvbiAhPT0gY3VycmVudExvY2FsSnNvbikge1xuICAgIC8vIG9ubHkgbG9jYWwgY2hhbmdlcywgc3RhcnQgYSBuZXcgc2F2ZVxuICAgIHRoaXMuc2F2ZSgpO1xuICB9XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUubGlzdGVuRm9yU3RvcmFnZUV2ZW50ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmxpc3RlbmluZ0ZvclN0b3JhZ2VFdmVudCB8fCAhdGhpcy5sb2NhbFN0b3JhZ2VPYnNlcnZlcikge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMubG9jYWxTdG9yYWdlT2JzZXJ2ZXIub25LZXlDaGFuZ2UodGhpcy5sb2NhbEtleSwgZnVuY3Rpb24oKXtcbiAgICBpZiAodGhpcy5zZXR0aW5nTG9jYWxTdG9yYWdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNlbGYubG9hZExvY2FsKHtcbiAgICAgIHNvdXJjZTogJ2xvY2FsU3RvcmFnZUV2ZW50J1xuICAgIH0pO1xuICB9KTtcbiAgdGhpcy5saXN0ZW5pbmdGb3JTdG9yYWdlRXZlbnQgPSB0cnVlO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm1pcnJvck9iamVjdCA9IGZ1bmN0aW9uKHNvdXJjZSwgdGFyZ2V0KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHR5cGVvZiBzb3VyY2UgIT09ICdvYmplY3QnIHx8IHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGNvcHlNZW1iZXIoc291cmNlLCB0YXJnZXQsIGtleSkge1xuICAgIHZhciBzb3VyY2VWYWx1ZSA9IHNvdXJjZVtrZXldO1xuICAgIHZhciB0YXJnZXRWYWx1ZSA9IHRhcmdldFtrZXldO1xuICAgIGlmICh0YXJnZXRWYWx1ZSA9PT0gc291cmNlVmFsdWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0YXJnZXRWYWx1ZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBzb3VyY2VWYWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiB0YXJnZXRWYWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIChzb3VyY2VWYWx1ZSBpbnN0YW5jZW9mIEFycmF5KSA9PT0gKHRhcmdldFZhbHVlIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICByZXR1cm4gc2VsZi5taXJyb3JPYmplY3Qoc291cmNlVmFsdWUsIHRhcmdldFZhbHVlKTtcbiAgICB9XG4gICAgdGFyZ2V0W2tleV0gPSBzb3VyY2VWYWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheSAmJiB0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIHZhciBzb3VyY2VMZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjb3B5TWVtYmVyKHNvdXJjZSwgdGFyZ2V0LCBpKSkge1xuICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRhcmdldC5sZW5ndGggIT09IHNvdXJjZS5sZW5ndGgpIHtcbiAgICAgIHRhcmdldC5sZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VkO1xuICB9XG5cbiAgZm9yICh2YXIgbmFtZSBpbiBzb3VyY2UpIHtcbiAgICBpZiAoY29weU1lbWJlcihzb3VyY2UsIHRhcmdldCwgbmFtZSkpIHtcbiAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuICBmb3IgKG5hbWUgaW4gdGFyZ2V0KSB7XG4gICAgaWYgKHR5cGVvZiBzb3VyY2VbbmFtZV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkZWxldGUgdGFyZ2V0W25hbWVdO1xuICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VkO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnRocmVlV2F5TWVyZ2UgPSBmdW5jdGlvbihvcmlnaW5hbCwgc2VydmVyLCBsb2NhbCkge1xuICBpZiAodGhpcy5vcHRpb25zLnRocmVlV2F5TWVyZ2UpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLnRocmVlV2F5TWVyZ2UuY2FsbCh0aGlzLCBvcmlnaW5hbCwgc2VydmVyLCBsb2NhbCk7XG4gIH1cbiAgLy8gYnkgZGVmYXVsdCwgbG9jYWwgYWx3YXlzIHdpbnNcbiAgcmV0dXJuIGxvY2FsO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oanNvbikge1xuICByZXR1cm4gSlNPTi5wYXJzZShqc29uKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5zdHJpbmdpZnkgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5odHRwSGVhZGVycyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5vcHRpb25zLmhlYWRlcnM7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbihjaGFuZ2VJbmZvKSB7XG4gIHRoaXMuZW1pdCgnY2hhbmdlJywgdGhpcy5kYXRhLCBjaGFuZ2VJbmZvKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vblNhdmVkID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW1pdCgnc2F2ZWQnKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vbkxvYWRlZCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2xvYWRlZCcpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnNob3VsZFJldHJ5ID0gZnVuY3Rpb24oZXJyKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMucmV0cnkgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChlcnIuc3RhdHVzICYmXG4gICAgW1xuICAgICAgLy8gc3RhdHVzZXMgdGhhdCBtaWdodCByZXByZXNlbnQgdGVtcG9yYWwgZmFpbHVyZXNcbiAgICAgIDQwOCwgNDA5LCA0MTAsIDQxOSwgNDIwLCA0MjksIDUwMCwgNTAyLFxuICAgICAgNTAzLCA1MDQsIDUwOSwgNTIxLCA1MjIsIDUyNCwgNTk4LCA1OTlcbiAgICAgIF0uaW5kZXhPZihlcnIuc3RhdHVzKSA8IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25TYXZlRXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodGhpcy5zaG91bGRSZXRyeShlcnIpKSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuc2F2ZSgpO1xuICAgIH0sIHRoaXMub3B0aW9ucy5yZXRyeURlbGF5IHx8IDUwMDApO1xuICB9XG4gIHRoaXMuZW1pdCgnc2F2ZWVycm9yJywgZXJyKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vbkxvYWRFcnJvciA9IGZ1bmN0aW9uKGVycikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0aGlzLnNob3VsZFJldHJ5KGVycikpIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5sb2FkLmFwcGx5KHNlbGYsIGVyci5sb2FkQXJndW1lbnRzKTtcbiAgICB9LCB0aGlzLm9wdGlvbnMucmV0cnlEZWxheSB8fCA1MDAwKTtcbiAgfVxuICB0aGlzLmVtaXQoJ2xvYWRlcnJvcicsIGVycik7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc2V0VXJsID0gZnVuY3Rpb24odXJsLCBoZWFkZXJzKSB7XG4gIHRoaXMudXJsID0gdXJsO1xuICBpZiAoaGVhZGVycykge1xuICAgIHRoaXMub3B0aW9ucy5oZWFkZXJzID0gaGVhZGVycztcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgaWYgKHRoaXMubG9hZGluZyB8fCB0aGlzLnNhdmluZykge1xuICAgIHRoaXMuZGlzY2FyZE5leHRTZXJ2ZXJSZXNwb25zZSA9IHRydWU7XG4gIH1cbiAgdGhpcy51cmwgPSBudWxsO1xuICB0aGlzLm1pcnJvck9iamVjdChkYXRhIHx8IHt9LCB0aGlzLmRhdGEpO1xuICB0aGlzLnNldExvY2FsU3RvcmFnZVZhbHVlKHRoaXMuZGF0YSk7XG4gIHRoaXMub25DaGFuZ2Uoe1xuICAgIHNvdXJjZTogJ3Jlc2V0J1xuICB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5nZXRMb2NhbFN0b3JhZ2VWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIganNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIGlmIChqc29uID09PSBudWxsIHx8IHR5cGVvZiBqc29uID09PSAndW5kZWZpbmVkJyB8fCBqc29uID09PSAnJykge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICB0cnkge1xuICAgIHJldHVybiB0aGlzLnBhcnNlKGpzb24pIHx8IHt9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5zZXRMb2NhbFN0b3JhZ2VWYWx1ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdmFyIGpzb247XG4gIGlmIChkYXRhID09PSBudWxsIHx8IHR5cGVvZiBkYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgIGpzb24gPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBqc29uID0gdGhpcy5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBqc29uID0gbnVsbDtcbiAgICB9XG4gIH1cbiAgdmFyIHByZXZpb3VzSnNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIHRoaXMuc2V0dGluZ0xvY2FsU3RvcmFnZSA9IHRydWU7XG4gIHRyeSB7XG4gICAgaWYgKHByZXZpb3VzSnNvbiAhPT0ganNvbikge1xuICAgICAgaWYgKGpzb24gPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5sb2NhbEtleSwganNvbik7XG4gICAgICB9XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHRoaXMuc2V0dGluZ0xvY2FsU3RvcmFnZSA9IGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGpzb247XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc291cmNlU2hhZG93O1xuIl19
