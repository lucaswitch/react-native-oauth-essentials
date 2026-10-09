---
sidebar_position: 2
---

# Installation

:::tip Using a coding agent?
Copy the [setup prompt for AI agents](./ai-setup.md) and paste it in your agent to install and configure everything.
:::

Install the library via npm:

```bash
npm install react-native-oauth-essentials
```

```bash
yarn add react-native-oauth-essentials
```

Make sure to pod install to update the native part of your app:

```
cd ios;
pod install; or // bundle exec pod install
```

## Expo

Expo Go is not supported. Use a development build and the config plugin, which writes the native config described
below (from the client ids or the Firebase files): see [Expo](./expo.md).

## Configuration

### Google OAuth Client ID Setup

Enabling Google Sign-In in your app requires **three** OAuth client ids, all created in the **same** Google Cloud
project. See the [Google OAuth setup guide](./google-oauth-setup.md) for every step.

#### Creating Google ID credentials in Google Cloud Console

If you already have the credentials in hand you can skip this step.

1. **Open or create a project**
   Open your project in the [Google Cloud Console](https://console.cloud.google.com/), or create a new project if you
   don't already have one.

2. **Complete the branding information**
   Go to the **Branding** page and make sure all information is complete and accurate.

3. **Set app details**
   Ensure your app has the following properly assigned:

- **App Name**
- **App Logo**
- **App Homepage**

> These values will be displayed to users on the **Sign in with Google** consent screen during sign-up and on the
> **Third-party apps & services** screen.

4. **Specify policy URLs**
   Provide URLs for your app's **Privacy Policy** and **Terms of Service**.

5. **Create the client ids**
   On the **Clients** page, create:

| Client | Created with | Used as |
|---|---|---|
| **Web application** | Nothing (no redirect URIs needed) | `webClientId`: the client id of Android Credential Manager, and the iOS `serverClientId` (idToken audience, `serverAuthCode`) |
| **Android** | Package name (`applicationId`) + SHA-1 of **every** signing key: debug, release and the Play App Signing key | Never passed in code. Google only checks that it exists for your package and signature |
| **iOS** | Bundle id | `iosClientId` |

:::tip Using Firebase?
Enable Google as a sign-in provider in Firebase Authentication and add your SHA-1 fingerprints to the Firebase Android
app: Firebase creates the three OAuth clients for you, and its `GoogleService-Info.plist` / `google-services.json`
contain the ids.
:::

Put the ids in the native config (see [iOS Setup](#ios-setup) and [Android Setup](#android-setup)) and call the
methods without client ids:

```ts
import { googleSignIn } from 'react-native-oauth-essentials';

const result = await googleSignIn({ mode: 'button' }); // or googleSignIn()
```

Or pass them as an object (a passed id wins over the config); each platform picks the one it needs:

```ts
const GOOGLE_CLIENT_IDS = {
  iosClientId: '1234-abcd.apps.googleusercontent.com',
  webClientId: '5678-efgh.apps.googleusercontent.com',
};

const result = await googleSignIn(GOOGLE_CLIENT_IDS, { mode: 'button' });
```

### iOS Setup

Google Sign-In needs the **reversed iOS client id** as a URL scheme: the client id split by `.`, reversed and joined.
`1234-abcd.apps.googleusercontent.com` becomes `com.googleusercontent.apps.1234-abcd`. Add it to
`ios/YOUR_APP_NAME/Info.plist` (merge it with an existing `CFBundleURLTypes` array instead of adding a second key):

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.1234-abcd</string>
        </array>
    </dict>
</array>
<!-- Lets you call googleSignIn() without iosClientId / webClientId on iOS -->
<key>GIDClientID</key>
<string>1234-abcd.apps.googleusercontent.com</string>
<key>GIDServerClientID</key>
<string>5678-efgh.apps.googleusercontent.com</string>
```

When no client id is passed, iOS reads `GIDClientID`, then `CLIENT_ID` of the Firebase `GoogleService-Info.plist` if
it is in the app target; the `serverClientId` falls back to `webClientId`, then `GIDServerClientID`. The URL scheme is
always required (with Firebase it is `REVERSED_CLIENT_ID` of `GoogleService-Info.plist`).

When the scheme or the client id is missing, `googleSignIn` and `googleSilentSignIn` reject with `CONFIGURATION_ERROR`
and the error `message` says what to add (instead of crashing the app). With Expo, the plugin's `google` option adds the
scheme and both keys.

### Android Setup

The library manifest already registers its activities. To call `googleSignIn()` without client ids, add the **web**
client id inside `<application>` of `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.oauthessentials.GOOGLE_WEB_CLIENT_ID"
    android:value="5678-efgh.apps.googleusercontent.com" />
```

Without it, the library uses the `default_web_client_id` string that the Firebase `google-services` Gradle plugin
generates from `google-services.json`. With neither (and no `webClientId` passed), the call rejects with
`CONFIGURATION_ERROR`. With Expo, the plugin's `google` option writes the meta-data.

Make sure the Android client id exists with your package name and the SHA-1 of every signing key
(`cd android && ./gradlew signingReport`).

There you go, you're ready to use it!

## Troubleshooting

If importing the library throws `the native module "OauthEssentials" was not found`, the app binary does not contain it:
rebuild after installing (`pod install` in `ios/`, then build again; reloading Metro is not enough) and make sure the New
Architecture is enabled. In Expo Go, the error says the library does not work there: use a
[development build](./expo.md#why-it-does-not-run-in-expo-go).

## Testing

To use the library in Jest tests, mock it with `react-native-oauth-essentials/jest`: see [Testing with Jest](./testing.md).
