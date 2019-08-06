const ncp = require('ncp').ncp;
const source = 'res/assets';
const destination = 'platforms/android/app/src/main/assets';

module.exports = function() {

  ncp(source, destination, function(err) {
    if (err) {
      return console.error(err);
    }
    return console.log('done');
  });

};
