module.exports = require('@infinitetoken/jest-config/react-native')({
  moduleNameMapper: {
    '^expo-camera$': '<rootDir>/src/__mocks__/expo-camera.ts',
    '^react-native-gesture-handler$': '<rootDir>/src/__mocks__/react-native-gesture-handler.ts',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.ts',
    '^react-native-worklets$': '<rootDir>/src/__mocks__/react-native-worklets.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts'
  }
})
