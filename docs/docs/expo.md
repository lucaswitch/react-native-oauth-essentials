---
sidebar_position: 2.2
---

# Expo

The library ships an Expo config plugin (`app.plugin.js`) that writes the iOS native config for you. It is **not**
supported in Expo Go: use a development build (`npx expo prebuild` / `npx expo run:ios`, or EAS Build). The New
Architecture must be enabled (the default since SDK 52).

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

Then regenerate the native project: `npx expo prebuild` (or `npx expo run:ios`, which runs it).

## Options

All options are optional and only change iOS files. Android needs nothing from the plugin.

| Option | Type | What it writes |
|---|---|---|
| `google` | `{ iosClientId: string; webClientId?: string }` | Info.plist: the reversed `iosClientId` URL scheme in `CFBundleURLTypes` (not added twice), `GIDClientID` = `iosClientId` and, with `webClientId`, `GIDServerClientID` = `webClientId` |
| `appleSignIn` | `boolean` | Entitlements: `com.apple.developer.applesignin` = `["Default"]` |
| `webCredentialsDomains` | `string[]` | Entitlements: `webcredentials:<domain>` for each domain in `com.apple.developer.associated-domains`, merged with the existing ones (used by passkeys and saved passwords) |

### `google`

`iosClientId` is required when `google` is set (prebuild fails without it). The URL scheme is the client id split by
`.`, reversed and joined: `1234-abcd.apps.googleusercontent.com` becomes `com.googleusercontent.apps.1234-abcd`.
Without it, Google Sign-In rejects with `CONFIGURATION_ERROR`.

Because `GIDClientID` and `GIDServerClientID` are in Info.plist, iOS can read the client ids from there, so you can pass
only the web client id in code:

```ts
import { googleSignIn } from 'react-native-oauth-essentials';

const result = await googleSignIn({ webClientId: WEB_CLIENT_ID }); // iOS reads GIDClientID from Info.plist
```

Passing `{ iosClientId, webClientId }` also works. See [Google Sign-In](./usage/google.md) and the
[Google OAuth setup](./google-oauth-setup.md) to create the client ids.

### `appleSignIn`

Adds the Sign in with Apple entitlement. You still need to enable Sign in with Apple on the App ID in the Apple
Developer portal (EAS Build can sync capabilities for you). See [Apple Sign-In](./usage/apple.md).

### `webCredentialsDomains`

Adds `webcredentials:` Associated Domains, needed by [passkeys](./usage/passkey.md) and for iOS to match
[saved passwords](./usage/keychain.md). Your server must still serve
`https://<domain>/.well-known/apple-app-site-association` (and `assetlinks.json` for Android passkeys).

## Android

Nothing to configure in the plugin:

- Google uses the web client id passed in code; the Android client id only has to exist in Google Cloud with your
  package name and SHA-1 fingerprints.
- The library manifest already registers the `CustomTabsActivity` that handles `OAUTH_REDIRECT_URI`
  (`<applicationId>://oauth/callback`).
