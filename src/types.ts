import type { ReactNode } from 'react'
import type { ImageSourcePropType } from 'react-native'

export type IconSource = string | ImageSourcePropType | ((props: { color: string; size: number }) => ReactNode)

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
