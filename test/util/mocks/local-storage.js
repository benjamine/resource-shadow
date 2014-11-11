
function MockLocalStorage() {
  this.values = {};
}

MockLocalStorage.prototype.setItem = function(key, value) {
  this.values[key] = value;
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

module.exports = MockLocalStorage;
