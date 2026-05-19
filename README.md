# @rific/scanner

Full-screen barcode scanner with animated overlays, pinch zoom, timeout ring, and scan tracking for React Native. Uses `expo-camera` for barcode scanning when installed.

## Installation

```sh
npm install @rific/scanner react-native-gesture-handler react-native-reanimated react-native-svg expo-camera
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

```tsx
import { Scanner, MenuBag } from '@rific/scanner'

<Scanner
  onScan={handleScan}
  renderMenu={({ facing, setFacing, torch, setTorch }: MenuBag) => (
    <MyMenu
      facing={facing}
      onFacingToggle={() => setFacing(facing === 'back' ? 'front' : 'back')}
      torch={torch}
      onTorchToggle={() => setTorch(!torch)}
    />
  )}
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
| `children` | `ReactNode` | | Rendered over the camera |
| `disabledScanValues` | `string[]` | | Values to show as already-scanned (checked state) |
| `disabledScanValueSet` | `ReadonlySet<string>` | | Set version of `disabledScanValues` (preferred for large lists) |
| `onClose` | `() => void` | | Shows a close button; called on press |
| `onDisabledScan` | `(value: string) => void` | | Called when a disabled value is pressed |
| `onPermissionDenied` | `() => void` | | Called when camera permission is denied |
| `onSound` | `() => void` | | Called on successful scan — play a sound here |
| `onTimeout` | `() => void` | | Called when the timeout ring completes |
| `onVibrate` | `() => void` | | Called on successful scan — trigger haptics here |
| `renderMenu` | `(bag: MenuBag) => ReactNode` | | Render a custom menu (torch, facing, etc.) |
| `scanTimeout` | `number` | `0` | Seconds before a scanned value reverts to unscanned; `0` = never |
| `style` | `ViewStyle` | | Style for the camera view |
| `timeout` | `number` | `0` | Seconds before `onTimeout`/`onClose` fires; `0` = no timeout |

## ScanResult

```ts
type ScanResult = {
  data: string   // barcode value
  type: string   // barcode format (e.g. 'QR', 'EAN13')
}
```

## MenuBag

```ts
type MenuBag = {
  barcodeTypes: string[]
  facing: 'front' | 'back'
  setFacing: (facing: 'front' | 'back') => void
  setTorch: (torch: boolean) => void
  torch: boolean
}
```

## Peer dependencies

Required:
- `react >= 17.0.0`
- `react-native >= 0.70.0`
- `react-native-gesture-handler >= 2.0.0`
- `react-native-reanimated >= 3.0.0`
- `react-native-svg >= 13.0.0`

Optional:
- `expo-camera >= 15.0.0` — barcode scanning; without it the camera renders as a blank view
- `react-native-paper >= 5.0.0` — richer UI (icon buttons, Portal); without it falls back to simple Pressable elements
- `react-native-safe-area-context >= 4.0.0` — proper notch/safe area handling; without it falls back to a fixed iOS top padding
