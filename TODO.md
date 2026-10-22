# TODO

## Move off gesture-handler's deprecated `Gesture` builder

Prepared 2026-10-18 with the peer range raised to `react-native-gesture-handler >=2.0.0 <4.0.0` so Expo SDK 58 apps (gesture-handler 3.3) can use it, but the code still uses the builder API (`Gesture.Pinch()` for pinch-to-zoom in `src/Scanner.tsx`), which 3.x marks deprecated and says it will remove. Move to the 3.x hooks (`usePinchGesture`) with `GestureDetector`; that makes 3.0 the peer floor, so release it as a minor once every consumer is on SDK 58.

## Check gestures on a device under gesture-handler 3

The tests mock `react-native-gesture-handler` (`src/__mocks__/react-native-gesture-handler.ts`), so they passed against 3.3 without running it. Before relying on it, try pinch-to-zoom on the camera, tapping a scan overlay and the capture button (the pinch's `GestureDetector` wraps the same `Pressable`), in Utility and UniScan in an SDK 58 dev build.

## React Native 0.88 strict types

Checked 2026-10-18 with only the `react-native` condition (the fleet defers strict types through `@infinitetoken/tsconfig` 0.6): this package's own source has no strict-type errors, and neither has `@rific/core`'s, which it also type-checks. Nothing to do here beyond dropping the deferral when `@infinitetoken/tsconfig` does.
