# Agora / Expo 53 Repro

> Minimal repro of the Agora / Expo 53 issue reported in https://github.com/AgoraIO-Extensions/react-native-agora/issues/879.

### Steps to reproduce:

1. Clone this repo.
2. Run `yarn` to install dependencies.
3. Run `yarn prebuild-clean` to generate native ios/android project folders.
4. Run `yarn start` to start Metro.
5. In another terminal, with an Android device connected via cable/wireless debugging, run `yarn android`.
6. Open XCode and load the `ios/testvid.xcworkspace`. Set a provisioning profile for the app.
7. Build and run the iOS app on a real device.
8. On the Android device, tap "Join as 0".
9. On the iOS device, tap "Join as 1".
10. Observe that the iOS receives the video stream from the Android device, but the Android device does not receive the
  video stream from the iOS device. Additionally, on iOS, no events are fired from the Agora engine.
