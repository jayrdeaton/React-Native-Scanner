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

export type MenuBag = {
  barcodeTypes: string[]
  facing: 'front' | 'back'
  setFacing: (facing: 'front' | 'back') => void
  setTorch: (torch: boolean) => void
  torch: boolean
}
