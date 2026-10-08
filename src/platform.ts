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
