
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

HttpHandler.prototype.post = function(url, headers, body, callback) {
  return this.ajax('POST', url, headers, body, callback);
};

module.exports = new HttpHandler();
