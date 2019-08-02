const fs = require('fs');

module.exports = function() {
  const plistFile = 'platforms/ios/lidraughts/lidraughts-Info.plist';
  const searchedText = 'org.lidraughts.mobileapp'

  let plistText = fs.readFileSync(plistFile).toString();

  if (plistText.includes(searchedText)) {
    plistText = plistText.replace(searchedText, searchedText + '.official');
  }

  fs.writeFileSync(plistFile, plistText);
};
