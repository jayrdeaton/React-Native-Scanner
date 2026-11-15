// The icon a code's box shows by default: react-native-paper's (Material Design) QR code for a QR or Aztec code, its
// Data Matrix for a Data Matrix, and a barcode for the rest, the 1D codes and the stacked PDF417. Types are
// expo-camera's (`qr`, `ean13`), in any case.
const icons: Record<string, string> = {
  aztec: 'qrcode',
  datamatrix: 'data-matrix',
  qr: 'qrcode'
}

export const defaultScanIcon = (type: string) => icons[type.toLowerCase()] ?? 'barcode'
