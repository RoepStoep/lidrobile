(function() {
  function noop() {}

  if (!window.AndroidFullScreen) {
    window.AndroidFullScreen = {};
    window.AndroidFullScreen.showSystemUI = noop;
    window.AndroidFullScreen.immersiveMode = noop;
  }

  if (!window.Scan) {
    var scanWorker;
    window.Scan = {
      init: function() {
        return new Promise(function(resolve) {
          if (scanWorker) {
            setTimeout(resolve);
          } else {
            scanWorker = new Worker('../scan.js');
            setTimeout(resolve, 10);
          }
        });
      },
      cmd: function(cmd) {
        return new Promise(function(resolve) {
          if (scanWorker) scanWorker.postMessage(cmd);
          setTimeout(resolve, 1);
        });
      },
      output: function(callback) {
        if (scanWorker) {
          scanWorker.onmessage = msg => {
            callback(msg.data);
          };
        }
      },
      exit: function() {
        return new Promise(function(resolve) {
          if (scanWorker) {
            scanWorker.terminate();
            scanWorker = null;
          }
          setTimeout(resolve, 1);
        });
      }
    };
  }

}());

