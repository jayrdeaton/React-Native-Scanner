import { useCallback, useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const USE_NATIVE_DRIVER = true

type TimerRingProps = {
  color: string
  duration: number
  onStop?: () => void
  radius: number
  started: string | null
  style?: ViewStyle
  width?: number
}

export const TimerRing = ({ color, duration, onStop, radius, started, style, width = 6 }: TimerRingProps) => {
  const startedRef = useRef<string | null>(null)
  const durationRef = useRef(duration)
  const circumference = 2 * Math.PI * radius
  const animation = useRef(new Animated.Value(0)).current

  const startTimer = useCallback(() => {
    animation.setValue(0)
    Animated.timing(animation, {
      toValue: 1,
      duration: duration * 1000,
      easing: Easing.linear,
      useNativeDriver: USE_NATIVE_DRIVER
    }).start(({ finished }) => {
      if (finished && onStop) onStop()
    })
  }, [animation, duration, onStop])

  const stopTimer = useCallback(() => {
    animation.stopAnimation()
    Animated.spring(animation, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER }).start()
  }, [animation])

  useEffect(() => {
    const startedChanged = started !== startedRef.current
    const durationChanged = duration !== durationRef.current

    if (duration === 0) {
      stopTimer()
    } else if (started) {
      if (startedChanged || durationChanged) {
        animation.stopAnimation(() => startTimer())
      }
    } else {
      stopTimer()
    }
    startedRef.current = started
    durationRef.current = duration
  }, [animation, duration, started, startTimer, stopTimer])

  const animatedProps = {
    strokeDashoffset: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [circumference, 0]
    })
  }

  return (
    <View style={[styles.root, style]}>
      <Svg width={radius * 2 + width} height={radius * 2 + width} viewBox={`0 0 ${radius * 2 + width} ${radius * 2 + width}`}>
        <G rotation='-90' origin={`${radius + width / 2}, ${radius + width / 2}`}>
          <AnimatedCircle cx={radius + width / 2} cy={radius + width / 2} r={radius} stroke={color} strokeWidth={width} fill='none' strokeDasharray={circumference} {...animatedProps} />
        </G>
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute'
  }
})
