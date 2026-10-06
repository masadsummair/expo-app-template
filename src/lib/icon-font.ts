import regular from 'expo-symbols/androidWeights/regular';
import { loadAsync } from 'expo-font';
import { Platform } from 'react-native';

/**
 * On Android, expo-symbols renders icons as glyphs of a bundled Material Symbols font and shows an
 * empty box until that font loads. Loading it once while the splash screen is up means every icon
 * renders on its first frame (expo-font caches the family by name). iOS uses native SF Symbols.
 */
export async function preloadIconFont(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await loadAsync({ [regular.name]: regular.font });
  } catch {
    // Icons still load lazily per SymbolView; never block startup on this.
  }
}
