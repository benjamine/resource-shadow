/*
* mocha's bdd syntax is inspired in RSpec
*   please read: http://betterspecs.org/
*/
require('./util/globals');
var MockLocalStorage = require('./util/mocks/local-storage');
var MockHttpHandler = require('./util/mocks/http-handler');

describe('resourceShadow', function() {
  it('has a semver version', function() {
    expect(resourceShadow.version).to.match(/^\d+\.\d+\.\d+(-.*)?$/);
  });

  beforeEach(function() {
    this.resourceUrl = 'https://localhost:8181/test-resource1';
    this.resourceLocalKey = 'test-resource1';
    this.resource = resourceShadow.create({
      localKey: this.resourceLocalKey,
      localStorage: new MockLocalStorage(),
      httpHandler: new MockHttpHandler(),
      retryDelay: 2,
    });

    // .threeWayMerge spy
    this.resource.options.threeWayMerge = function(original, server, local) {
      var versions = {
        original: original && JSON.parse(original),
        server: server && JSON.parse(server),
        local: local && JSON.parse(local)
      };

      // this === resource being merged
      this.threeWayMergeCalledWith = versions;
      var result = {};
      var name;
      // perform a dumb additive merge at property level,
      // on conflict local wins
      for (name in versions.original) {
        result[name] = versions.original[name];
      }
      for (name in versions.server) {
        result[name] = versions.server[name];
      }
      for (name in versions.local) {
        result[name] = versions.local[name];
      }
      result.mergeCount = 1 + (result.mergeCount || 0);
      return result;
    };
  });

  when('starts offline', function() {
    it('value is undefined', function() {
      expect(this.resource.value).to.be(undefined);
    });

    when('setting a first value', function() {
      beforeEach(function() {
        var firstValue = this.firstValue = { aNewProperty: 'and new value' };
        this.resource.apply(function() {
          return firstValue;
        });
      });
      it('gets saved to local storage', function() {
        var found = JSON.parse(this.resource.localStorage.values[this.resourceLocalKey]);
        expect(found).to.eql(this.firstValue);
      });
      it('becomes resource.data', function() {
        var found = this.resource.data;
        expect(found).to.eql(this.firstValue);
      });
    });

    when('modifying the value', function() {
      beforeEach(function() {
        var firstValue = this.firstValue = { aNewProperty: 'and new value' };
        this.resource.apply(function() {
          return firstValue;
        });
        this.resource.apply(function(data) {
          data.aSecondProperty = 'a second value';
        });
      });
      it('gets saved to local storage', function() {
        var found = JSON.parse(this.resource.localStorage.values[this.resourceLocalKey]);
        expect(found).to.eql({
          aNewProperty: 'and new value',
          aSecondProperty: 'a second value'
        });
      });
      it('becomes resource.data', function() {
        var found = this.resource.data;
        expect(found).to.eql({
          aNewProperty: 'and new value',
          aSecondProperty: 'a second value'
        });
      });
    });

    when('the value is also modified in a same-domain frame', function() {
      beforeEach(function() {
        var firstValue = this.firstValue = { aNewProperty: 'and new value' };
        this.resource.apply(function() {
          return firstValue;
        });

        // change done in another same-domain frame (eg. another tab or window)
        var otherFrameValue = JSON.parse(this.resource.localStorage.values[this.resourceLocalKey]);
        otherFrameValue.addedInAnotherFrame = 'some value';
        this.resource.localStorage.values[this.resourceLocalKey] = JSON.stringify(otherFrameValue);

      });
      it('new version gets loaded using .load()', function() {
        this.resource.load();
        expect(this.resource.data).to.eql({
          aNewProperty: 'and new value',
          addedInAnotherFrame: 'some value'
        });
      });
      it('making a second change doesn\'t cause data loss', function() {
        this.resource.apply(function(data) {
          data.aSecondProperty = 'a second value';
        });
        expect(this.resource.data).to.eql({
          aNewProperty: 'and new value',
          addedInAnotherFrame: 'some value',
          aSecondProperty: 'a second value'
        });
      });
    });

    when('going online', function() {
      beforeEach(function() {
        this.serverValue = { propertySetOnServer: 'server-side value' };
        this.resource.httpHandler.resources[this.resourceUrl] = JSON.stringify(this.serverValue);
        this.resource.setUrl(this.resourceUrl);
      });
      when('load is complete', function() {
        beforeEach(function(done) {
          this.resource.load().once('loaded', function() {
            done();
          });
        });
        it('data matches server data', function() {
          expect(this.resource.data).to.eql(this.serverValue);
        });
      });
      when('local changed while loading', function() {
        beforeEach(function(done) {
          var self = this;

          this.resource.load().once('loaded', function() {
            done();
          });

          self.localValue = { iAddedThisLocally: 'while loading from server' };
          this.resource.apply(function() {
            return self.localValue;
          });

        });
        it('3-way merge is used', function() {
          expect(this.resource.threeWayMergeCalledWith).to.eql({
            original: undefined,
            server: this.serverValue,
            local: this.localValue
          });
          var expectedMergeResult = {
            propertySetOnServer: 'server-side value',
            iAddedThisLocally: 'while loading from server',
            mergeCount: 1
          };
          expect(this.resource.data).to.eql(expectedMergeResult);
        });
      });
      when('load fails with timeout', function() {
        beforeEach(function(done) {

          // timeout error for the next 3 times
          var nextError = new Error('timeout');
          nextError.timeout = true;
          this.resource.httpHandler.nextErrors.push(nextError);
          this.resource.httpHandler.nextErrors.push(nextError);
          this.resource.httpHandler.nextErrors.push(nextError);

          var errorCount = 0;
          this.resource.load().on('loaderror', function(err) {
            expect(err.timeout).to.be(true);
            errorCount++;
            if (errorCount >= 3) {
              done();
            }
          });

        });
        it('retries until succeeds', function(done) {
          var self = this;
          this.resource.once('loaded', function(){
            expect(self.resource.data).to.eql(self.serverValue);
            done();
          });
        });
      });

      when('load fails with 403 unauthorized', function() {
        beforeEach(function() {

          // 403 next time
          var nextError = new Error('unauthorized');
          nextError.status = 403;
          this.resource.httpHandler.nextErrors.push(nextError);

        });
        it('won\'t retry', function(done) {
          this.resource.load().on('loaderror', function(err) {
            expect(err.status).to.be(403);
            done();
          }).on('loaded', function() {
            done(new Error('shouldn\'t have loaded'));
          });
        });
      });

    });

    when('going online, rebasing local changes', function() {
      beforeEach(function(done) {
        this.serverValue = { propertySetOnServer: 'server-side value' };
        this.resource.httpHandler.resources[this.resourceUrl] = JSON.stringify(this.serverValue);

        var self = this;

        this.localValue = { iAddedThisLocally: 'before loading from server' };
        this.resource.apply(function() {
          return self.localValue;
        });

        this.resource.setUrl(this.resourceUrl).loadAndRebase().once('loaded', function() {
          done();
        });
      });
      it('3-way merge is used', function() {
        expect(this.resource.threeWayMergeCalledWith).to.eql({
          original: {},
          server: this.serverValue,
          local: this.localValue
        });
        var expectedMergeResult = {
          propertySetOnServer: 'server-side value',
          iAddedThisLocally: 'before loading from server',
          mergeCount: 1
        };
        expect(this.resource.data).to.eql(expectedMergeResult);
      });
    });

  });

  when('starts online', function() {
    beforeEach(function(done) {
      this.serverValue = { propertySetOnServer: 'server-side value' };
      this.resource.httpHandler.resources[this.resourceUrl] = JSON.stringify(this.serverValue);
      this.resource.setUrl(this.resourceUrl).load().once('loaded', function() {
        done();
      });
    });
    it('server value gets loaded', function() {
      expect(this.resource.data).to.eql(this.serverValue);
    });
    when('local changes while loading without server changes', function(){
      it('local changes get saved', function(done){
        var self = this;
        this.resource.load();
        this.resource.apply(function(data){
          data.thisWasAddedLocallyWhile = 'loading from server';
          expect(self.resource.loading).to.be(true);
        }).once('saved', function(){
          expect(self.resource.data).to.eql({
            propertySetOnServer: 'server-side value',
            thisWasAddedLocallyWhile: 'loading from server'
          });
          done();
        });
      });
    });

    when('save fails with timeout', function() {
      beforeEach(function(done) {

        // timeout error for the next 3 times
        var nextError = new Error('timeout');
        nextError.timeout = true;
        this.resource.httpHandler.nextErrors.push(nextError);
        this.resource.httpHandler.nextErrors.push(nextError);
        this.resource.httpHandler.nextErrors.push(nextError);

        var errorCount = 0;

        this.resource.apply(function(data){
          data.addedLocally = 'please save me!';
        }).on('saveerror', function(err) {
          expect(err.timeout).to.be(true);
          errorCount++;
          if (errorCount >= 3) {
            done();
          }
        });
      });
      it('retries until succeeds', function(done) {
        var self = this;
        this.resource.once('saved', function(){
          var found = JSON.parse(self.resource.httpHandler.resources[self.resourceUrl]);
          expect(found).to.eql({
            propertySetOnServer: 'server-side value',
            addedLocally: 'please save me!'
          });
          done();
        });
      });
    });

    when('save fails with 403 unauthorized', function() {
      beforeEach(function() {

        // 403 next time
        var nextError = new Error('unauthorized');
        nextError.status = 403;
        this.resource.httpHandler.nextErrors.push(nextError);

      });
      it('won\'t retry', function(done) {

        this.resource.apply(function(data){
          data.addedLocally = 'please save me!';
        }).on('saveerror', function(err) {
          expect(err.status).to.be(403);
          done();
        }).on('saved', function() {
          done(new Error('shouldn\'t have saved'));
        });
      });
    });

  });

});
