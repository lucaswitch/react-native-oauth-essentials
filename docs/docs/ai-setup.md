---
sidebar_position: 2.5
---

# Setup with AI agents

Using a coding agent (Claude Code, Cursor, Copilot, Codex…)? Copy the prompt below and paste it in the agent's chat,
from your app's root folder. It guides the agent through installing and configuring the library for the features you
choose, and tells it which values it must ask you for instead of guessing.

You can also save it as `AGENTS.md` / `CLAUDE.md` content so the agent keeps it as context.

:::tip
Use the copy button in the top right corner of the block.
:::

````md title="Prompt"
You are setting up the React Native library `react-native-oauth-essentials` in this app.
Docs: https://lucaswitch.github.io/react-native-oauth-essentials/docs/intro
Exact API reference: https://lucaswitch.github.io/react-native-oauth-essentials/docs/methods

## Rules

- Never invent values. Ask me for anything you cannot read from the project: OAuth client ids, domains, backend URLs,
  Apple Team ID. Use clearly named placeholders (e.g. `YOUR_IOS_CLIENT_ID`) only if I tell you to continue without them.
- Never put client secrets in the app.
- Only configure the features I choose. Do not touch unrelated native config.
- Show me every native file you change (Info.plist, entitlements, AndroidManifest.xml, Podfile, app.json).
- At the end, list what I still have to do outside the code (consoles, servers, real device tests).

## Step 0: inspect the project and ask me

1. Detect the package manager (yarn / npm / pnpm / bun), the React Native version, and whether it is bare React Native
   or Expo.
2. The library is a TurboModule and only works with the **New Architecture** enabled (`newArchEnabled=true` in
   `android/gradle.properties`, `RCT_NEW_ARCH_ENABLED=1` / default on iOS; it is the default since RN 0.76). Check it.
3. Expo: it is **not** supported in Expo Go; it needs a development build (`npx expo prebuild` +
   `npx expo run:ios|android`, or EAS Build). Do the iOS native config with the library's config plugin in `app.json`
   (`["react-native-oauth-essentials", { "google": { "iosClientId", "webClientId" }, "appleSignIn": true,
   "webCredentialsDomains": ["<domain>"] }]`, only the keys of the chosen features) instead of editing the generated
   `ios/` folder: see https://lucaswitch.github.io/react-native-oauth-essentials/docs/expo. Android needs nothing from
   the plugin; any Android change below that is not in the plugin (custom redirect intent filter) is lost when
   `android/` is regenerated, so tell me about it.
4. Read the iOS bundle identifier (Xcode project / `app.json`) and the Android `applicationId`
   (`android/app/build.gradle`).
5. Ask me which features I want: Google, Apple, saved passwords, passkeys, generic OAuth/OpenID Connect provider,
   hybrid sign in (one picker with the credentials the user already has, for app start).

## Step 1: install

1. Install `react-native-oauth-essentials` with the project's package manager.
2. iOS: `cd ios && pod install` (or `bundle exec pod install` if there is a Gemfile).
3. Android: nothing to link. Minimum SDK is 24. The library manifest already registers its `CustomTabsActivity`.

## Step 2: Google (if chosen)

Ask me for the client ids. They come from Google Cloud Console > APIs & Services > Credentials, all in the same project:

- **Web client id**: `webClientId`. Android passes it to Credential Manager; iOS uses it as the default
  `serverClientId` (idToken audience and `serverAuthCode`).
- **Android client id**: never passed in code, but must exist with the `applicationId` and the SHA-1 of every signing
  key (debug, release, and the Play App Signing key). Get debug/release SHA-1 with `cd android && ./gradlew signingReport`
  and show them to me.
- **iOS client id**: created with the iOS bundle id. It is the `iosClientId` (a web client id does not work as the iOS
  client id).

iOS config: the reversed iOS client id (split by `.`, reversed, joined) must be a URL scheme in `ios/<App>/Info.plist`.
If it is missing, `googleSignIn` / `googleSilentSignIn` reject with `CONFIGURATION_ERROR` and the error `message` has the
exact scheme to add. Expo: use the plugin's `google` option instead (it adds the scheme plus `GIDClientID` /
`GIDServerClientID`).

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- 1234-abcd.apps.googleusercontent.com becomes: -->
      <string>com.googleusercontent.apps.1234-abcd</string>
    </array>
  </dict>
</array>
```

Merge with an existing `CFBundleURLTypes` array instead of adding a second key.

Code:

```ts
import { googleSignIn, CredentialsType } from 'react-native-oauth-essentials';

