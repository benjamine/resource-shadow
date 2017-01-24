var microee = require('microee');
var defaultHttpHandler;
var defaultLocalStorageObserver;

function ResourceShadow(options) {
  this.data = {};
  this.localKey = options.localKey;
  this.url = options.url;
  this.options = options;
  this.online = options.online === true ||
    ((!!options.url) && options.online !== false);
  this.saveMethod = /^post$/i.test(options.saveMethod) ? 'post' : 'put';
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

  if (!this.online || !this.url) {
    this.onSaved();
    return;
  }
  var json = this.localStorage.getItem(this.localKey);
  if (this.shadow !== json) {
    // we have changes to save
    this.saving = true;
    var self = this;
    this.httpHandler[this.saveMethod](this.url, this.httpHeaders(), json, function(err, serverJson) {
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
  if (!this.online || !this.url) {
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
    if (source && typeof source[name] === 'undefined') {
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

ResourceShadow.prototype.goOnline = function(url, saveMethod, headers) {
  if (url) {
    this.url = url;
  }
  if (typeof saveMethod === 'string') {
    this.saveMethod = /post/i.test(saveMethod) ? 'post' : 'put';
  } else {
    this.saveMethod = 'put';
    headers = saveMethod;
  }
  if (headers) {
    this.options.headers = headers;
  }
  this.online = true;
  return this;
};

ResourceShadow.prototype.reset = function(data) {
  if (this.loading || this.saving) {
    this.discardNextServerResponse = true;
  }
  this.online = false;
  this.saveMethod = 'put';
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
