import type * as ExpoCamera from 'expo-camera'
import type * as RNPaper from 'react-native-paper'
import type * as SafeAreaContext from 'react-native-safe-area-context'

import type { CameraModule, ScannerPaperModule, SafeAreaModule } from '../types'

// Compile-time-only check (no runtime import, no test assertions) that the real peer modules
// structurally satisfy this package's local mirror types. `tsc --noEmit` fails here if either
// drifts out of sync with the real thing, the same class of bug that a jest-only mock can't
// catch (mocks trivially satisfy whatever type they're cast to).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const cameraShapeCheck: CameraModule = {} as typeof ExpoCamera
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const paperShapeCheck: ScannerPaperModule = {} as typeof RNPaper
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const safeAreaShapeCheck: SafeAreaModule = {} as typeof SafeAreaContext
