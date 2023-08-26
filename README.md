[lidraughts.org/mobile](https://lidraughts.org/mobile)
--------------------

Lidraughts mobile is the lidraughts.org official application, forked from [Lichess mobile](https://github.com/veloce/lichobile). It is written
in [TypeScript](http://www.typescriptlang.org/), with a bit of Kotlin and Swift.
It is a web application that access native SDK thanks to [Ionic capacitor](https://capacitor.ionicframework.com/).
The rendering library is [mithril.js](http://mithril.js.org/).
It talks to a native [Scan 3.1](https://github.com/rhalbersma/scan) engine, through a
[cordova plugin](https://github.com/RoepStoep/cordova-plugin-scan).
Multi-variant draughts library is brought by [a JavaScript version of scaladraughts](https://github.com/RoepStoep/scaladraughtsjs).

## Required dependencies

* [node](http://nodejs.org) latest LTS version
* [ionic capacitor dependencies](https://capacitorjs.com/docs/getting-started/environment-setup)

**Android:**

* in addition to capacitor dependencies, [android ndk](http://developer.android.com/tools/sdk/ndk/index.html) for Scan engine compilation (to install with Android Studio).

## Initialize build

Make sure you installed all deps:

    $ npm install

Capacitor needs the web app before update, so build it:

    $ npm run build

Update capacitor:

    $ npx cap update

## Run in a browser

You need to start a web server at `http://localhost:8080`. For instance:

    $ npm run serve

Will serve assets at `http://localhost:8080`.
Once the server is running, browse to [http://localhost:8080/www](http://localhost:8080/www).

Be sure to [Toggle Device Mode](https://developers.google.com/web/tools/chrome-devtools/device-mode/) in your browser, or else you won't be able to click on anything.

## Run in a device/emulator

The easiest way to do it is to open the native IDE. Capacitor has a command
for that:

    $ npx cap open

## Advanced setup

See the [wiki](https://github.com/veloce/lichobile/wiki/Setting-a-lichess-dev-server-for-the-app).
