!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.resourceShadow=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){

// global exports

var ResourceShadow = require('./resource-shadow');
exports.ResourceShadow = ResourceShadow;
exports.create = ResourceShadow.create;

if (process.browser) {
  // exports only for browser bundle
  exports.version = '1.0.0';
  exports.homepage = ',';
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

  this.data = this.getLocalStorageValue();

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
  this.emit('change');
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
  if (json === null) {
    this.localStorage.removeItem(this.localKey);
  } else {
    this.localStorage.setItem(this.localKey, json);
  }
  return json;
};

module.exports = ResourceShadow;

},{"./http-handler":4,"microee":3}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvbWFpbi5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L25vZGVfbW9kdWxlcy9maWJlcmdsYXNzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9ub2RlX21vZHVsZXMvbWljcm9lZS9pbmRleC5qcyIsIi9zb3VyY2UtZmlsZXMvcmVzb3VyY2Utc2hhZG93L3NyYy9odHRwLWhhbmRsZXIuanMiLCIvc291cmNlLWZpbGVzL3Jlc291cmNlLXNoYWRvdy9zcmMvcmVzb3VyY2Utc2hhZG93LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuXG4vLyBnbG9iYWwgZXhwb3J0c1xuXG52YXIgUmVzb3VyY2VTaGFkb3cgPSByZXF1aXJlKCcuL3Jlc291cmNlLXNoYWRvdycpO1xuZXhwb3J0cy5SZXNvdXJjZVNoYWRvdyA9IFJlc291cmNlU2hhZG93O1xuZXhwb3J0cy5jcmVhdGUgPSBSZXNvdXJjZVNoYWRvdy5jcmVhdGU7XG5cbmlmIChwcm9jZXNzLmJyb3dzZXIpIHtcbiAgLy8gZXhwb3J0cyBvbmx5IGZvciBicm93c2VyIGJ1bmRsZVxuICBleHBvcnRzLnZlcnNpb24gPSAne3twYWNrYWdlLXZlcnNpb259fSc7XG4gIGV4cG9ydHMuaG9tZXBhZ2UgPSAne3twYWNrYWdlLWhvbWVwYWdlfX0nO1xufSBlbHNlIHtcbiAgLy8gZXhwb3J0cyBvbmx5IGZvciBub2RlLmpzXG4gIHZhciBwYWNrYWdlSW5mbyA9IHJlcXVpcmUoJy4uL3BhY2snICsgJ2FnZS5qc29uJyk7XG4gIGV4cG9ydHMudmVyc2lvbiA9IHBhY2thZ2VJbmZvLnZlcnNpb247XG4gIGV4cG9ydHMuaG9tZXBhZ2UgPSBwYWNrYWdlSW5mby5ob21lcGFnZTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJmdW5jdGlvbiBNKCkgeyB0aGlzLl9ldmVudHMgPSB7fTsgfVxuTS5wcm90b3R5cGUgPSB7XG4gIG9uOiBmdW5jdGlvbihldiwgY2IpIHtcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICB2YXIgZSA9IHRoaXMuX2V2ZW50cztcbiAgICAoZVtldl0gfHwgKGVbZXZdID0gW10pKS5wdXNoKGNiKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlTGlzdGVuZXI6IGZ1bmN0aW9uKGV2LCBjYikge1xuICAgIHZhciBlID0gdGhpcy5fZXZlbnRzW2V2XSB8fCBbXSwgaTtcbiAgICBmb3IoaSA9IGUubGVuZ3RoLTE7IGkgPj0gMCAmJiBlW2ldOyBpLS0pe1xuICAgICAgaWYoZVtpXSA9PT0gY2IgfHwgZVtpXS5jYiA9PT0gY2IpIHsgZS5zcGxpY2UoaSwgMSk7IH1cbiAgICB9XG4gIH0sXG4gIHJlbW92ZUFsbExpc3RlbmVyczogZnVuY3Rpb24oZXYpIHtcbiAgICBpZighZXYpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cbiAgICBlbHNlIHsgdGhpcy5fZXZlbnRzW2V2XSAmJiAodGhpcy5fZXZlbnRzW2V2XSA9IFtdKTsgfVxuICB9LFxuICBlbWl0OiBmdW5jdGlvbihldikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgaSwgZSA9IHRoaXMuX2V2ZW50c1tldl0gfHwgW107XG4gICAgZm9yKGkgPSBlLmxlbmd0aC0xOyBpID49IDAgJiYgZVtpXTsgaS0tKXtcbiAgICAgIGVbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB3aGVuOiBmdW5jdGlvbihldiwgY2IpIHtcbiAgICByZXR1cm4gdGhpcy5vbmNlKGV2LCBjYiwgdHJ1ZSk7XG4gIH0sXG4gIG9uY2U6IGZ1bmN0aW9uKGV2LCBjYiwgd2hlbikge1xuICAgIGlmKCFjYikgcmV0dXJuIHRoaXM7XG4gICAgZnVuY3Rpb24gYygpIHtcbiAgICAgIGlmKCF3aGVuKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2LCBjKTtcbiAgICAgIGlmKGNiLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgJiYgd2hlbikgdGhpcy5yZW1vdmVMaXN0ZW5lcihldiwgYyk7XG4gICAgfVxuICAgIGMuY2IgPSBjYjtcbiAgICB0aGlzLm9uKGV2LCBjKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcbk0ubWl4aW4gPSBmdW5jdGlvbihkZXN0KSB7XG4gIHZhciBvID0gTS5wcm90b3R5cGUsIGs7XG4gIGZvciAoayBpbiBvKSB7XG4gICAgby5oYXNPd25Qcm9wZXJ0eShrKSAmJiAoZGVzdC5wcm90b3R5cGVba10gPSBvW2tdKTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gTTtcbiIsIlxuZnVuY3Rpb24gSHR0cEhhbmRsZXIoKSB7XG59XG5cbkh0dHBIYW5kbGVyLnByb3RvdHlwZS5hamF4ID0gZnVuY3Rpb24obWV0aG9kLCB1cmwsIGhlYWRlcnMsIGJvZHksIGNhbGxiYWNrKSB7XG5cbiAgLy8gc2ltcGxlIGJyb3dzZXIgaW1wbGVtZW50YXRpb25cbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcbiAgaWYgKGJvZHkpIHtcbiAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04Jyk7XG4gIH1cbiAgaWYgKGhlYWRlcnMpIHtcbiAgICBmb3IgKHZhciBoZWFkZXIgaW4gaGVhZGVycykge1xuICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlciwgaGVhZGVyc1toZWFkZXJdKTtcbiAgICB9XG4gIH1cblxuICB2YXIgZGF0YTtcbiAgdmFyIGNvbXBsZXRlID0gZmFsc2U7XG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKGNvbXBsZXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbXBsZXRlID0gdHJ1ZTtcbiAgICBpZiAocmVxdWVzdC5zdGF0dXMgPj0gMjAwICYmIHJlcXVlc3Quc3RhdHVzIDwgNDAwKSB7XG4gICAgICAvLyBTdWNjZXNzIVxuICAgICAgZGF0YSA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xuICAgICAgY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFdlIHJlYWNoZWQgb3VyIHRhcmdldCBzZXJ2ZXIsIGJ1dCBpdCByZXR1cm5lZCBhbiBlcnJvclxuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignaHR0cCBlcnJvciAnICsgcmVxdWVzdC5zdGF0dXMpO1xuICAgICAgZXJyLnN0YXR1cyA9IHJlcXVlc3Quc3RhdHVzO1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgLy8gVGhlcmUgd2FzIGEgY29ubmVjdGlvbiBlcnJvciBvZiBzb21lIHNvcnRcbiAgICBpZiAoY29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29tcGxldGUgPSB0cnVlO1xuICAgIGNhbGxiYWNrKGVycik7XG4gIH07XG5cbiAgaWYgKGJvZHkpIHtcbiAgICByZXF1ZXN0LnNlbmQoYm9keSk7XG4gIH0gZWxzZSB7XG4gICAgcmVxdWVzdC5zZW5kKCk7XG4gIH1cbn07XG5cbkh0dHBIYW5kbGVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbih1cmwsIGhlYWRlcnMsIGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLmFqYXgoJ0dFVCcsIHVybCwgaGVhZGVycywgbnVsbCwgY2FsbGJhY2spO1xufTtcblxuSHR0cEhhbmRsZXIucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uKHVybCwgaGVhZGVycywgYm9keSwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuYWpheCgnUFVUJywgdXJsLCBoZWFkZXJzLCBib2R5LCBjYWxsYmFjayk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBIdHRwSGFuZGxlcigpO1xuIiwidmFyIG1pY3JvZWUgPSByZXF1aXJlKCdtaWNyb2VlJyk7XG52YXIgZGVmYXVsdEh0dHBIYW5kbGVyO1xuXG5mdW5jdGlvbiBSZXNvdXJjZVNoYWRvdyhvcHRpb25zKSB7XG4gIHRoaXMubG9jYWxLZXkgPSBvcHRpb25zLmxvY2FsS2V5O1xuICB0aGlzLnVybCA9IG9wdGlvbnMudXJsO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB0aGlzLmxvY2FsU3RvcmFnZSA9IG9wdGlvbnMubG9jYWxTdG9yYWdlIHx8IGxvY2FsU3RvcmFnZTtcbiAgdGhpcy5odHRwSGFuZGxlciA9IG9wdGlvbnMuaHR0cEhhbmRsZXIgfHxcbiAgICAoZGVmYXVsdEh0dHBIYW5kbGVyID0gZGVmYXVsdEh0dHBIYW5kbGVyIHx8IHJlcXVpcmUoJy4vaHR0cC1oYW5kbGVyJykpO1xuICB0aGlzLmxvYWQoKTtcbn1cblxubWljcm9lZS5taXhpbihSZXNvdXJjZVNoYWRvdyk7XG5cblJlc291cmNlU2hhZG93LmNyZWF0ZSA9IGZ1bmN0aW9uIHJlc291cmNlQ3JlYXRlKG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBSZXNvdXJjZVNoYWRvdyhvcHRpb25zKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uIHJlc291cmNlQ2hhbmdlQXBwbHkoY2hhbmdlRm4pIHtcbiAgdmFyIGRhdGEgPSB0aGlzLmJlZm9yZUFwcGx5KCk7XG4gIHRyeSB7XG4gICAgZGF0YSA9IGNoYW5nZUZuKGRhdGEpIHx8IGRhdGE7XG4gIH0gZmluYWxseSB7XG4gICAgdGhpcy5hZnRlckFwcGx5KGRhdGEpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuYmVmb3JlQXBwbHkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZ2V0TG9jYWxTdG9yYWdlVmFsdWUoKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5hZnRlckFwcGx5ID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnNldExvY2FsU3RvcmFnZVZhbHVlKGRhdGEpO1xuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLnNhdmUoKTtcbiAgdGhpcy5vbkNoYW5nZSgpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMubG9hZGluZyB8fCB0aGlzLnNhdmluZykge1xuICAgIC8vIGNoYW5nZXMgd2lsbCBiZSBkZXRlY3RlZCBhdCB0aGUgZW5kIG9mIGN1cnJlbnQgcHJvY2Vzc1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnNhdmVSZXF1ZXN0ZWQgPSBmYWxzZTtcbiAgaWYgKCF0aGlzLnVybCkge1xuICAgIC8vIG5vIHJlbW90ZSB1cmwgZm9yIHRoaXMgcmVzb3VyY2VcbiAgICB0aGlzLm9uU2F2ZWQoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGpzb24gPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpO1xuICBpZiAodGhpcy5zaGFkb3cgIT09IGpzb24pIHtcbiAgICAvLyB3ZSBoYXZlIGNoYW5nZXMgdG8gc2F2ZVxuICAgIHRoaXMuc2F2aW5nID0gdHJ1ZTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5odHRwSGFuZGxlci5wdXQodGhpcy51cmwsIHRoaXMuaHR0cEhlYWRlcnMoKSwganNvbiwgZnVuY3Rpb24oZXJyLCBzZXJ2ZXJKc29uKSB7XG4gICAgICBzZWxmLnNhdmluZyA9IGZhbHNlO1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBzZWxmLm9uU2F2ZUVycm9yKGVycik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlbGYub25TYXZlZCgpO1xuICAgICAgc2VsZi5wcm9jZXNzSnNvbkZyb21TZXJ2ZXIoc2VydmVySnNvbiwganNvbik7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5vblNhdmVkKCk7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5sb2FkQW5kUmViYXNlID0gZnVuY3Rpb24oKSB7XG4gIC8vIGxvYWQgZnJvbSBzZXJ2ZXIsIGFuZCBjb25zaWRlciBhbGwgbG9jYWwgZGF0YSBhcyBtb3N0IHJlY2VudFxuICAvLyBub3RlOiB0aGlzIHdpbGwgY2F1c2UgYSAzLXdheSBtZXJnZVxuICByZXR1cm4gdGhpcy5sb2FkKHt9KTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24ocHJlSnNvbikge1xuXG4gIHRoaXMuZGF0YSA9IHRoaXMuZ2V0TG9jYWxTdG9yYWdlVmFsdWUoKTtcblxuICBpZiAodGhpcy5sb2FkaW5nIHx8IHRoaXMuc2F2aW5nKSB7XG4gICAgLy8gY2hhbmdlcyB3aWxsIGJlIGRldGVjdGVkIGF0IHRoZSBlbmQgb2YgY3VycmVudCBwcm9jZXNzXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgaWYgKCF0aGlzLnVybCkge1xuICAgIC8vIG5vIHJlbW90ZSB1cmwgZm9yIHRoaXMgcmVzb3VyY2VcbiAgICB0aGlzLm9uTG9hZGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIganNvbjtcbiAgaWYgKHByZUpzb24pIHtcbiAgICBqc29uID0gcHJlSnNvbjtcbiAgICBpZiAodHlwZW9mIGpzb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICBqc29uID0gdGhpcy5zdHJpbmdpZnkoanNvbik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGpzb24gPSB0aGlzLmxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMubG9jYWxLZXkpO1xuICB9XG5cbiAgdGhpcy5sb2FkaW5nID0gdHJ1ZTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmh0dHBIYW5kbGVyLmdldCh0aGlzLnVybCwgdGhpcy5odHRwSGVhZGVycygpLCBmdW5jdGlvbihlcnIsIHNlcnZlckpzb24pIHtcbiAgICBzZWxmLmxvYWRpbmcgPSBmYWxzZTtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBlcnIubG9hZEFyZ3VtZW50cyA9IFtwcmVKc29uXTtcbiAgICAgIHNlbGYub25Mb2FkRXJyb3IoZXJyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5wcm9jZXNzSnNvbkZyb21TZXJ2ZXIoc2VydmVySnNvbiwganNvbik7XG4gICAgc2VsZi5vbkxvYWRlZCgpO1xuICB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUucHJvY2Vzc0pzb25Gcm9tU2VydmVyID0gZnVuY3Rpb24oc2VydmVySnNvbiwgcHJlSnNvbikge1xuICB0aGlzLnNoYWRvdyA9IHNlcnZlckpzb247XG4gIHZhciBuZXdKc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcblxuICBpZiAoc2VydmVySnNvbiAhPT0gcHJlSnNvbikge1xuICAgIC8vIHNlcnZlciBjaGFuZ2VzXG4gICAgdmFyIHNhdmVBZ2FpbiA9IGZhbHNlO1xuICAgIGlmIChwcmVKc29uICE9PSBuZXdKc29uKSB7XG4gICAgICAvLyBjb25mbGljdCEgYm90aCBzZXJ2ZXIgYW5kIGxvY2FsIGNoYW5nZXMgaGFwcGVuZWRcbiAgICAgIHNlcnZlckpzb24gPSB0aGlzLnRocmVlV2F5TWVyZ2UocHJlSnNvbiwgc2VydmVySnNvbiwgbmV3SnNvbik7XG4gICAgICBpZiAodHlwZW9mIHNlcnZlckpzb24gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHNlcnZlckpzb24gPSB0aGlzLnN0cmluZ2lmeShzZXJ2ZXJKc29uKTtcbiAgICAgIH1cbiAgICAgIHNhdmVBZ2FpbiA9IHNlcnZlckpzb24gIT09IHRoaXMuc2hhZG93O1xuICAgIH1cblxuICAgIHRyeSAge1xuICAgICAgdGhpcy5kYXRhID0gdGhpcy5wYXJzZShzZXJ2ZXJKc29uKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuZGF0YSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlVmFsdWUodGhpcy5kYXRhKTtcbiAgICB0aGlzLm9uQ2hhbmdlKCk7XG5cbiAgICBpZiAoc2F2ZUFnYWluKSB7XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocHJlSnNvbiAhPT0gbmV3SnNvbikge1xuICAgIC8vIG9ubHkgbG9jYWwgY2hhbmdlcywgc3RhcnQgYSBuZXcgc2F2ZVxuICAgIHRoaXMuc2F2ZSgpO1xuICB9XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUudGhyZWVXYXlNZXJnZSA9IGZ1bmN0aW9uKG9yaWdpbmFsLCBzZXJ2ZXIsIGxvY2FsKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMudGhyZWVXYXlNZXJnZSkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMudGhyZWVXYXlNZXJnZS5jYWxsKHRoaXMsIG9yaWdpbmFsLCBzZXJ2ZXIsIGxvY2FsKTtcbiAgfVxuICAvLyBieSBkZWZhdWx0LCBsb2NhbCBhbHdheXMgd2luc1xuICByZXR1cm4gbG9jYWw7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihqc29uKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKGpzb24pO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLnN0cmluZ2lmeSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmh0dHBIZWFkZXJzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm9wdGlvbnMuaGVhZGVycztcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vbkNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm9uU2F2ZWQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbWl0KCdzYXZlZCcpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm9uTG9hZGVkID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW1pdCgnbG9hZGVkJyk7XG59O1xuXG5SZXNvdXJjZVNoYWRvdy5wcm90b3R5cGUuc2hvdWxkUmV0cnkgPSBmdW5jdGlvbihlcnIpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5yZXRyeSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGVyci5zdGF0dXMgJiZcbiAgICBbXG4gICAgICAvLyBzdGF0dXNlcyB0aGF0IG1pZ2h0IHJlcHJlc2VudCB0ZW1wb3JhbCBmYWlsdXJlc1xuICAgICAgNDA4LCA0MDksIDQxMCwgNDE5LCA0MjAsIDQyOSwgNTAwLCA1MDIsXG4gICAgICA1MDMsIDUwNCwgNTA5LCA1MjEsIDUyMiwgNTI0LCA1OTgsIDU5OVxuICAgICAgXS5pbmRleE9mKGVyci5zdGF0dXMpIDwgMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5vblNhdmVFcnJvciA9IGZ1bmN0aW9uKGVycikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0aGlzLnNob3VsZFJldHJ5KGVycikpIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5zYXZlKCk7XG4gICAgfSwgdGhpcy5vcHRpb25zLnJldHJ5RGVsYXkgfHwgNTAwMCk7XG4gIH1cbiAgdGhpcy5lbWl0KCdzYXZlZXJyb3InLCBlcnIpO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLm9uTG9hZEVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHRoaXMuc2hvdWxkUmV0cnkoZXJyKSkge1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmxvYWQuYXBwbHkoc2VsZiwgZXJyLmxvYWRBcmd1bWVudHMpO1xuICAgIH0sIHRoaXMub3B0aW9ucy5yZXRyeURlbGF5IHx8IDUwMDApO1xuICB9XG4gIHRoaXMuZW1pdCgnbG9hZGVycm9yJywgZXJyKTtcbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5zZXRVcmwgPSBmdW5jdGlvbih1cmwsIGhlYWRlcnMpIHtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIGlmIChoZWFkZXJzKSB7XG4gICAgdGhpcy5vcHRpb25zLmhlYWRlcnMgPSBoZWFkZXJzO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVzb3VyY2VTaGFkb3cucHJvdG90eXBlLmdldExvY2FsU3RvcmFnZVZhbHVlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBqc29uID0gdGhpcy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmxvY2FsS2V5KTtcbiAgaWYgKGpzb24gPT09IG51bGwgfHwgdHlwZW9mIGpzb24gPT09ICd1bmRlZmluZWQnIHx8IGpzb24gPT09ICcnKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgdHJ5IHtcbiAgICByZXR1cm4gdGhpcy5wYXJzZShqc29uKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cblJlc291cmNlU2hhZG93LnByb3RvdHlwZS5zZXRMb2NhbFN0b3JhZ2VWYWx1ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdmFyIGpzb247XG4gIGlmIChkYXRhID09PSBudWxsIHx8IHR5cGVvZiBkYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgIGpzb24gPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBqc29uID0gdGhpcy5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBqc29uID0gbnVsbDtcbiAgICB9XG4gIH1cbiAgaWYgKGpzb24gPT09IG51bGwpIHtcbiAgICB0aGlzLmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMubG9jYWxLZXkpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5sb2NhbEtleSwganNvbik7XG4gIH1cbiAgcmV0dXJuIGpzb247XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc291cmNlU2hhZG93O1xuIl19
