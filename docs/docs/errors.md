---
sidebar_position: 6.5
---

# Errors

Every error the library can produce: the codes the promises reject with, which method rejects with which code, the
errors without a code and the warnings shown in development.

## How errors work

- **Cancellation is not an error.** When the user dismisses the UI, methods resolve
  `{ type: 'CANCELLED', data: null }` ([`CancelledCredentialResult`](./types#cancelledcredentialresult)).
- **Errors reject** with an `Error` that has a `code` from [`CredentialError`](./types#credentialerror) and the native
  error text in `message` ([`OauthEssentialsError`](./types#oauthessentialserror)).
- **Check the code with [`isCredentialError`](./types#iscredentialerrorerror-code)** instead of reading `error.code` on
  `unknown`. `message` is meant for logs: it comes from the OS or the provider, may change between versions and is not
  translated.

```ts
import { googleSignIn, isCredentialError, CredentialError, CredentialsType } from 'react-native-oauth-essentials';

async function signInWithGoogle() {
  try {
    const result = await googleSignIn({ mode: 'button' });
    if (result.type === CredentialsType.CANCELLED) return; // the user closed the UI
    await api.signInWithGoogle(result.data.idToken);
  } catch (e) {
    if (!isCredentialError(e)) throw e;
    switch (e.code) {
      case CredentialError.CONFIGURATION_ERROR:
        console.error(e.message); // a bug in the app setup, the message says what to fix
        break;
      case CredentialError.NOT_SUPPORTED_ERROR:
        showMessage('Update Google Play Services to sign in with Google.');
        break;
      case CredentialError.NO_SIGN_IN_AVAILABLE:
        showMessage('Add a Google account to this device to continue.');
        break;
      case CredentialError.BROWSER_UNAVAILABLE:
        showMessage('Could not open the sign in page. Try again.');
        break;
      default:
        report(e.code, e.message);
        showMessage('Sign in failed. Try again.');
    }
  }
}
```

## Error codes

| Code | Platform | Meaning | Usual handling |
|---|---|---|---|
| [`CONFIGURATION_ERROR`](#configuration_error) | Both | The app is misconfigured | Fix the setup (the `message` says what is missing) |
| [`NOT_SUPPORTED_ERROR`](#not_supported_error) | Both | The device, OS version or platform does not support the method | Hide the option, or ask to update Play Services |
| [`NO_SIGN_IN_AVAILABLE`](#no_sign_in_available) | Both | There is no credential to return | Show the normal sign in screen |
| [`BROWSER_UNAVAILABLE`](#browser_unavailable) | Both | The browser session could not be opened | Let the user try again |
| [`NO_ACTIVITY_ERROR`](#no_activity_error) | Both | No screen to present the UI from | Call the method again once a screen is visible |
| [`SIMULTANEOUS_CALL_ERROR`](#simultaneous_call_error) | iOS | The same method is still waiting for a previous call | Ignore it (the first call keeps going) |
| [`NETWORK_ERROR`](#network_error) | Both | `oauthSignIn` token request failed | Let the user try again |
| [`INVALID_RESULT_ERROR`](#invalid_result_error) | Both | The provider failed or returned something unexpected | Report it and let the user try again |
| `NO_PLAY_SERVICES_ERROR` | - | **Deprecated**, never used | Use `NOT_SUPPORTED_ERROR` |

### `CONFIGURATION_ERROR`

The app is misconfigured. It is a bug in the app setup, not something the user can fix: the `message` says exactly what
to change.

| Cause | Platform | Methods | Fix |
|---|---|---|---|
| No Google iOS client id: none passed, no `GIDClientID` in Info.plist and no `GoogleService-Info.plist` in the app | iOS | `googleSignIn`, `googleSilentSignIn` | Pass `{ iosClientId }`, or set it in the [Expo plugin](./expo.md) / Info.plist (see [Google client ids](./methods#google-client-ids)) |
| The reversed iOS client id is not in `CFBundleURLTypes` > `CFBundleURLSchemes` (the `message` has the exact scheme) | iOS | `googleSignIn` | Add the URL scheme to Info.plist (`REVERSED_CLIENT_ID` of `GoogleService-Info.plist`), or use the Expo plugin |
| No Google web client id: none passed, no `com.oauthessentials.GOOGLE_WEB_CLIENT_ID` meta-data and no `default_web_client_id` from Firebase | Android | `googleSignIn`, `googleSilentSignIn`, `hybridSignIn` | Pass `{ webClientId }`, or set it in the Expo plugin / AndroidManifest |
| `redirectUri` has no scheme | Both | `oauthSignIn` | Use a full uri like `com.example.app://oauth/callback`, or leave it out to use `OAUTH_REDIRECT_URI` |

:::tip
Without these checks GoogleSignIn on iOS raises a native exception that crashes the app. The library validates them
first, so you get a rejection instead.
:::

### `NOT_SUPPORTED_ERROR`

The method cannot run on this device. Check the [constants](./constants) to hide the option up front.

| Cause | Platform | Methods | Constant |
|---|---|---|---|
| Google Play Services missing or outdated | Android | `googleSignIn`, `googleSilentSignIn`, `hybridSignIn`, `getPassword`, `passwordSignIn`, `createPassKey`, `getPassKey` | `GOOGLE_PLAY_SERVICES_SUPPORTED` |
| Passkeys below iOS 16 / Android 9 | Both | `createPassKey`, `getPassKey` | `PASSKEYS_SUPPORTED` |
| No Apple credential state API | Android | `getAppleIdCredentialState` (always) | - |

### `NO_SIGN_IN_AVAILABLE`

There is nothing to sign in with. Show the normal sign in screen.

| Cause | Platform | Methods |
|---|---|---|
| No previous Google sign in to restore (never signed in, or after `signOut`) | Both | `googleSilentSignIn` |
| No Google account on the device, or none authorized with `authorizedAccounts: true` | Android | `googleSignIn`, `googleSilentSignIn`, `hybridSignIn` |
| No passkey for this app on the device | Android | `getPassKey` |

:::note
On iOS, `getPassword`, `hybridSignIn` and a modal `getPassKey` resolve `CANCELLED` when there is nothing to show,
because iOS does not tell "nothing available" apart from "dismissed".
:::

### `BROWSER_UNAVAILABLE`

The sign in page could not be opened in a browser.

| Cause | Platform | Methods |
|---|---|---|
| Guided Access is enabled | iOS | `googleSignIn`, `oauthSignIn` |
| The app did not become active within 2 seconds (e.g. called from the background) | iOS | `googleSignIn`, `oauthSignIn` |
| The app window is not in the foreground (e.g. Control Center or a system alert is over the app) | iOS | `googleSignIn`, `oauthSignIn` |
| The system refused to start `ASWebAuthenticationSession` (GoogleSignIn reports it as "Unable to open Safari.") | iOS | `googleSignIn`, `oauthSignIn` |
| `ASWebAuthenticationSession` reported a missing or invalid presentation context | iOS | `oauthSignIn` |
| No browser installed that can open the url | Android | `appleSignIn`, `oauthSignIn` |

### `NO_ACTIVITY_ERROR`

There is no screen to present the sign in UI from: no current Android `Activity`, or no iOS view controller attached
to a window. It usually means the method was called during app start before the first screen, or while the app is
going to the background.

| Platform | Methods |
|---|---|
| Android | Every method with UI: `googleSignIn`, `googleSilentSignIn`, `getPassword`, `passwordSignIn`, `appleSignIn`, `hybridSignIn`, `createPassKey`, `getPassKey`, `oauthSignIn` |
| iOS | `googleSignIn`, `oauthSignIn` |

### `SIMULTANEOUS_CALL_ERROR`

iOS only. A method was called again while its previous call is still pending. The new call rejects and the pending one
keeps going, so this is usually a double tap: ignore it, or disable the button while the promise is pending.

The calls that share a lock are listed in [Methods](./methods#conventions). A pending passkey AutoFill request
(`getPassKey({ mediation: 'autofill' })`) does not block other passkey calls: it resolves `CANCELLED` instead.

### `NETWORK_ERROR`

`oauthSignIn` with `tokenEndpoint`: the token request could not be sent or did not get a response (offline, DNS, TLS). The
original error is in `error.cause`. An HTTP error response is an `INVALID_RESULT_ERROR` instead.

### `INVALID_RESULT_ERROR`

The provider failed or returned something unexpected. `message` has the native or provider error.

| Cause | Platform | Methods |
|---|---|---|
| Any provider error that is not one of the codes above (Credential Manager, GoogleSignIn, `ASAuthorizationController`...) | Both | Every sign in method |
| Unexpected credential type returned | Both | `getPassword`, `appleSignIn`, `hybridSignIn`, `createPassKey`, `getPassKey` |
| `requestJson` missing or not valid JSON | Both | `createPassKey`, `getPassKey` |
| Invalid `androidWebUrl` | Android | `appleSignIn` |
| Invalid authorization url | Both | `oauthSignIn` |
| The redirect `state` does not match, the provider returned an `error` other than `access_denied`, or no `code` | Both | `oauthSignIn` |
| The token endpoint returned a non 2xx status (`message` is its `error_description` or `error`) or a non JSON body | Both | `oauthSignIn` |
| The Apple credential state check failed | iOS | `getAppleIdCredentialState` |
| Clearing the credential state failed | Android | `signOut` |

## Errors by method

✓ = both platforms, **i** = iOS only, **A** = Android only.

| Method | `CONFIGURATION` | `NOT_SUPPORTED` | `NO_SIGN_IN` | `BROWSER` | `NO_ACTIVITY` | `SIMULTANEOUS` | `NETWORK` | `INVALID_RESULT` |
|---|---|---|---|---|---|---|---|---|
| `googleSignIn` | ✓ | A | A | i | ✓ | i | | ✓ |
| `googleSilentSignIn` | ✓ | A | ✓ | | A | i | | ✓ |
| `signOut` | | | | | | | | A |
| `getPassword` | | A | | | A | i | | ✓ |
| `passwordSignIn` | | A | | | A | | | |
| `appleSignIn` | | | | A | A | i | | ✓ |
| `getAppleIdCredentialState` | | A | | | | | | i |
| `hybridSignIn` | A | A | A | | A | i | | ✓ |
| `createPassKey` | | ✓ | | | A | i | | ✓ |
| `getPassKey` | | ✓ | A | | A | i | | ✓ |
| `cancelPassKeyAutoFill` | | | | | | | | |
| `oauthSignIn` | ✓ | | | ✓ | ✓ | i | ✓ | ✓ |

The column names drop the suffixes: `NO_SIGN_IN` is `NO_SIGN_IN_AVAILABLE`, `BROWSER` is `BROWSER_UNAVAILABLE`, and so
on.

## Errors and events

[`addCredentialFailureListener`](./usage/events.md) receives `{ code, message }` for the rejections of `googleSignIn`,
`googleSilentSignIn`, `getPassword`, `appleSignIn`, `hybridSignIn`, `createPassKey`, `getPassKey` and the Android
rejections of `passwordSignIn`. It is **not** called for:

- `SIMULTANEOUS_CALL_ERROR`;
- the iOS `NOT_SUPPORTED_ERROR` below iOS 16 and the iOS missing `requestJson` error (passkeys);
- `signOut`, `getAppleIdCredentialState`, `cancelPassKeyAutoFill` and `oauthSignIn`, which never emit events.

## Errors without a code

These do not have a `CredentialError` code, so `isCredentialError` returns `false` for them.

| Error | When | Fix |
|---|---|---|
| `Error`: "react-native-oauth-essentials does not work in Expo Go…" | Thrown when the library is imported in Expo Go, which does not contain its native code | Use a development build: `npx expo run:ios` / `npx expo run:android` or `eas build --profile development` (see [Expo](./expo.md)) |
| `Error`: "the native module "OauthEssentials" was not found…" | Thrown on import when the app binary does not contain the library: it was not rebuilt after installing (reloading Metro is not enough), `pod install` was not run, or the New Architecture is off | Run `pod install` in `ios/`, rebuild the app and enable the New Architecture |
| Rejection with code `'CANCELLED'`: "Module is being invalidated" | Android: a pending `appleSignIn` / `oauthSignIn` browser session when the React Native instance is destroyed (e.g. a reload in development) | Nothing: the JS that was waiting is gone too |

## Development warnings

In development (`__DEV__`) the library logs a `console.warn` once per method and option, prefixed with
`[react-native-oauth-essentials] <method>:`. They do not change the result and are not shown in release builds.

| Warning | Methods | Meaning |
|---|---|---|
| `"<option>" is ignored on iOS.` / `on Android.` | `googleSignIn`, `googleSilentSignIn`, `hybridSignIn`, `appleSignIn`, `oauthSignIn` | The option has no effect on this platform (see the Platform column in [Types](./types)) |
| `the Google client id is ignored on iOS…` | `hybridSignIn` | iOS `hybridSignIn` offers Apple ID and passwords, not Google |
| `does nothing on iOS: set textContentType on your inputs…` | `passwordSignIn` | iOS has no API to save a password without an associated domain |
| `"preferImmediatelyAvailableCredentials: false" is ignored on iOS…` | `createPassKey`, `getPassKey` | iOS modal requests only offer passkeys on the device |
| `"mediation: 'autofill'" is ignored on Android.` | `createPassKey`, `getPassKey` | AutoFill passkeys are iOS only |
| `additionalParameters.<key> is ignored: the library sets it…` | `oauthSignIn` | `response_type`, `client_id`, `redirect_uri`, `state`, `code_challenge` and `code_challenge_method` cannot be overridden |

## Expo prebuild messages

Shown by `npx expo prebuild` (and `npx expo run:*` / EAS builds) for the [Expo config plugin](./expo.md).

| Message | Type | Meaning |
|---|---|---|
| `no Google iOS client id, so Info.plist is not changed…` | Warning (iOS) | `google` is set but no iOS client id was found in the plugin options nor `ios.googleServicesFile`. Fine if you only use Google on Android; otherwise `googleSignIn` rejects with `CONFIGURATION_ERROR` on iOS |
| `no Google web client id, so GIDServerClientID is not set…` | Warning (iOS) | The iOS `idToken` audience will be the iOS client id. Set `webClientId` or `android.googleServicesFile` if your backend expects the web client id |
| `no Google web client id: googleSignIn() rejects with CONFIGURATION_ERROR on Android…` | Warning (Android) | Set `webClientId` or `android.googleServicesFile` |
| `AndroidManifest.xml has no <application>` | Error | The Android project is broken; regenerate it with `npx expo prebuild --clean` |
| `ENOENT: no such file or directory` | Error | `ios.googleServicesFile` / `android.googleServicesFile` points to a file that does not exist (paths are relative to the project root) |
