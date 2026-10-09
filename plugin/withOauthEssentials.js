/**
 * Expo config plugin of react-native-oauth-essentials.
 *
 *   plugins: [
 *     ['react-native-oauth-essentials', {
 *       google: { iosClientId: '1234-abcd.apps.googleusercontent.com', webClientId: '...' },
 *       appleSignIn: true,
 *       webCredentialsDomains: ['example.com'],
 *     }],
 *   ]
 *
 * - google: `{ iosClientId?, webClientId? }`, or `true` to only use the Firebase files
 *   (`ios.googleServicesFile` / `android.googleServicesFile`) for the missing ids. Writes:
 *   - iOS: the reversed iOS client id URL scheme (without it GoogleSignIn cannot open), and
 *     GIDClientID / GIDServerClientID to Info.plist;
 *   - Android: the web client id as the `com.oauthessentials.GOOGLE_WEB_CLIENT_ID` meta-data.
 *   So the app can call `googleSignIn()` without client ids.
 * - appleSignIn: adds the Sign in with Apple entitlement.
 * - webCredentialsDomains: adds `webcredentials:<domain>` associated domains (passkeys and
 *   saved passwords).
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_NAME = 'react-native-oauth-essentials';
const APPLE_SIGN_IN_ENTITLEMENT = 'com.apple.developer.applesignin';
const ASSOCIATED_DOMAINS_ENTITLEMENT = 'com.apple.developer.associated-domains';
const GOOGLE_WEB_CLIENT_ID_META_DATA =
  'com.oauthessentials.GOOGLE_WEB_CLIENT_ID';

// OAuth client types in google-services.json.
const IOS_CLIENT_TYPE = 2;
const WEB_CLIENT_TYPE = 3;

/**
 * Same rule as GoogleSignIn (GIDSignInCallbackSchemes): the client id components in reverse order.
 */