// Each platform picks its own: iOS uses iosClientId (+ webClientId as serverClientId), Android uses webClientId.
const GOOGLE_CLIENT_IDS = { iosClientId: IOS_CLIENT_ID, webClientId: WEB_CLIENT_ID };

const result = await googleSignIn(GOOGLE_CLIENT_IDS, {
  mode: 'button', // Android: use 'button' when the user taps a "Sign in with Google" button
  // nonce, hostedDomain, scopes, offlineAccess: see the docs, behavior differs per platform
});
if (result.type === CredentialsType.GOOGLE_ID) {
  // send result.data.idToken to the backend; use the token's `sub` as the user id
  // (result.data.id is the Google id on iOS but the email on Android)
}
```

Also wire `googleSilentSignIn(GOOGLE_CLIENT_IDS)` on app start to restore the session (rejects with
`NO_SIGN_IN_AVAILABLE` when there is none) and `signOut()` on logout.

## Step 3: Apple (if chosen)

iOS (native):
- Add the **Sign in with Apple** capability: an entitlements file with
  `com.apple.developer.applesignin` = `["Default"]`, referenced by `CODE_SIGN_ENTITLEMENTS` in the target (Expo: the
  plugin's `appleSignIn: true`). Tell me to enable it on the App ID in the Apple Developer portal.
- Apple only sends `email` and `fullName` on the **first** authorization. The library keeps them in memory only, so send
  them to the backend right away.
- On app start, call `getAppleIdCredentialState(user)` and sign out locally when it is not `AUTHORIZED`. Also register
  `addAppleIdCredentialRevokedListener`.
- Pass `{ nonce }` (SHA-256 of a raw nonce when using Firebase/Supabase).

Android (web flow, needs a backend):
- `appleSignIn(androidWebUrl)` opens `androidWebUrl` in a Custom Tab. The backend runs Sign in with Apple for web (Services
  ID) and must finish by redirecting to `<applicationId>://oauth/callback` (the exported `OAUTH_REDIRECT_URI`), with
  whatever the app needs in the query. The result is `WEB_APPLE_ID` with that url.
- `options` are ignored on Android: put the nonce/state in `androidWebUrl`.
- Ask me for the backend URL. If there is no backend, tell me Apple on Android is not possible without one; do not
  build a fake flow.

## Step 4: saved passwords (if chosen)

- `getPassword()` shows the passwords saved for the app. On both platforms it resolves `CANCELLED` when the user
  dismisses it or there is no saved password (it never resolves `false`).
  - iOS: needs the `webcredentials:<domain>` Associated Domain (see passkeys) for iOS to match saved passwords.
- `passwordSignIn(username, password)` only **saves** a password, it does not authenticate. On iOS it does nothing:
  set `textContentType="username"` / `"password"` / `"newPassword"` (and `autoComplete`) on the inputs instead.
- Gate the UI with `PASSWORD_SUPPORTED` (on Android it is false without Google Play Services, which the methods need).

## Step 5: passkeys (if chosen)

Ask me for the relying party domain (the `rp.id`, e.g. `example.com`). The server generates the WebAuthn options and
verifies the responses; the app only forwards JSON.

- iOS 16+: add the Associated Domains capability with `webcredentials:<domain>` to the entitlements (Expo: the plugin's
  `webCredentialsDomains`). Tell me the server
  must serve `https://<domain>/.well-known/apple-app-site-association` with
  `{"webcredentials":{"apps":["<TEAM_ID>.<bundle id>"]}}`.
- Android 9+: tell me the server must serve `https://<domain>/.well-known/assetlinks.json` with the
  `delegate_permission/common.handle_all_urls` and `delegate_permission/common.get_login_creds` relations for the
  `applicationId` and the SHA-256 of every signing key (`./gradlew signingReport`).
- Code: `createPassKey({ requestJson })` to register and `getPassKey({ requestJson })` to sign in, where `requestJson` is
  the server's options JSON string; send `result.data` (a JSON string) back to the server. On iOS,
  `getPassKey({ requestJson, mediation: 'autofill' })` shows passkeys in the keyboard of a `textContentType="username"`
  input; call `cancelPassKeyAutoFill()` when that screen unmounts.
- Gate the UI with `PASSKEYS_SUPPORTED`.

## Step 6: generic OAuth / OpenID Connect (if chosen)

Ask me for the provider's authorization endpoint, client id, scopes, and whether the code is exchanged by the backend
(recommended) or on the device (only for public clients with PKCE; never with a client secret).

