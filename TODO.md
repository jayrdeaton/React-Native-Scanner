# TODO

## Allow gesture-handler 3 (Expo SDK 58)

The peer range still caps `react-native-gesture-handler` below 3.0, and Expo SDK 58 ships 3.3. No focus game uses this package, so it was left out of the 2026-10-16 SDK 58 pass (toaster, drawer and scroll-view were raised to `<4.0.0`). Before an SDK 58 app depends on it: raise the cap, move devDependencies to SDK 58 (react-native 0.88, gesture-handler 3.3, Reanimated 4.7, worklets 0.13, `@infinitetoken/jest-config` 0.5.2 for React Native 0.88 tests), verify, release, and plan the move off the deprecated `Gesture` builder API to 3.x's hooks.
