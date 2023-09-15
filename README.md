[lidraughts.org/mobile](https://lidraughts.org/mobile)
--------------------

[![Android build](https://github.com/RoepStoep/lidrobile/actions/workflows/android.yml/badge.svg)](https://github.com/RoepStoep/lidrobile/actions/workflows/android.yml)
[![Lint and unit tests](https://github.com/RoepStoep/lidrobile/actions/workflows/checks.yml/badge.svg)](https://github.com/RoepStoep/lidrobile/actions/workflows/checks.yml)
![GitHub](https://img.shields.io/badge/license-GPL--3.0-orange)

Lidraughts mobile is the lidraughts.org official application, forked from [Lichess mobile](https://github.com/lichess-org/lichobile). It is written
in [TypeScript](http://www.typescriptlang.org/), with a bit of Kotlin and Swift.
It is a web application that accesses the native SDK, thanks to [Ionic capacitor](https://capacitor.ionicframework.com/).
The rendering library is [mithril.js](http://mithril.js.org/).
It talks to a native [Scan 3.1](https://github.com/rhalbersma/scan) engine, through a
[capacitor plugin](https://github.com/RoepStoep/capacitor-scan).
Multi-variant draughts library is brought by [a JavaScript version of scaladraughts](https://github.com/RoepStoep/scaladraughtsjs).

## Download

[<img src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png"
     alt="Get it on Google Play"
     height="74">](https://play.google.com/store/apps/details?id=org.lidraughts.mobileapp)
[<img src="res/ios-badge.svg"
     alt="Download on the App Store">](https://itunes.apple.com/us/app/lidraughts-online-draughts/id1485028698)

or get the APK from the [Releases section](https://github.com/RoepStoep/lidrobile/releases/latest)

## Required dependencies

* [node](http://nodejs.org) latest LTS version
* [ionic capacitor dependencies](https://capacitorjs.com/docs/getting-started/environment-setup)

**Android:**

* in addition to capacitor dependencies, [android ndk](http://developer.android.com/tools/sdk/ndk/index.html) for Scan engine compilation (to install with Android Studio).

## Setup project

Make sure to install all dependencies:

    $ npm install

Capacitor needs the web app before sync, so build it:

    $ npm run build

Sync capacitor:

    $ npx cap sync

## Running in the browser

    $ npm run serve

Will serve assets at `http://localhost:8080`.
Once the server is up, browse to [http://localhost:8080/www](http://localhost:8080/www).

You should use a chromium based browser to be close to the android webview which
is based on chrome.

Be sure to [Toggle Device Mode](https://developers.google.com/web/tools/chrome-devtools/device-mode/)
or else you won't be able to click on anything.

## Running in a device/emulator

Be sure to install all the dependencies and follow the steps above in the [Setup
project section](#setup-project).

### Android

Using command line:

    $ npx cap run android

Using android studio:

    $ npx cap open android

More information available [here](https://capacitorjs.com/docs/android).

#### Free version

By default, the output APK will rely on [Firebase Cloud
Messaging](https://firebase.google.com/docs/cloud-messaging) to support push
notifications. However, it is possible to remove this dependency if you don't
care about push notifications.

To build the free version:

    $ npm run patch-nonfree
    $ npx cap update android
    $ cd ./android
    $ ./gradlew assembleDebug

### iOS

You will need a `GoogleService-Info.plist` file in order to compile iOS project.
You can download a dummy one from the [firebase open-source project](https://raw.githubusercontent.com/firebase/firebase-ios-sdk/master/Firestore/Example/App/GoogleService-Info.plist).
Put it in the `ios/App/App/` folder.
Only debug builds are allowed with that example file. Push notifications
won't work, but you will be able to run the app on a simulator just fine.

Using command line:

    $ npx cap run ios

Using Xcode:

    $ npx cap open ios

More information available [here](https://capacitorjs.com/docs/ios).
