# @rific/scanner

Full-screen barcode scanner with animated overlays, pinch zoom, timeout ring, and scan tracking for React Native. Uses `expo-camera` for barcode scanning when installed.

## Installation

```sh
npm install @rific/scanner react-native-gesture-handler react-native-worklets react-native-svg expo-camera
```

Optional (for richer UI):
```sh
npm install react-native-paper react-native-safe-area-context
```

## Usage

```tsx
import { Scanner } from '@rific/scanner'

<Scanner
  accentColor='#6200ee'
  autoScan
  timeout={30}
  onScan={({ data, type }) => console.log(data, type)}
  onClose={() => navigation.goBack()}
  onSound={() => playBoop()}
  onVibrate={() => vibrate()}
  onTimeout={() => navigation.goBack()}
/>
```

### With custom menu

`renderMenu` accepts a plain `ReactNode` rendered in the header. To let it toggle facing/torch, manage that state yourself and pass it back into `Scanner` via the `facing`/`torch` props:

```tsx
import { useState } from 'react'
import { Scanner } from '@rific/scanner'

const [facing, setFacing] = useState<'front' | 'back'>('back')
const [torch, setTorch] = useState(false)

<Scanner
  onScan={handleScan}
  facing={facing}
  torch={torch}
  renderMenu={
    <MyMenu
      facing={facing}
      onFacingToggle={() => setFacing(facing === 'back' ? 'front' : 'back')}
      torch={torch}
      onTorchToggle={() => setTorch(!torch)}
    />
  }
/>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onScan` | `(result: ScanResult) => void` | required | Called with `{ data, type }` for each captured scan |
| `accentColor` | `string` | `'#6200ee'` | Color for overlays, timer ring, and buttons |
| `autoScan` | `boolean` | `true` | Auto-capture on detect; `false` = manual press |
| `backgroundColor` | `string` | `'black'` | Camera background color |
| `barcodeTypes` | `string[]` | all | Barcode types to detect (e.g. `['qr', 'ean13']`) |
| `captureIcon` | `IconSource` | | Icon for the capture button (string, `ImageSourcePropType`, or `(props: { color, size }) => ReactNode`) |
| `children` | `ReactNode` | | Rendered over the camera |
| `closeIcon` | `IconSource` | | Icon for the close button |
| `disabledScanValues` | `string[]` | | Values to show as already-scanned (checked state) |
| `disabledScanValueSet` | `ReadonlySet<string>` | | Set version of `disabledScanValues` (preferred for large lists) |
| `facing` | `'front' \| 'back'` | `'back'` | Which camera to use |
| `mode` | `'scan' \| 'photo'` | `'scan'` | `'scan'` detects barcodes; `'photo'` turns the capture button into a shutter that calls `onPhoto` |
| `onClose` | `() => void` | | Shows a close button; called on press |
| `onDisabledScan` | `(value: string) => void` | | Called when a disabled value is pressed |
| `onPermissionDenied` | `() => void` | | Called when camera permission is denied |
| `onPhoto` | `(photo: PhotoResult) => void` | | Called with the captured photo when `mode='photo'` |
| `onSound` | `() => void` | | Called on successful scan — play a sound here |
| `onTimeout` | `() => void` | | Called when the timeout ring completes |
| `onVibrate` | `() => void` | | Called on successful scan — trigger haptics here |
| `pictureOptions` | `PictureOptions` | | Options passed to `takePictureAsync` when `mode='photo'` |
| `renderCapture` | `(handlers: { onPress, onPressIn, onPressOut }) => ReactNode` | | Fully custom capture button; receives the press handlers to wire up |
| `renderClose` | `(handlers: { onPress }) => ReactNode` | | Fully custom close button; receives the press handler to wire up |
| `renderMenu` | `ReactNode` | | Custom content rendered in the header (e.g. a menu of torch/facing controls) |
| `scanIcon` | `IconSource` | | Icon shown on an unscanned overlay target |
| `scanTimeout` | `number` | `0` | Seconds before a scanned value reverts to unscanned; `0` = never |
| `scannedIcon` | `IconSource` | | Icon shown on an already-scanned overlay target |
| `style` | `ViewStyle` | | Style for the camera view |
| `timeout` | `number` | `0` | Seconds before `onTimeout`/`onClose` fires; `0` = no timeout |
| `torch` | `boolean` | `false` | Whether the torch/flashlight is enabled |

## ScanResult

```ts
type ScanResult = {
  data: string   // barcode value
  type: string   // barcode format (e.g. 'QR', 'EAN13')
}
```

## PhotoResult

```ts
type PhotoResult = {
  uri: string
  width: number
  height: number
  base64?: string
}
```

## PictureOptions

```ts
type PictureOptions = {
  quality?: number
  base64?: boolean
  exif?: boolean
  skipProcessing?: boolean
}
```

## Peer dependencies

Required:
- `react >= 18.0.0`
- `react-native >= 0.76.0`
- `react-native-gesture-handler >= 2.0.0`
- `react-native-worklets >= 0.7.0`
- `react-native-svg >= 13.0.0`

Optional:
- `expo-camera >= 15.0.0` — barcode scanning; without it the camera renders as a blank view
- `react-native-paper >= 5.0.0` — richer UI (icon buttons, Portal); without it falls back to simple Pressable elements
- `react-native-safe-area-context >= 5.0.0` — proper notch/safe area handling; without it falls back to a fixed iOS top padding
