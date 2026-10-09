import type { GoogleClientId, GoogleSignInOptions } from './types';

type OS = 'ios' | 'android' | string;

/**
 * Picks the client id the native module of `os` expects.
 *
 * A string is passed as is. With `{ iosClientId, webClientId }`, iOS gets `iosClientId` (or '' so
 * the native side reads `GIDClientID` from Info.plist) and `webClientId` as the default
 * `serverClientId`; Android gets `webClientId` (or '', which rejects with `CONFIGURATION_ERROR`).
 */
export function resolveGoogleClientId<T extends GoogleSignInOptions>(
  os: OS,
  clientId: GoogleClientId | null | undefined,
  options: T
): { clientId: string; options: T } {
  if (typeof clientId === 'string') {
    return { clientId, options };
  }
  const ids = clientId ?? {};
  if (os === 'ios') {
    const resolved = { ...options };
    if (resolved.serverClientId === undefined && ids.webClientId) {
      resolved.serverClientId = ids.webClientId;
    }
    return { clientId: ids.iosClientId ?? '', options: resolved };
  }
  return { clientId: ids.webClientId ?? '', options };
}

/**
 * Splits the `(clientId?, options?)` arguments of the Google methods, which also accept
 * `(options)`: an object with `iosClientId` or `webClientId` is the client id, any other object is
 * the options. Without a client id the native side reads it from the app config (Info.plist,
 * AndroidManifest meta-data or the Firebase files).
 */
export function splitGoogleArgs<T extends object>(
  first: GoogleClientId | T | null | undefined,
  second: T | undefined
): { clientId: GoogleClientId | undefined; options: T | undefined } {
  if (first === null || first === undefined) {
    return { clientId: undefined, options: second };
  }
  if (
    typeof first === 'string' ||
    'iosClientId' in first ||
    'webClientId' in first
  ) {
    return { clientId: first as GoogleClientId, options: second };
  }
  return { clientId: undefined, options: first as T };
}

/**
 * Message thrown when the native module is not in the binary: Expo Go (which only ships the Expo
 * SDK native modules) or an app that was not rebuilt after installing the library.
 */
export function missingNativeModuleMessage(): string {
  const expo = (globalThis as { expo?: { modules?: Record<string, unknown> } })
    .expo;
  if (expo?.modules?.ExpoGo) {
    return (
      'react-native-oauth-essentials does not work in Expo Go, which only contains the Expo SDK ' +
      'native code. Create a development build instead: `npx expo run:ios` / `npx expo run:android` ' +
      'or `eas build --profile development`.'
    );
  }
  return (
    'react-native-oauth-essentials: the native module "OauthEssentials" was not found. Rebuild the ' +
    'app after installing the library (run `pod install` in ios/ and build again; reloading Metro is ' +
    'not enough) and make sure the New Architecture is enabled. With Expo, use a development build ' +
    '(Expo Go is not supported).'
  );
}

const warned = new Set<string>();

/**
 * In development, warns once per method and option that an option set by the app has no effect on
 * the current platform. `options` must be the options as passed by the app (before defaults).
 */
export function warnIgnored(
  method: string,
  platform: string,
  options: object | null | undefined,
  keys: readonly string[]
): void {
  if (!__DEV__ || !options) {
    return;
  }
  for (const key of keys) {
    if ((options as Record<string, unknown>)[key] !== undefined) {
      warnOnce(
        method,
        key,
        `"${key}" is ignored on ${platformName(platform)}.`
      );
    }
  }
}

function platformName(platform: string): string {
  if (platform === 'ios') return 'iOS';
  if (platform === 'android') return 'Android';
  return platform;
}

/**
 * In development, logs `message` once per method and key.
 */
export function warnOnce(method: string, key: string, message: string): void {
  if (!__DEV__) {
    return;
  }
  const id = `${method}:${key}`;
  if (warned.has(id)) {
    return;
  }
  warned.add(id);
  console.warn(`[react-native-oauth-essentials] ${method}: ${message}`);
}
