// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from 'eslint/config';
// @ts-expect-error eslint-config-expo ships no type declarations
import expoConfig from 'eslint-config-expo/flat';

const restrictedImports = {
  paths: [
    {
      name: 'react-native',
      importNames: ['Text', 'TextInput', 'Button', 'Pressable'],
      message:
        '[design.ui-primitives] Use Button, ListItem or Text from @/components/ui (TextField for inputs); for an icon-only or custom surface, use PressableScale with min-h-12 min-w-12 and an accessibility label.',
    },
    {
      name: 'react-native',
      importNames: ['SafeAreaView'],
      message: 'Use Screen from @/components/ui, or react-native-safe-area-context.',
    },
    {
      name: 'react-native',
      importNames: ['TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback'],
      message:
        '[design.ui-primitives] Use Button, ListItem or PressableScale from @/components/ui.',
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

// ---- design.* rules (standards/design.json). Each message starts with the rule id so agents can cite it. ----
const colourUtilities =
  'bg|text|border(?:-(?:t|b|l|r|x|y|s|e))?|ring(?:-offset)?|fill|stroke|accent|from|via|to|divide|outline|shadow|decoration|caret';
const paletteColours =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const tokenHint = 'Use a token from src/global.css (bg-primary, text-muted, p-4, text-sm ...).';
const literalPatterns = [
  [String.raw`^#[0-9a-fA-F]{3,8}$`, 'No hex colours'],
  [String.raw`\b(?:rgba?|hsla?)\(`, 'No rgb()/hsl() colours'],
  [
    String.raw`\b(?:${colourUtilities})-(?:${paletteColours})-[0-9]{2,3}\b`,
    'No Tailwind palette colours',
  ],
  [String.raw`\b(?:${colourUtilities})-(?:white|black)\b`, 'No white/black utilities'],
  [String.raw`\b[a-z][a-z0-9-]*-\[[^\]\s]+\]`, 'No arbitrary values'],
];
const testIdMessage = '[design.testids] testID must be kebab-case: <screen>-<element>.';

const designSelectors = [
  ...literalPatterns.flatMap(([regex, what]) =>
    ['Literal[value=', 'TemplateElement[value.raw='].map((head) => ({
      selector: `${head}/${regex}/]`,
      message: `[design.tokens-only] ${what}. ${tokenHint}`,
    })),
  ),
  {
    selector: 'Property[key.name=/^(?:fontSize|fontFamily)$/]',
    message:
      '[design.tokens-only] No hard-coded fontSize/fontFamily. Use a Text variant or a text-* token.',
  },
  {
    selector: "JSXAttribute[name.name='allowFontScaling'] Literal[value=false]",
    message:
      '[design.font-scaling] Never disable font scaling. Text caps scaling per role (maxFontSizeMultiplier).',
  },
  {
    selector: "JSXAttribute[name.name='adjustsFontSizeToFit']",
    message:
      '[design.font-scaling] Labels wrap, they do not shrink (HIG: reflow). Remove adjustsFontSizeToFit.',
  },
  {
    selector: String.raw`JSXAttribute[name.name='testID'] Literal[value=/^(?![a-z0-9]+(-[a-z0-9]+)*$)/]`,
    message: testIdMessage,
  },
  {
    selector: String.raw`JSXAttribute[name.name='testID'] TemplateElement[value.raw=/[^a-z0-9-]/]`,
    message: testIdMessage,
  },
  {
    selector:
      'JSXOpeningElement[name.name=/^(?:Pressable|PressableScale|Button|TextField|Switch|TextInput)$/]' +
      ":not(:has(JSXAttribute[name.name='testID'])):not(:has(JSXSpreadAttribute))",
    message:
      '[design.testids] Interactive elements need a testID (<screen>-<element>) so e2e tests and agents can select them.',
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
      'no-restricted-syntax': [
        'error',
        asUnknownAs,
        recordStringUnknown,
        indexSignatureUnknown,
        ...designSelectors,
      ],
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
    // The UI kit may wrap React Native's raw components, but imports only @/lib/* and its own folder.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // React 19 and storage rules still apply; only the React Native primitives are allowed here.
          paths: restrictedImports.paths.filter((entry) => entry.name !== 'react-native'),
          patterns: [
            {
              regex: '^(?:@/(?!lib/)|\\.\\./)',
              message:
                '[design.ui-primitives] The UI kit imports only from @/lib and its own folder.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests inside the kit import test/platform and React Native primitives.
    files: ['src/components/ui/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
