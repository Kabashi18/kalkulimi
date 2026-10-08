import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeWindStyleSheet } from 'nativewind';

// Tema: app-i është gjithmonë i çelët; tema e errët është opsion që përdoruesi e ndez vetë
// nga menuja e profilit (si në web). Zgjedhja ruhet në AsyncStorage.
// Klasat e ngjyrave kanë variantet `dark:` (të njëjtat rregulla përmbysjeje si frontend/src/theme.css).
const KEY = 'kalkulimi-theme';
let current = 'light';

// NativeWind ndjek sistemin si parazgjedhje -> e fiksojmë të çelët që në nisje (pa "blic" të errët)
NativeWindStyleSheet.setColorScheme('light');

export const isDark = () => current === 'dark';

export const applyDark = (enabled) => {
  current = enabled ? 'dark' : 'light';
  NativeWindStyleSheet.setColorScheme(current);
};

export const loadDarkPreference = async () => {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'dark';
  } catch {
    return false;
  }
};

export const saveDarkPreference = async (enabled) => {
  try {
    if (enabled) await AsyncStorage.setItem(KEY, 'dark');
    else await AsyncStorage.removeItem(KEY);
  } catch {
    /* ruajtja dështoi: tema vlen vetëm për këtë seancë */
  }
};

// Ngjyrat e shkruara direkt në kod (ikona, placeholder, spinner) sipas temës aktuale.
// Lexohen gjatë render-it; App-i rivizaton gjithçka kur ndërrohet tema.
const pick = (light, dark) => (current === 'dark' ? dark : light);
export const C = {
  get onBrand() { return pick('#ffffff', '#0f172a'); }, // tekst/ikonë mbi butonat e markës
  get brand() { return pick('#0e7490', '#06b6d4'); },
  get text() { return pick('#0f172a', '#f8fafc'); },
  get strong() { return pick('#334155', '#cbd5e1'); },
  get icon() { return pick('#475569', '#94a3b8'); },
  get muted() { return pick('#64748b', '#94a3b8'); },
  get faint() { return pick('#94a3b8', '#64748b'); },
  get placeholderSoft() { return pick('#cbd5e1', '#475569'); },
  get danger() { return pick('#e11d48', '#fb7185'); },
  get dangerStrong() { return pick('#be123c', '#fda4af'); },
  get warning() { return pick('#d97706', '#fbbf24'); }
};
