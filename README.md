ResourceShadow
==============

[![Build Status](https://secure.travis-ci.org/benjamine/resource-shadow.png)](http://travis-ci.org/benjamine/resource-shadow)
[![Code Climate](https://codeclimate.com/github/benjamine/resource-shadow/badges/gpa.svg)](https://codeclimate.com/github/benjamine/resource-shadow)
[![Test Coverage](https://codeclimate.com/github/benjamine/resource-shadow/badges/coverage.svg)](https://codeclimate.com/github/benjamine/resource-shadow)
[![NPM version](https://badge.fury.io/js/resource-shadow.png)](http://badge.fury.io/js/resource-shadow)
[![NPM dependencies](https://david-dm.org/benjamine/resource-shadow.png)](https://david-dm.org/benjamine/resource-shadow)
[![Bower version](https://badge.fury.io/bo/resource-shadow.png)](http://badge.fury.io/bo/resource-shadow)

keep a synchronized copy of a remote http resource.
Modify freely and changes will be synced in the background automatically.

- modify the local copy without blocking I/O (don't make users wait for a server response)
- localStorage is used to keep realtime sync with other frames/tabs/windows in same domain
- saving/loading to remote http server is done in the background
- works in offline mode (only localStorage), switch to online mode (http) at any time
- custom 3-way merge is supported (used when both local and server versions were modified)
- retries (with a delay) on timeout or other network errors

Usage
-----

``` js
  // will load it from localStorage if exists
  var preferences = resourceShadow.create({ localKey: 'preferences'});

  // make changes offline using .apply (no async callbacks!)
  preferences.apply(function(data){
    data.color = 'red';
  });

  // change was immediately persisted to localStorage

  // go online
  preferences.setUrl('http://myhost/user/' + currentUser.id + '/preferences').load();

  // value from server is loading

  // you can make changes without waiting
  // just beware that might trigger a 3-way merge (by default local wins)
  preferences.apply(function(data){
    data.color = 'blue';
  });

  // you can wait using events
  preferences.once('loaded', function(data){
    data.color = 'blue';
  });

  // you can load server-side changes at any time
  setTimeout(function(){
    preferences.load();
  }, 3000);


  // custom 3-way merge
  preferences.options.threeWayMerge = function(originalJson, serverJson, localJson) {
    // using a naive object properties merge (check lodash .merge)
    return _.merge({},
      JSON.parse(originalJson),
      JSON.parse(serverJson),
      JSON.parse(localJson));
  });

  // using load and "rebase"
  var preferences = resourceShadow.create({ localKey: 'preferences2'});
  preferences.apply(function(){
    return { someInitialLocal: 'values' }
  });

  // will load server value, and apply local value on top of it (using 3 way merge)
  // the result will be as if local version were created *after* (or on top) of server version
  preferences.loadAndRebase();
```

Supported Platforms
---------

- IE9+ and modern browsers

visit [test page](http://benjamine.github.io/resource-shadow/test/index.html) to test your current browser.
