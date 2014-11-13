
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
