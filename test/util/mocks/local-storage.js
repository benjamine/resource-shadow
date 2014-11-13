
function MockLocalStorage() {
  this.values = {};
  this.listeners = {};
}

MockLocalStorage.prototype.setItem = function(key, value) {
  this.values[key] = value;
  var listeners = this.listeners[key];
  if (!listeners) {
    return;
  }
  listeners.forEach(function(handler) {
    handler();
  });
};

MockLocalStorage.prototype.getItem = function(key) {
  return this.values[key];
};

MockLocalStorage.prototype.removeItem = function(key) {
  delete this.values[key];
};

MockLocalStorage.prototype.clear = function() {
  this.values = {};
};

MockLocalStorage.prototype.onKeyChange = function(key, handler) {
  var listeners = this.listeners[key] || (this.listeners[key] = []);
  listeners.push(handler);
};

module.exports = MockLocalStorage;