function googleUrlScheme(iosClientId) {
  return iosClientId.split('.').reverse().join('.');
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * `CLIENT_ID` (the iOS client id) of a Firebase GoogleService-Info.plist, which Firebase always
 * writes as XML.
 */
function googleIdsFromServicesPlist(xml) {
  const match = /<key>\s*CLIENT_ID\s*<\/key>\s*<string>([^<]*)<\/string>/.exec(
    xml
  );
  return { iosClientId: nonEmpty(match && match[1]) };
}

/**
 * Web and iOS client ids of a Firebase google-services.json: the `client` of `androidPackage`
 * (or the first one), its `oauth_client` and `appinvite_service.other_platform_oauth_client`.
 * The iOS client must match `bundleIdentifier` when it is known.
 */
function googleIdsFromServicesJson(
  json,
  { androidPackage, bundleIdentifier } = {}
) {
  const clients = Array.isArray(json && json.client) ? json.client : [];
  const client =
    clients.find(
      (item) =>
        androidPackage &&
        item.client_info &&
        item.client_info.android_client_info &&
        item.client_info.android_client_info.package_name === androidPackage
    ) || clients[0];
  if (!client) {
    return {};
  }
  const oauthClients = [
    ...(client.oauth_client || []),
    ...((client.services &&
      client.services.appinvite_service &&
      client.services.appinvite_service.other_platform_oauth_client) ||
      []),
  ];
  const web = oauthClients.find((item) => item.client_type === WEB_CLIENT_TYPE);
  const ios = oauthClients.find(
    (item) =>
      item.client_type === IOS_CLIENT_TYPE &&
      (!bundleIdentifier ||
        (item.ios_info && item.ios_info.bundle_id === bundleIdentifier))
  );
  return {
    webClientId: nonEmpty(web && web.client_id),
    iosClientId: nonEmpty(ios && ios.client_id),
  };
}

/**
 * Explicit ids win over the ones read from the Firebase files.
 */
function resolveGoogleIds(google, fromPlist = {}, fromJson = {}) {
  const explicit = typeof google === 'object' && google !== null ? google : {};
  return {
    iosClientId:
      nonEmpty(explicit.iosClientId) ||
      fromPlist.iosClientId ||
      fromJson.iosClientId,
    webClientId: nonEmpty(explicit.webClientId) || fromJson.webClientId,
  };
}

/**
 * Reads the Firebase files set in the app config (paths relative to the project root).
 */
function loadGoogleIds(config, google, projectRoot) {
  const read = (file) =>
    file ? fs.readFileSync(path.resolve(projectRoot, file), 'utf8') : null;
  const plist = read(config.ios && config.ios.googleServicesFile);
  const json = read(config.android && config.android.googleServicesFile);
  return resolveGoogleIds(
    google,
    plist ? googleIdsFromServicesPlist(plist) : {},
    json
      ? googleIdsFromServicesJson(JSON.parse(json), {
          androidPackage: config.android && config.android.package,
          bundleIdentifier: config.ios && config.ios.bundleIdentifier,
        })
      : {}
  );
}

function setGoogleInfoPlist(infoPlist, google) {
  if (!google) {
    return infoPlist;
  }
  const iosClientId = nonEmpty(google.iosClientId);
  if (!iosClientId) {
    throw new Error(
      `${PLUGIN_NAME}: no Google iOS client id. Set "google": { "iosClientId": "..." } in the plugin ` +
        'options, or "ios.googleServicesFile" to a Firebase GoogleService-Info.plist'
    );
  }
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
  const webClientId = nonEmpty(google.webClientId);
  if (webClientId) {
    result.GIDServerClientID = webClientId;
  }
  return result;
}

/**
 * Sets the web client id `<meta-data>` of `<application>` (AndroidManifest as parsed by Expo),
 * replacing a previous value.
 */
function setGoogleWebClientIdMetaData(androidManifest, webClientId) {
  const manifest = androidManifest.manifest;
  const applications = manifest.application || [];
  if (applications.length === 0) {
    throw new Error(`${PLUGIN_NAME}: AndroidManifest.xml has no <application>`);
  }
  const [application, ...rest] = applications;
  const metaData = (application['meta-data'] || []).filter(
    (item) =>
      !item.$ || item.$['android:name'] !== GOOGLE_WEB_CLIENT_ID_META_DATA
  );
  metaData.push({
    $: {
      'android:name': GOOGLE_WEB_CLIENT_ID_META_DATA,
      'android:value': webClientId,
    },
  });
  return {
    ...androidManifest,
    manifest: {
      ...manifest,
      application: [{ ...application, 'meta-data': metaData }, ...rest],
    },
  };
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
    withAndroidManifest,
    WarningAggregator,
  } = require('expo/config-plugins');

  let result = config;
  if (options.google) {
    result = withInfoPlist(result, (mod) => {
      const ids = loadGoogleIds(
        mod,
        options.google,
        mod.modRequest.projectRoot
      );
      if (!ids.webClientId) {
        WarningAggregator.addWarningIOS(
          PLUGIN_NAME,
          'no Google web client id, so GIDServerClientID is not set (the idToken audience is the iOS ' +
            'client id). Set "google": { "webClientId": "..." } or "android.googleServicesFile".'
        );
      }
      mod.modResults = setGoogleInfoPlist(mod.modResults, ids);
      return mod;
    });
    result = withAndroidManifest(result, (mod) => {
      const ids = loadGoogleIds(
        mod,
        options.google,
        mod.modRequest.projectRoot
      );
      if (!ids.webClientId) {
        WarningAggregator.addWarningAndroid(
          PLUGIN_NAME,
          'no Google web client id: googleSignIn() rejects with CONFIGURATION_ERROR on Android unless ' +
            'it receives { webClientId }. Set "google": { "webClientId": "..." } or ' +
            '"android.googleServicesFile".'
        );
        return mod;
      }
      mod.modResults = setGoogleWebClientIdMetaData(
        mod.modResults,
        ids.webClientId
      );
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
module.exports.googleIdsFromServicesPlist = googleIdsFromServicesPlist;
module.exports.googleIdsFromServicesJson = googleIdsFromServicesJson;
module.exports.resolveGoogleIds = resolveGoogleIds;
module.exports.setGoogleInfoPlist = setGoogleInfoPlist;
module.exports.setGoogleWebClientIdMetaData = setGoogleWebClientIdMetaData;
module.exports.setEntitlements = setEntitlements;
