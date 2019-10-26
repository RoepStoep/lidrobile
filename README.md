[lidraughts.org/mobile](https://lidraughts.org/mobile)
--------------------

Lidraughts mobile is a [cordova](https://cordova.apache.org/) application, forked from [Lichess mobile](https://github.com/veloce/lichobile). It is written
in [TypeScript](http://www.typescriptlang.org/) and JavaScript. The rendering
library is [mithril.js](http://mithril.js.org/). It uses [babel](http://babeljs.io/),
[browserify](http://browserify.org/) and [gulp](http://gulpjs.com/)
as build tools. It talks to a native [Scan 3.1](https://github.com/rhalbersma/scan) engine, through a
[cordova plugin](https://github.com/RoepStoep/cordova-plugin-scan).
Multi-variant draughts library is brought by [a JavaScript version of scaladraughts](https://github.com/RoepStoep/scaladraughtsjs).

## Requirements

* [node](http://nodejs.org) latest LTS version
* [cordova](https://cordova.apache.org/) latest version

**Android:**

* the [android SDK](http://developer.android.com/sdk/index.html)
* [SDK packages](http://developer.android.com/sdk/installing/adding-packages.html) API 23
* last version of Android SDK tools and platform tools
* [android ndk](http://developer.android.com/tools/sdk/ndk/index.html) for
  scan compilation
* make sure the `sdk/tools/` directory is in your path, so you can use `android`
  command everywhere.

**iOS:**

* OS X and [Xcode](https://developer.apple.com/xcode/download/)

## Build the web application

Make sure you installed all deps:

    $ npm install

Then copy `env.json.example` to `env.json` and modify settings
to link your app to a lidraughts server.

To build and watch for changes:

    $ npm run watch

## Run the tests

    $ npm run test

## Run in a browser

    $ chromium --user-data-dir=/tmp/lidrobile-chrom --disable-web-security www/index.html

Be sure to [Toggle Device Mode](https://developers.google.com/web/tools/chrome-devtools/device-mode/) in your browser, or else you won't be able to click on anything.

## Build cordova application and run on device

Be sure to check requirements above.

See scripts defined in package.json for various environments.

### Android

Plug your device with USB, or use an emulator. Then:

    $ npm run android-stage

### iOS

Plug your device with USB, or use an emulator. Then:

    $ npm run ios-stage

## Build scan

### Android

Build the native code using:
```
ndk-build -C platforms/android
```

### iOS

Through XCode, in the build settings menu:
  * Set `C++ Language Dialect` option to `C++14` value.
  * Set `C++ Standard Library` option to `libc++` value.
