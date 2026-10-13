// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from 'eslint/config';
// @ts-expect-error eslint-config-expo ships no type declarations
import expoConfig from 'eslint-config-expo/flat';

const restrictedImports = {
  paths: [
    {
      name: 'react-native',
      importNames: ['Text', 'TextInput', 'Button'],
      message:
        'Use Text, TextField or Button from @/components/ui (tokens, testID, accessibility).',
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

const testFiles = [
  '**/*.test.{ts,tsx}',
  'test/**/*.{ts,tsx}',
  '.claude/hooks/*.test.ts',
  'e2e/**/*.ts',
];
// Untyped JSON from outside the app: HTTP bodies, env, and Sentry's free-form `extra`.
const boundaryFiles = ['src/services/api/**', 'src/config/**', 'src/lib/crash-reporting.ts'];

const asUnknownAs = {
  selector:
    'TSAsExpression[expression.type="TSAsExpression"][expression.typeAnnotation.type=/^TS(Unknown|Never)Keyword$/]',
  message:
    '`as unknown as X` and `as never as X` hide a type error. Fix the type, or parse the value with zod.',
};
const recordStringUnknown = {
  selector:
    'TSTypeReference[typeName.name="Record"][typeArguments.params.1.type="TSUnknownKeyword"]:matches([typeArguments.params.0.type="TSStringKeyword"], [typeArguments.params.0.typeName.name="PropertyKey"])',
  message:
    'Record<string, unknown> (or Record<PropertyKey, unknown>) is only for API, env and crash-reporting boundaries. Define the shape, or parse with zod.',
};
const indexSignatureUnknown = {
  selector:
    'TSIndexSignature[parameters.0.typeAnnotation.typeAnnotation.type="TSStringKeyword"][typeAnnotation.typeAnnotation.type="TSUnknownKeyword"]',
  message:
    '{ [key: string]: unknown } is only for API, env and crash-reporting boundaries. Define the shape, or parse with zod.',
};
const focusedOrSkippedTest = [
  {
    selector: 'MemberExpression[object.name=/^(describe|it|test)$/][property.name=/^(only|skip)$/]',
    message:
      'No .only or .skip: a focused or skipped test passes silently. Fix or delete the test.',
  },
  {
    selector: 'CallExpression[callee.name=/^(xit|fit|xtest|xdescribe|fdescribe)$/]',
    message:
      'No xit, fit, xtest, xdescribe or fdescribe: a focused or skipped test passes silently.',
  },
];

export default defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'src/uniwind-types.d.ts',
      'expo-env.d.ts',
      'ios/**',
      'android/**',
      '.agents/**',
      '.codex/**',
      'test/tooling/fixtures/**',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-restricted-imports': ['error', restrictedImports],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      'no-debugger': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-empty': 'error',
      'no-useless-catch': 'error',
      'no-restricted-syntax': ['error', asUnknownAs, recordStringUnknown, indexSignatureUnknown],
    },
  },
  {
    files: boundaryFiles,
    ignores: testFiles,
    rules: { 'no-restricted-syntax': ['error', asUnknownAs] },
  },
  {
    // Tests mock fetch and globals, so type evasion and Record<string, unknown> are fine there.
    files: testFiles,
    rules: { 'no-restricted-syntax': ['error', ...focusedOrSkippedTest] },
  },
  {
    // The UI primitives are the one place allowed to wrap React Native's raw components.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
