/**
 * Expo config plugin of react-native-oauth-essentials (iOS native config).
 *
 *   plugins: [
 *     ['react-native-oauth-essentials', {
 *       google: { iosClientId: '1234-abcd.apps.googleusercontent.com', webClientId: '...' },
 *       appleSignIn: true,
 *       webCredentialsDomains: ['example.com'],
 *     }],
 *   ]
 *
 * - google: adds the reversed iOS client id URL scheme (without it GoogleSignIn cannot open), and
 *   GIDClientID / GIDServerClientID to Info.plist, so `googleSignIn({ webClientId })` works on iOS
 *   without passing `iosClientId`.
 * - appleSignIn: adds the Sign in with Apple entitlement.
 * - webCredentialsDomains: adds `webcredentials:<domain>` associated domains (passkeys and
 *   saved passwords).
 *
 * Android needs no native config from this plugin.
 */

const APPLE_SIGN_IN_ENTITLEMENT = 'com.apple.developer.applesignin';
const ASSOCIATED_DOMAINS_ENTITLEMENT = 'com.apple.developer.associated-domains';

/**
 * Same rule as GoogleSignIn (GIDSignInCallbackSchemes): the client id components in reverse order.
 */
function googleUrlScheme(iosClientId) {
  return iosClientId.split('.').reverse().join('.');
}

function setGoogleInfoPlist(infoPlist, google) {
  if (!google) {
    return infoPlist;
  }
  if (typeof google.iosClientId !== 'string' || !google.iosClientId.trim()) {
    throw new Error(
      'react-native-oauth-essentials: the "google" option needs "iosClientId" (the iOS OAuth client id)'
    );
  }
  const iosClientId = google.iosClientId.trim();
  const scheme = googleUrlScheme(iosClientId);
  const urlTypes = Array.isArray(infoPlist.CFBundleURLTypes)
    ? infoPlist.CFBundleURLTypes
    : [];
  const registered = urlTypes.some(
    (type) =>
      Array.isArray(type.CFBundleURLSchemes) &&
      type.CFBundleURLSchemes.some(
        (value) => String(value).toLowerCase() === scheme.toLowerCase()
      )
  );

  const result = {
    ...infoPlist,
    CFBundleURLTypes: registered
      ? urlTypes
      : [...urlTypes, { CFBundleURLSchemes: [scheme] }],
    GIDClientID: iosClientId,
  };
  if (typeof google.webClientId === 'string' && google.webClientId.trim()) {
    result.GIDServerClientID = google.webClientId.trim();
  }
  return result;
}

function setEntitlements(entitlements, options) {
  const result = { ...entitlements };
  if (options.appleSignIn) {
    result[APPLE_SIGN_IN_ENTITLEMENT] = ['Default'];
  }
  const domains = options.webCredentialsDomains || [];
  if (domains.length > 0) {
    const current = Array.isArray(result[ASSOCIATED_DOMAINS_ENTITLEMENT])
      ? result[ASSOCIATED_DOMAINS_ENTITLEMENT]
      : [];
    const added = domains.map((domain) =>
      domain.startsWith('webcredentials:') ? domain : `webcredentials:${domain}`
    );
    result[ASSOCIATED_DOMAINS_ENTITLEMENT] = [
      ...new Set([...current, ...added]),
    ];
  }
  return result;
}

function withOauthEssentials(config, options = {}) {
  // Loaded lazily: only Expo apps have it, and the helpers above are tested without it.
  const {
    withInfoPlist,
    withEntitlementsPlist,
  } = require('expo/config-plugins');

  let result = config;
  if (options.google) {
    result = withInfoPlist(result, (mod) => {
      mod.modResults = setGoogleInfoPlist(mod.modResults, options.google);
      return mod;
    });
  }
  if (options.appleSignIn || (options.webCredentialsDomains || []).length > 0) {
    result = withEntitlementsPlist(result, (mod) => {
      mod.modResults = setEntitlements(mod.modResults, options);
      return mod;
    });
  }
  return result;
}

module.exports = withOauthEssentials;
module.exports.googleUrlScheme = googleUrlScheme;
module.exports.setGoogleInfoPlist = setGoogleInfoPlist;
module.exports.setEntitlements = setEntitlements;
