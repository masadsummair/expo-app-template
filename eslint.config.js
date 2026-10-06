// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const restrictedImports = {
  paths: [
    {
      name: 'react-native',
      importNames: ['Text', 'TextInput', 'Button'],
      message: 'Use Text, TextField or Button from @/components/ui (tokens, testID, accessibility).',
    },
    {
      name: 'react-native',
      importNames: ['SafeAreaView'],
      message: 'Use Screen from @/components/ui, or react-native-safe-area-context.',
    },
    {
      name: 'react-native',
      importNames: ['TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback'],
      message: 'Use Pressable.',
    },
    {
      name: 'react',
      importNames: ['default', 'forwardRef'],
      message: 'React 19: use named imports, and pass ref as a regular prop instead of forwardRef.',
    },
    {
      name: '@react-native-async-storage/async-storage',
      message: 'Use @/lib/storage (MMKV) for data, expo-secure-store for secrets.',
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'src/uniwind-types.d.ts', 'expo-env.d.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', restrictedImports],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The UI primitives are the one place allowed to wrap React Native's raw components.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
