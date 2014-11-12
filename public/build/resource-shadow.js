!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.resourceShadow=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){

// global exports

var ResourceShadow = require('./resource-shadow');
exports.ResourceShadow = ResourceShadow;
exports.create = ResourceShadow.create;

if (process.browser) {
  // exports only for browser bundle
  exports.version = '0.0.3';
  exports.homepage = 'https://github.com/benjamine/resource-shadow';
} else {
  // exports only for node.js
  var packageInfo = require('../pack' + 'age.json');
  exports.version = packageInfo.version;
  exports.homepage = packageInfo.homepage;
}

}).call(this,require('_process'))
},{"./resource-shadow":5,"_process":2}],2:[function(require,module,exports){
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
var microee = require('microee');
var defaultHttpHandler;

function ResourceShadow(options) {
  this.localKey = options.localKey;
  this.url = options.url;
  this.options = options;
  this.localStorage = options.localStorage || localStorage;
  this.httpHandler = options.httpHandler ||
    (defaultHttpHandler = defaultHttpHandler || require('./http-handler'));
  this.load();
  this.listenForStorageEvent();
}

microee.mixin(ResourceShadow);

ResourceShadow.create = function resourceCreate(options) {
  return new ResourceShadow(options);
};

ResourceShadow.prototype.apply = function resourceChangeApply(changeFn) {
  var data = this.beforeApply();
  try {
    data = changeFn(data) || data;
  } finally {
    this.afterApply(data);
    return this;
  }
};

ResourceShadow.prototype.beforeApply = function() {
  return this.getLocalStorageValue();
};

ResourceShadow.prototype.afterApply = function(data) {
  this.setLocalStorageValue(data);
  this.data = data;
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

ResourceShadow.prototype.load = function(preJson) {

  var currentDataJson = this.stringify(this.data);
  if (this.localStorage.getItem(this.localKey) !== currentDataJson) {
    this.data = this.getLocalStorageValue();
    this.onChange();
  }

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

    try  {
      this.data = this.parse(serverJson);
    } catch (err) {
      this.data = null;
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
  if (this.listeningForStorageEvent) {
    return;
  }

  if (!process.browser) {
    return;
  }

  function addEventListener(el, eventName, handler) {
    if (el.addEventListener) {
      el.addEventListener(eventName, handler, false);
    } else if (el.attachEvent) {
      el.attachEvent('on' + eventName, function(){
        handler.apply(el, arguments);
      });
    }
  }

  var self = this;
  var handler = function(e) {
    if (e.key === self.localKey) {
      self.load();
    }
  };

  addEventListener(window, 'storage', handler);
  this.listeningForStorageEvent = true;
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
    return null;
  }
  try {
    return this.parse(json);
  } catch (err) {
    return null;
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
  if (previousJson !== json) {
    if (json === null) {
      this.localStorage.removeItem(this.localKey);
    } else {
      this.localStorage.setItem(this.localKey, json);
    }
  }

  return json;
};

module.exports = ResourceShadow;

}).call(this,require('_process'))
},{"./http-handler":4,"_process":2,"microee":3}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbWFpbi5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9ub2RlX21vZHVsZXMvbWljcm9lZS9pbmRleC5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9odHRwLWhhbmRsZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvcmVzb3VyY2Utc2hhZG93LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcblxuLy8gZ2xvYmFsIGV4cG9ydHNcblxudmFyIFJlc291cmNlU2hhZG93ID0gcmVxdWlyZSgnLi9yZXNvdXJjZS1zaGFkb3cnKTtcbmV4cG9ydHMuUmVzb3VyY2VTaGFkb3cgPSBSZXNvdXJjZVNoYWRvdztcbmV4cG9ydHMuY3JlYXRlID0gUmVzb3VyY2VTaGFkb3cuY3JlYXRlO1xuXG5pZiAocHJvY2Vzcy5icm93c2VyKSB7XG4gIC8vIGV4cG9ydHMgb25seSBmb3IgYnJvd3NlciBidW5kbGVcbiAgZXhwb3J0cy52ZXJzaW9uID0gJ3t7cGFja2FnZS12ZXJzaW9ufX0nO1xuICBleHBvcnRzLmhvbWVwYWdlID0gJ3t7cGFja2FnZS1ob21lcGFnZX19Jztcbn0gZWxzZSB7XG4gIC8vIGV4cG9ydHMgb25seSBmb3Igbm9kZS5qc1xuICB2YXIgcGFja2FnZUluZm8gPSByZXF1aXJlKCcuLi9wYWNrJyArICdhZ2UuanNvbicpO1xuICBleHBvcnRzLnZlcnNpb24gPSBwYWNrYWdlSW5mby52ZXJzaW9uO1xuICBleHBvcnRzLmhvbWVwYWdlID0gcGFja2FnZUluZm8uaG9tZXBhZ2U7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiZnVuY3Rpb24gTSgpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cbk0ucHJvdG90eXBlID0ge1xuICBvbjogZnVuY3Rpb24oZXYsIGNiKSB7XG4gICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgdmFyIGUgPSB0aGlzLl9ldmVudHM7XG4gICAgKGVbZXZdIHx8IChlW2V2XSA9IFtdKSkucHVzaChjYik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyOiBmdW5jdGlvbihldiwgY2IpIHtcbiAgICB2YXIgZSA9IHRoaXMuX2V2ZW50c1tldl0gfHwgW10sIGk7XG4gICAgZm9yKGkgPSBlLmxlbmd0aC0xOyBpID49IDAgJiYgZVtpXTsgaS0tKXtcbiAgICAgIGlmKGVbaV0gPT09IGNiIHx8IGVbaV0uY2IgPT09IGNiKSB7IGUuc3BsaWNlKGksIDEpOyB9XG4gICAgfVxuICB9LFxuICByZW1vdmVBbGxMaXN0ZW5lcnM6IGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYoIWV2KSB7IHRoaXMuX2V2ZW50cyA9IHt9OyB9XG4gICAgZWxzZSB7IHRoaXMuX2V2ZW50c1tldl0gJiYgKHRoaXMuX2V2ZW50c1tldl0gPSBbXSk7IH1cbiAgfSxcbiAgZW1pdDogZnVuY3Rpb24oZXYpIHtcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGksIGUgPSB0aGlzLl9ldmVudHNbZXZdIHx8IFtdO1xuICAgIGZvcihpID0gZS5sZW5ndGgtMTsgaSA+PSAwICYmIGVbaV07IGktLSl7XG4gICAgICBlW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgd2hlbjogZnVuY3Rpb24oZXYsIGNiKSB7XG4gICAgcmV0dXJuIHRoaXMub25jZShldiwgY2IsIHRydWUpO1xuICB9LFxuICBvbmNlOiBmdW5jdGlvbihldiwgY2IsIHdoZW4pIHtcbiAgICBpZighY2IpIHJldHVybiB0aGlzO1xuICAgIGZ1bmN0aW9uIGMoKSB7XG4gICAgICBpZighd2hlbikgdGhpcy5yZW1vdmVMaXN0ZW5lcihldiwgYyk7XG4gICAgICBpZihjYi5hcHBseSh0aGlzLCBhcmd1bWVudHMpICYmIHdoZW4pIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXYsIGMpO1xuICAgIH1cbiAgICBjLmNiID0gY2I7XG4gICAgdGhpcy5vbihldiwgYyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5NLm1peGluID0gZnVuY3Rpb24oZGVzdCkge1xuICB2YXIgbyA9IE0ucHJvdG90eXBlLCBrO1xuICBmb3IgKGsgaW4gbykge1xuICAgIG8uaGFzT3duUHJvcGVydHkoaykgJiYgKGRlc3QucHJvdG90eXBlW2tdID0gb1trXSk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IE07XG4iLCJcbmZ1bmN0aW9uIEh0dHBIYW5kbGVyKCkge1xufVxuXG5IdHRwSGFuZGxlci5wcm90b3R5cGUuYWpheCA9IGZ1bmN0aW9uKG1ldGhvZCwgdXJsLCBoZWFkZXJzLCBib2R5LCBjYWxsYmFjaykge1xuXG4gIC8vIHNpbXBsZSBicm93c2VyIGltcGxlbWVudGF0aW9uXG4gIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcXVlc3Qub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG4gIGlmIChib2R5KSB7XG4gICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOCcpO1xuICB9XG4gIGlmIChoZWFkZXJzKSB7XG4gICAgZm9yICh2YXIgaGVhZGVyIGluIGhlYWRlcnMpIHtcbiAgICAgIHJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIGhlYWRlcnNbaGVhZGVyXSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGRhdGE7XG4gIHZhciBjb21wbGV0ZSA9IGZhbHNlO1xuICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChjb21wbGV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb21wbGV0ZSA9IHRydWU7XG4gICAgaWYgKHJlcXVlc3Quc3RhdHVzID49IDIwMCAmJiByZXF1ZXN0LnN0YXR1cyA8IDQwMCkge1xuICAgICAgLy8gU3VjY2VzcyFcbiAgICAgIGRhdGEgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBXZSByZWFjaGVkIG91ciB0YXJnZXQgc2VydmVyLCBidXQgaXQgcmV0dXJuZWQgYW4gZXJyb3JcbiAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ2h0dHAgZXJyb3IgJyArIHJlcXVlc3Quc3RhdHVzKTtcbiAgICAgIGVyci5zdGF0dXMgPSByZXF1ZXN0LnN0YXR1cztcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfVxuICB9O1xuXG4gIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGVycikge1xuICAgIC8vIFRoZXJlIHdhcyBhIGNvbm5lY3Rpb24gZXJyb3Igb2Ygc29tZSBzb3J0XG4gICAgaWYgKGNvbXBsZXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbXBsZXRlID0gdHJ1ZTtcbiAgICBjYWxsYmFjayhlcnIpO1xuICB9O1xuXG4gIGlmIChib2R5KSB7XG4gICAgcmVxdWVzdC5zZW5kKGJvZHkpO1xuICB9IGVsc2Uge1xuICAgIHJlcXVlc3Quc2VuZCgpO1xuICB9XG59O1xuXG5IdHRwSGFuZGxlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24odXJsLCBoZWFkZXJzLCBjYWxsYmFjaykge1xuICByZXR1cm4gdGhpcy5hamF4KCdHRVQnLCB1cmwsIGhlYWRlcnMsIG51bGwsIGNhbGxiYWNrKTtcbn07XG5cbkh0dHBIYW5kbGVyLnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbih1cmwsIGhlYWRlcnMsIGJvZHksIGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLmFqYXgoJ1BVVCcsIHVybCwgaGVhZGVycywgYm9keSwgY2FsbGJhY2spO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgSHR0cEhhbmRsZXIoKTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG52YXIgbWljcm9lZSA9IHJlcXVpcmUoJ21pY3JvZWUnKTtcbnZhciBkZWZhdWx0SHR0cEhhbmRsZXI7XG5cbmZ1bmN0aW9uIFJlc291cmNlU2hhZG93KG9wdGlvbnMpIHtcbiAgdGhpcy5sb2NhbEtleSA9IG9wdGlvbnMubG9jYWxLZXk7XG4gIHRoaXMudXJsID0gb3B0aW9ucy51cmw7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMubG9jYWxTdG9yYWdlID0gb3B0aW9ucy5sb2NhbFN0b3JhZ2UgfHwgbG9jYWxTdG9yYWdlO1xuICB0aGlzLmh0dHBIYW5kbGVyID0gb3B0aW9ucy5odHRwSGFuZGxlciB8fFxuICAgIChkZWZhdWx0SHR0cEhhbmRsZXIgPSBkZWZhdWx0SHR0cEhhbmRsZXIgfHwgcmVxdWlyZSgnLi9odHRwLWhhbmRsZXInKSk7XG4gIHRoaXMubG9hZCgpO1xuICB0aGlzLmxpc3RlbkZvclN0b3JhZ2VFdmVudCgpO1xufVxuXG5taWNyb2VlLm1peGluKFJlc291cmNlU2hhZG93KTtcblxuUmVzb3VyY2VTaGFkb3cuY3JlYXRlID0gZnVuY3Rpb24gcmVzb3VyY2VDcmVhdGUob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFJlc291cmNlU2hhZG93KG9wdGlvbnMpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24gcmVzb3VyY2VDaGFuZ2VBcHBseShjaGFuZ2VGbikge1xuICB2YXIgZGF0YSA9IHRoaXMuYmVmb3JlQXBwbHkoKTtcbiAgdHJ5IHtcbiAgICBkYXRhID0gY2hhbmdlRm4oZGF0YSkgfHwgZGF0YTtcbiAgfSBmaW5hbGx5IHtcbiAgICB0aGlzLmFmdGVyQXBwbHkoZGF0YSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5iZWZvcmVBcHBseSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5nZXRMb2NhbFN0b3JhZ2VWYWx1ZSgpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmFmdGVyQXBwbHkgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHRoaXMuc2V0TG9jYWxTdG9yYWdlVmFsdWUoZGF0YSk7XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG4gIHRoaXMuc2F2ZSgpO1xuICB0aGlzLm9uQ2hhbmdlKCk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5sb2FkaW5nIHx8IHRoaXMuc2F2aW5nKSB7XG4gICAgLy8gY2hhbmdlcyB3aWxsIGJlIGRldGVjdGVkIGF0IHRoZSBlbmQgb2YgY3VycmVudCBwcm9jZXNzXG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuc2F2ZVJlcXVlc3RlZCA9IGZhbHNlO1xuICBpZiAoIXRoaXMudXJsKSB7XG4gICAgLy8gbm8gcmVtb3RlIHVybCBmb3IgdGhpcyByZXNvdXJjZVxuICAgIHRoaXMub25TYXZlZCgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIganNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG4gIGlmICh0aGlzLnNoYWRvdyAhPT0ganNvbikge1xuICAgIC8vIHdlIGhhdmUgY2hhbmdlcyB0byBzYXZlXG4gICAgdGhpcy5zYXZpbmcgPSB0cnVlO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmh0dHBIYW5kbGVyLnB1dCh0aGlzLnVybCwgdGhpcy5odHRwSGVhZGVycygpLCBqc29uLCBmdW5jdGlvbihlcnIsIHNlcnZlckpzb24pIHtcbiAgICAgIHNlbGYuc2F2aW5nID0gZmFsc2U7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHNlbGYub25TYXZlRXJyb3IoZXJyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VsZi5vblNhdmVkKCk7XG4gICAgICBzZWxmLnByb2Nlc3NKc29uRnJvbVNlcnZlcihzZXJ2ZXJKc29uLCBqc29uKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm9uU2F2ZWQoKTtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxvYWRBbmRSZWJhc2UgPSBmdW5jdGlvbigpIHtcbiAgLy8gbG9hZCBmcm9tIHNlcnZlciwgYW5kIGNvbnNpZGVyIGFsbCBsb2NhbCBkYXRhIGFzIG1vc3QgcmVjZW50XG4gIC8vIG5vdGU6IHRoaXMgd2lsbCBjYXVzZSBhIDMtd2F5IG1lcmdlXG4gIHJldHVybiB0aGlzLmxvYWQoe30pO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihwcmVKc29uKSB7XG5cbiAgdmFyIGN1cnJlbnREYXRhSnNvbiA9IHRoaXMuc3RyaW5naWZ5KHRoaXMuZGF0YSk7XG4gIGlmICh0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpICE9PSBjdXJyZW50RGF0YUpzb24pIHtcbiAgICB0aGlzLmRhdGEgPSB0aGlzLmdldExvY2FsU3RvcmFnZVZhbHVlKCk7XG4gICAgdGhpcy5vbkNoYW5nZSgpO1xuICB9XG5cbiAgaWYgKHRoaXMubG9hZGluZyB8fCB0aGlzLnNhdmluZykge1xuICAgIC8vIGNoYW5nZXMgd2lsbCBiZSBkZXRlY3RlZCBhdCB0aGUgZW5kIG9mIGN1cnJlbnQgcHJvY2Vzc1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIGlmICghdGhpcy51cmwpIHtcbiAgICAvLyBubyByZW1vdGUgdXJsIGZvciB0aGlzIHJlc291cmNlXG4gICAgdGhpcy5vbkxvYWRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGpzb247XG4gIGlmIChwcmVKc29uKSB7XG4gICAganNvbiA9IHByZUpzb247XG4gICAgaWYgKHR5cGVvZiBqc29uICE9PSAnc3RyaW5nJykge1xuICAgICAganNvbiA9IHRoaXMuc3RyaW5naWZ5KGpzb24pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBqc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgfVxuXG4gIHRoaXMubG9hZGluZyA9IHRydWU7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5odHRwSGFuZGxlci5nZXQodGhpcy51cmwsIHRoaXMuaHR0cEhlYWRlcnMoKSwgZnVuY3Rpb24oZXJyLCBzZXJ2ZXJKc29uKSB7XG4gICAgc2VsZi5sb2FkaW5nID0gZmFsc2U7XG4gICAgaWYgKGVycikge1xuICAgICAgZXJyLmxvYWRBcmd1bWVudHMgPSBbcHJlSnNvbl07XG4gICAgICBzZWxmLm9uTG9hZEVycm9yKGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNlbGYucHJvY2Vzc0pzb25Gcm9tU2VydmVyKHNlcnZlckpzb24sIGpzb24pO1xuICAgIHNlbGYub25Mb2FkZWQoKTtcbiAgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnByb2Nlc3NKc29uRnJvbVNlcnZlciA9IGZ1bmN0aW9uKHNlcnZlckpzb24sIHByZUpzb24pIHtcbiAgdGhpcy5zaGFkb3cgPSBzZXJ2ZXJKc29uO1xuICB2YXIgbmV3SnNvbiA9IHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5sb2NhbEtleSk7XG5cbiAgaWYgKHNlcnZlckpzb24gIT09IHByZUpzb24pIHtcbiAgICAvLyBzZXJ2ZXIgY2hhbmdlc1xuICAgIHZhciBzYXZlQWdhaW4gPSBmYWxzZTtcbiAgICBpZiAocHJlSnNvbiAhPT0gbmV3SnNvbikge1xuICAgICAgLy8gY29uZmxpY3QhIGJvdGggc2VydmVyIGFuZCBsb2NhbCBjaGFuZ2VzIGhhcHBlbmVkXG4gICAgICBzZXJ2ZXJKc29uID0gdGhpcy50aHJlZVdheU1lcmdlKHByZUpzb24sIHNlcnZlckpzb24sIG5ld0pzb24pO1xuICAgICAgaWYgKHR5cGVvZiBzZXJ2ZXJKc29uID09PSAnb2JqZWN0Jykge1xuICAgICAgICBzZXJ2ZXJKc29uID0gdGhpcy5zdHJpbmdpZnkoc2VydmVySnNvbik7XG4gICAgICB9XG4gICAgICBzYXZlQWdhaW4gPSBzZXJ2ZXJKc29uICE9PSB0aGlzLnNoYWRvdztcbiAgICB9XG5cbiAgICB0cnkgIHtcbiAgICAgIHRoaXMuZGF0YSA9IHRoaXMucGFyc2Uoc2VydmVySnNvbik7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmRhdGEgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZVZhbHVlKHRoaXMuZGF0YSk7XG4gICAgdGhpcy5vbkNoYW5nZSgpO1xuXG4gICAgaWYgKHNhdmVBZ2Fpbikge1xuICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHByZUpzb24gIT09IG5ld0pzb24pIHtcbiAgICAvLyBvbmx5IGxvY2FsIGNoYW5nZXMsIHN0YXJ0IGEgbmV3IHNhdmVcbiAgICB0aGlzLnNhdmUoKTtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmxpc3RlbkZvclN0b3JhZ2VFdmVudCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5saXN0ZW5pbmdGb3JTdG9yYWdlRXZlbnQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoIXByb2Nlc3MuYnJvd3Nlcikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIoZWwsIGV2ZW50TmFtZSwgaGFuZGxlcikge1xuICAgIGlmIChlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlciwgZmFsc2UpO1xuICAgIH0gZWxzZSBpZiAoZWwuYXR0YWNoRXZlbnQpIHtcbiAgICAgIGVsLmF0dGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGZ1bmN0aW9uKCl7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkoZWwsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBoYW5kbGVyID0gZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleSA9PT0gc2VsZi5sb2NhbEtleSkge1xuICAgICAgc2VsZi5sb2FkKCk7XG4gICAgfVxuICB9O1xuXG4gIGFkZEV2ZW50TGlzdGVuZXIod2luZG93LCAnc3RvcmFnZScsIGhhbmRsZXIpO1xuICB0aGlzLmxpc3RlbmluZ0ZvclN0b3JhZ2VFdmVudCA9IHRydWU7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUudGhyZWVXYXlNZXJnZSA9IGZ1bmN0aW9uKG9yaWdpbmFsLCBzZXJ2ZXIsIGxvY2FsKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMudGhyZWVXYXlNZXJnZSkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMudGhyZWVXYXlNZXJnZS5jYWxsKHRoaXMsIG9yaWdpbmFsLCBzZXJ2ZXIsIGxvY2FsKTtcbiAgfVxuICAvLyBieSBkZWZhdWx0LCBsb2NhbCBhbHdheXMgd2luc1xuICByZXR1cm4gbG9jYWw7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihqc29uKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKGpzb24pO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnN0cmluZ2lmeSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmh0dHBIZWFkZXJzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm9wdGlvbnMuaGVhZGVycztcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vbkNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2NoYW5nZScsIHRoaXMuZGF0YSk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25TYXZlZCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ3NhdmVkJyk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25Mb2FkZWQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbWl0KCdsb2FkZWQnKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5zaG91bGRSZXRyeSA9IGZ1bmN0aW9uKGVycikge1xuICBpZiAodGhpcy5vcHRpb25zLnJldHJ5ID09PSBmYWxzZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoZXJyLnN0YXR1cyAmJlxuICAgIFtcbiAgICAgIC8vIHN0YXR1c2VzIHRoYXQgbWlnaHQgcmVwcmVzZW50IHRlbXBvcmFsIGZhaWx1cmVzXG4gICAgICA0MDgsIDQwOSwgNDEwLCA0MTksIDQyMCwgNDI5LCA1MDAsIDUwMixcbiAgICAgIDUwMywgNTA0LCA1MDksIDUyMSwgNTIyLCA1MjQsIDU5OCwgNTk5XG4gICAgICBdLmluZGV4T2YoZXJyLnN0YXR1cykgPCAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm9uU2F2ZUVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHRoaXMuc2hvdWxkUmV0cnkoZXJyKSkge1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLnNhdmUoKTtcbiAgICB9LCB0aGlzLm9wdGlvbnMucmV0cnlEZWxheSB8fCA1MDAwKTtcbiAgfVxuICB0aGlzLmVtaXQoJ3NhdmVlcnJvcicsIGVycik7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUub25Mb2FkRXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodGhpcy5zaG91bGRSZXRyeShlcnIpKSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYubG9hZC5hcHBseShzZWxmLCBlcnIubG9hZEFyZ3VtZW50cyk7XG4gICAgfSwgdGhpcy5vcHRpb25zLnJldHJ5RGVsYXkgfHwgNTAwMCk7XG4gIH1cbiAgdGhpcy5lbWl0KCdsb2FkZXJyb3InLCBlcnIpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnNldFVybCA9IGZ1bmN0aW9uKHVybCwgaGVhZGVycykge1xuICB0aGlzLnVybCA9IHVybDtcbiAgaWYgKGhlYWRlcnMpIHtcbiAgICB0aGlzLm9wdGlvbnMuaGVhZGVycyA9IGhlYWRlcnM7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuZ2V0TG9jYWxTdG9yYWdlVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGpzb24gPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpO1xuICBpZiAoanNvbiA9PT0gbnVsbCB8fCB0eXBlb2YganNvbiA9PT0gJ3VuZGVmaW5lZCcgfHwganNvbiA9PT0gJycpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICB0cnkge1xuICAgIHJldHVybiB0aGlzLnBhcnNlKGpzb24pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnNldExvY2FsU3RvcmFnZVZhbHVlID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIganNvbjtcbiAgaWYgKGRhdGEgPT09IG51bGwgfHwgdHlwZW9mIGRhdGEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAganNvbiA9IG51bGw7XG4gIH0gZWxzZSB7XG4gICAgdHJ5IHtcbiAgICAgIGpzb24gPSB0aGlzLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGpzb24gPSBudWxsO1xuICAgIH1cbiAgfVxuICB2YXIgcHJldmlvdXNKc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgaWYgKHByZXZpb3VzSnNvbiAhPT0ganNvbikge1xuICAgIGlmIChqc29uID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMubG9jYWxLZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2FsU3RvcmFnZS5zZXRJdGVtKHRoaXMubG9jYWxLZXksIGpzb24pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBqc29uO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXNvdXJjZVNoYWRvdztcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIl19
