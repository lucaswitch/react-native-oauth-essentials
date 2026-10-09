---
sidebar_position: 2.2
---

# Expo

The library ships an Expo config plugin (`app.plugin.js`) that writes the native config for you. It is **not**
supported in Expo Go (see [why](#why-it-does-not-run-in-expo-go)): use a development build (`npx expo prebuild` /
`npx expo run:ios` / `npx expo run:android`, or EAS Build). The New Architecture must be enabled (the default since
SDK 52).

## Setup

```bash
npx expo install react-native-oauth-essentials
```

Add the plugin to `app.json` (or `app.config.js`) with only the features you use:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-oauth-essentials",
        {
          "google": {
            "iosClientId": "1234-abcd.apps.googleusercontent.com",
            "webClientId": "5678-efgh.apps.googleusercontent.com"
          },
          "appleSignIn": true,
          "webCredentialsDomains": ["example.com"]
        }
      ]
    ]
  }
}
```

Then regenerate the native project: `npx expo prebuild` (or `npx expo run:ios` / `npx expo run:android`, which run it).

## Options

All options are optional.

| Option | Type | iOS | Android |
|---|---|---|---|
| `google` | `true \| { iosClientId?: string; webClientId?: string }` | Info.plist: the reversed iOS client id URL scheme in `CFBundleURLTypes` (not added twice), `GIDClientID` = iOS client id and, when a web client id is found, `GIDServerClientID` = web client id | AndroidManifest: `<meta-data android:name="com.oauthessentials.GOOGLE_WEB_CLIENT_ID">` = web client id |
| `appleSignIn` | `boolean` | Entitlements: `com.apple.developer.applesignin` = `["Default"]` | Nothing |
| `webCredentialsDomains` | `string[]` | Entitlements: `webcredentials:<domain>` for each domain in `com.apple.developer.associated-domains`, merged with the existing ones (used by passkeys and saved passwords) | Nothing |

### `google`

The client ids come from the plugin options or, when missing, from the [Firebase config files](#using-firebase-config-files)
set in the Expo config. Ids passed to the plugin win over the files.

- **iOS client id**: required (prebuild fails with a clear error when none is found). The URL scheme is the client id
  split by `.`, reversed and joined: `1234-abcd.apps.googleusercontent.com` becomes
  `com.googleusercontent.apps.1234-abcd`. Without it, Google Sign-In rejects with `CONFIGURATION_ERROR`.
- **Web client id**: prebuild only warns when none is found. Android sign in then rejects with `CONFIGURATION_ERROR`
  (unless you pass `{ webClientId }` in code), and the iOS idToken audience is the iOS client id.

Because the ids are in Info.plist and AndroidManifest, the native side reads them from there, so call the methods
without client ids:

```ts
import { googleSignIn } from 'react-native-oauth-essentials';

const result = await googleSignIn(); // or googleSignIn({ mode: 'button' })
```

Passing `{ iosClientId, webClientId }` in code also works and wins over the config. See
[Google Sign-In](./usage/google.md) and the [Google OAuth setup](./google-oauth-setup.md) to create the client ids.

### Using Firebase config files

With Firebase, set `google: true` and point the Expo config to the Firebase files: the plugin reads the ids from them.

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.example.app",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [["react-native-oauth-essentials", { "google": true }]]
  }
}
```

- `ios.googleServicesFile`: `CLIENT_ID` is the iOS client id.
- `android.googleServicesFile` (`google-services.json`): the web client id is the OAuth client with `client_type` 3,
  and the iOS client id (when the plist does not give one) is the `client_type` 2 client whose `ios_info.bundle_id`
  matches `ios.bundleIdentifier`.

When Google is enabled as a sign-in provider in Firebase Authentication (and the SHA-1 is added to the Firebase
Android app), Firebase creates the web, Android and iOS OAuth clients itself; download the config files again after
that so they contain the ids.

### `appleSignIn`

Adds the Sign in with Apple entitlement. You still need to enable Sign in with Apple on the App ID in the Apple
Developer portal (EAS Build can sync capabilities for you). See [Apple Sign-In](./usage/apple.md).

### `webCredentialsDomains`

Adds `webcredentials:` Associated Domains, needed by [passkeys](./usage/passkey.md) and for iOS to match
[saved passwords](./usage/keychain.md). Your server must still serve
`https://<domain>/.well-known/apple-app-site-association` (and `assetlinks.json` for Android passkeys).

## Android

- Google needs the web client id, written by the `google` option as manifest meta-data (or passed in code). The
  Android client id is never used directly: it only has to exist in Google Cloud with your package name and SHA-1
  fingerprints.
- The library manifest already registers the `CustomTabsActivity` that handles `OAUTH_REDIRECT_URI`
  (`<applicationId>://oauth/callback`).

## Why it does not run in Expo Go

Expo Go is a prebuilt app from the stores that only contains the native modules of the Expo SDK. Your JavaScript is
loaded into it, but native code (the library's Swift and Kotlin, the GoogleSignIn SDK) cannot be added at runtime, and
its URL schemes, entitlements and bundle id belong to Expo Go, not to your app. Use a development build
(`npx expo run:ios` / `npx expo run:android` or `eas build --profile development`).

In Expo Go, importing the library throws:

```
react-native-oauth-essentials does not work in Expo Go, which only contains the Expo SDK native code. Create a
development build instead: `npx expo run:ios` / `npx expo run:android` or `eas build --profile development`.
```
