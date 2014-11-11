
function MockHttpHandler() {
  this.resources = {};
  this.latency = 2;
  this.nextErrors = [];
}

MockHttpHandler.prototype.get = function(url, headers, callback) {
  var self = this;
  setTimeout(function() {
    if (self.nextErrors.length) {
      var err = self.nextErrors.shift();
      callback(err);
      return;
    }
    callback(null, self.resources[url]);
  }, this.latency);
};

MockHttpHandler.prototype.put = function(url, headers, body, callback) {
  var self = this;
  setTimeout(function() {
    if (self.nextErrors.length) {
      var err = self.nextErrors.shift();
      callback(err);
      return;
    }
    self.resources[url] = body;
    setTimeout(function() {
      callback(null, self.resources[url]);
    }, this.latency);
  }, this.latency);
};

module.exports = MockHttpHandler;