- Redirect URI: use the exported `OAUTH_REDIRECT_URI` (`<bundle id, lowercased>://oauth/callback` on iOS,
  `<applicationId>://oauth/callback` on Android) and tell me to register both exactly in the provider.
  - iOS needs no Info.plist change for it.
  - Android: the library already handles that URI. For a custom `redirectUri`, add an intent filter for it to the
    library activity in the app manifest (declare `xmlns:tools="http://schemas.android.com/tools"` on `<manifest>`):

```xml
<activity android:name="com.oauthessentials.CustomTabsActivity" tools:node="merge">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="my.custom.scheme" android:host="oauth" android:path="/callback" />
  </intent-filter>
</activity>
```

- Code: `oauthSignIn({ authorizationEndpoint, clientId, scopes, tokenEndpoint? })`. Without `tokenEndpoint`, send
  `result.data.code`, `codeVerifier` and `redirectUri` to the backend.

## Step 7: hybrid sign in (if chosen)

`hybridSignIn(GOOGLE_CLIENT_IDS, { authorizedAccounts: true })` on app start (Android uses `webClientId`). Providers
differ:
- iOS: Apple ID + saved passwords only (Google is not offered, the client id is ignored).
- Android: Google + saved passwords only (needs Play Services; gate it with `HYBRID_SUPPORTED`).
Treat `CANCELLED` as "show the normal sign in screen", not as an error.

## Step 8: integrate in the app

Create one auth module (e.g. `src/auth/`) that wraps the calls and follows these contracts:

- Dismissing any UI **resolves** `{ type: 'CANCELLED', data: null }`. Do not show an error for it.
- Errors reject with `error.code` from `CredentialError`. Narrow them in `catch` with
  `isCredentialError(e, CredentialError.X)` (or `isCredentialError(e)` for any library error). Handle at least:
  - `CONFIGURATION_ERROR` (missing client id, missing iOS URL scheme, invalid `redirectUri`): a setup bug, log
    `e.message` (it says what to fix) and do not show it as a user error;
  - `BROWSER_UNAVAILABLE` (iOS: app not active, Guided Access; Android: no browser), to ask the user to retry;
  - `NETWORK_ERROR` (`oauthSignIn` token request failed), to ask the user to retry;
  - `NOT_SUPPORTED_ERROR` (Android without Play Services, passkeys on old OS);
  - `NO_SIGN_IN_AVAILABLE` (nothing to restore / no account);
  - `SIMULTANEOUS_CALL_ERROR` (iOS: the same flow is already open; disable the button while pending).
- In development, the library logs a `console.warn` when an option has no effect on the current platform. Do not
  silence it; remove the option or make it platform specific.
- Always verify tokens on the backend (Google `idToken`, Apple `idToken`/`authorizationCode`).
- Optional analytics: `addCredentialSuccessListener` / `addCredentialFailureListener`. Remove subscriptions on unmount.

## Step 9: verify

1. Run the project's typecheck and lint. If the project has Jest tests, add
   `jest.mock('react-native-oauth-essentials', () => require('react-native-oauth-essentials/jest'));` to the Jest setup
   file (`setupFiles`) so tests do not fail with a `TurboModuleRegistry.getEnforcing` error, and run them.
2. Build iOS (`npx react-native run-ios` or `xcodebuild`) and Android (`cd android && ./gradlew assembleDebug`) and fix
   build errors.
3. Report what you could not verify and what I must do by hand: console setup, SHA fingerprints, server files
   (apple-app-site-association, assetlinks.json, Apple web flow), and testing on real devices. Google on Android needs a
   device/emulator with Google Play; passkeys need a real device or an emulator with a Google account and screen lock.
````

## What the prompt covers

| Feature | Native config the agent does | What you still do |
|---|---|---|
| Google | iOS URL scheme (Expo plugin or Info.plist), `{ iosClientId, webClientId }` in code | Create the Web, Android (SHA-1) and iOS client ids |
| Apple | iOS entitlement (Expo plugin or entitlements file), Android redirect | Enable it on the App ID; Android backend web flow |
| Passwords | `textContentType` on inputs | Associated domain (iOS) |
| Passkeys | Associated Domains entitlement (Expo plugin or entitlements file) | Serve `apple-app-site-association` and `assetlinks.json` |
| Tests | Jest mock in the setup file | |
| Generic OAuth | Custom redirect intent filter (Android) | Register the redirect URIs in the provider |
