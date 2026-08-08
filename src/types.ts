import type { ComponentType, ReactNode } from 'react'
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native'

export type IconSource = string | ImageSourcePropType | ((props: { color: string; size: number }) => ReactNode)

// Local mirrors of expo-camera/react-native-safe-area-context/react-native-paper's exports,
// limited to what this package touches. Avoids forcing TypeScript to resolve these optional
// peers' real types for consumers who never installed them. None of the three are
// auto-detected: Metro doesn't rewrite a require()-in-try/catch call into its module graph
// inside an ESM (.mjs) build, so the module-level detection this package used to do silently
// broke as soon as consumers' bundlers resolved this package's ESM entry point. Pass them to
// <Scanner camera={...} paper={...} safeArea={...}> instead.

export type CameraPermissionResult = { canAskAgain?: boolean; granted: boolean }

export type CameraModule = {
  // expo-camera's CameraView is a class component with many props beyond what Scanner touches
  // (ref, barcodeScannerSettings, enableTorch, facing, onBarcodeScanned, style, zoom) plus
  // imperative instance methods (takePictureAsync), left as ComponentType<any> rather than
  // mirroring the full prop surface, same tradeoff @rific/haptic-press's SegmentedButtons slot
  // takes for a real type too complex to usefully hand-mirror.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CameraView: ComponentType<any>
  useCameraPermissions: () => readonly [CameraPermissionResult | null, () => Promise<unknown>, ...unknown[]]
}

export type SafeAreaModule = {
  useSafeAreaInsets: () => { bottom: number; left: number; right: number; top: number }
}

export type ScannerPaperModule = {
  IconButton: ComponentType<{ containerColor?: string; icon: IconSource; iconColor?: string; size?: number; style?: StyleProp<ViewStyle> }>
}

export type BarcodeScanResult = {
  data: string
  type: string
  bounds?: { origin: { x: number; y: number }; size: { width: number; height: number } }
  cornerPoints?: { x: number; y: number }[]
}

export type ScanResult = {
  data: string
  type: string
}

export type PhotoResult = {
  uri: string
  width: number
  height: number
  base64?: string
}

export type PictureOptions = {
  quality?: number
  base64?: boolean
  exif?: boolean
  skipProcessing?: boolean
}
