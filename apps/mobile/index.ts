// The app's entry (package.json "main"): expo-router's own (expo-router/entry-classic), with the root wrapped so
// that only the newest React root is the app when Android recreates the activity (src/services/latestRoot.tsx).
// Only the import and the registration belong here: no components, no other side effects (Fast Refresh).

// `@expo/metro-runtime` must be the first import (as in expo-router's entry).
import '@expo/metro-runtime';

import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

import { latestRootOnly } from './src/services/latestRoot';

renderRootComponent(latestRootOnly(App));
