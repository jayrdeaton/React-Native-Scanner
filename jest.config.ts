import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^expo-camera$': '<rootDir>/src/__mocks__/expo-camera.ts',
    '^react-native-gesture-handler$': '<rootDir>/src/__mocks__/react-native-gesture-handler.ts',
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.ts',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        module: 'CommonJS',
        moduleResolution: 'node',
        ignoreDeprecations: '5.0',
        types: ['jest', 'node']
      }
    }]
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
}

export default config
