// Linted as src/components/design-bad.tsx by test/tooling/eslint-rules.test.ts.
import {
  Button, // expect: design.ui-primitives
  Pressable, // expect: design.ui-primitives
  Text, // expect: design.ui-primitives
  TextInput, // expect: design.ui-primitives
  TouchableHighlight, // expect: design.ui-primitives
  TouchableOpacity, // expect: design.ui-primitives
  TouchableWithoutFeedback, // expect: design.ui-primitives
} from 'react-native';

const HEX = '#ff0000'; // expect: design.tokens-only
const FN = 'rgba(0, 0, 0, 0.5)'; // expect: design.tokens-only
const PALETTE = 'bg-blue-500 text-gray-900'; // expect: design.tokens-only
const WHITE = 'text-white'; // expect: design.tokens-only
const ARBITRARY = 'w-[220px]'; // expect: design.tokens-only
const TEMPLATE = `border-red-500 ${HEX}`; // expect: design.tokens-only
const DIRECTIONAL = 'border-b-gray-200'; // expect: design.tokens-only
const OFFSET = 'ring-offset-red-500'; // expect: design.tokens-only
const DIRECTIONAL_WHITE = 'border-t-white'; // expect: design.tokens-only
const TEMPLATE_HEX = `#fff`; // expect: design.tokens-only
const TEMPLATE_RGB = `rgb(0,0,0)`; // expect: design.tokens-only
const TEMPLATE_WHITE = `bg-white ${HEX}`; // expect: design.tokens-only
const TEMPLATE_ARBITRARY = `w-[3px] ${HEX}`; // expect: design.tokens-only
const TEMPLATE_DIRECTIONAL = `border-x-blue-500 ${HEX}`; // expect: design.tokens-only
const SIZE = { fontSize: 14 }; // expect: design.tokens-only
const FAMILY = { fontFamily: 'Inter' }; // expect: design.tokens-only

export const noTestId = <Pressable onPress={() => undefined} />; // expect: design.testids
export const badTestId = <Pressable testID="Bad_Id" onPress={() => undefined} />; // expect: design.testids
export const badTemplateTestId = <Pressable testID={`Row-${HEX}`} onPress={() => undefined} />; // expect: design.testids
export const noInputId = <TextInput />; // expect: design.testids
export const noScaling = <Text allowFontScaling={false}>x</Text>; // expect: design.font-scaling
export const shrinks = <Text adjustsFontSizeToFit>x</Text>; // expect: design.font-scaling

export {
  FN,
  PALETTE,
  WHITE,
  ARBITRARY,
  TEMPLATE,
  DIRECTIONAL,
  OFFSET,
  DIRECTIONAL_WHITE,
  TEMPLATE_HEX,
  TEMPLATE_RGB,
  TEMPLATE_WHITE,
  TEMPLATE_ARBITRARY,
  TEMPLATE_DIRECTIONAL,
  SIZE,
  FAMILY,
  Button,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
};
