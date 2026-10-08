# Google ID Sign-In

## Platform Support

### iOS
- Uses the GoogleSignIn SDK, which opens the Google page in an `ASWebAuthenticationSession`
- Presented from the top most view controller; waits up to 2 seconds for the app to become active
- No Google Play Services dependency
- `GOOGLE_ID_SUPPORTED` is always `true`
- Uses `iosClientId` (or `GIDClientID` from Info.plist) and `webClientId` as the default `serverClientId`
- Needs the reversed iOS client id as a URL scheme in Info.plist; without it the call rejects with `CONFIGURATION_ERROR`

### Android
- **Minimum:** Android 7.0 (API 24, the library `minSdk`)
- Uses Credential Manager (`GetGoogleIdOption` bottom sheet or `GetSignInWithGoogleOption` button flow) and, for
  `scopes`/`offlineAccess`, the Authorization API
- **Requires Google Play Services**: without them it rejects with `NOT_SUPPORTED_ERROR`. `GOOGLE_ID_SUPPORTED` equals
  `GOOGLE_PLAY_SERVICES_SUPPORTED`
- Uses `webClientId`; without it the call rejects with `CONFIGURATION_ERROR`
- Supports additional options: `mode`, `authorizedAccounts` and `autoSelectEnabled`

## Methods

### `googleSignIn(clientId: GoogleClientId, options?: GoogleSignInOptions)`

Performs Google ID sign-in on Android and iOS platforms.

#### Parameters

| Name       | Type                                                       | Description                                                                                             |
|------------|------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `clientId` | `string \| { iosClientId?: string; webClientId?: string }` | Your Google client ids. See [Client ids](#client-ids).                                                   |
| `options`  | `GoogleSignInOptions` (optional)                           | Optional configuration for Google Sign-In. See [GoogleSignInOptions](#googlesigninoptions) for details. |

#### Client ids

Pass `{ iosClientId, webClientId }` (type `GoogleClientIds`), all from the same Google Cloud project:

- **iOS** uses `iosClientId` (or `GIDClientID` from Info.plist when it is missing). `webClientId` becomes the default
  `serverClientId` (`idToken` audience and `serverAuthCode`); without both, `GIDServerClientID` from Info.plist is used.
- **Android** uses `webClientId` (required, missing rejects with `CONFIGURATION_ERROR`). The Android client id is never
  passed: it only has to exist with your package name and SHA-1 fingerprints.

A string still works and is used as is: it must be the iOS client id on iOS and the web client id on Android.

#### GoogleSignInOptions

```typescript
type GoogleSignInOptions = {
  authorizedAccounts?: boolean;          // Android only: Filter to authorized accounts
  autoSelectEnabled?: boolean;           // Android only: Enable auto-selection
  mode?: 'bottomSheet' | 'button';       // Android only: UI flow (default 'bottomSheet')
  nonce?: string;                        // Embedded as-is in the idToken (replay protection)
  hint?: string;                         // iOS only: Email to preselect
  hostedDomain?: string;                 // Workspace domain (Android: button flow and authorization only)
  scopes?: string[];                     // Extra OAuth scopes
  offlineAccess?: boolean;               // Android only: returns serverAuthCode
  serverClientId?: string;               // iOS: idToken audience + serverAuthCode (default webClientId). Android: serverAuthCode client id
};
```

- `mode: 'button'` should be used when the user taps a "Sign in with Google" button. `bottomSheet` falls back to it automatically when no credential is available, unless `authorizedAccounts` is set.
- `scopes` and `offlineAccess` trigger an extra consent step on Android (Authorization API). Declining it resolves `CANCELLED`.
- On iOS `scopes` are requested during sign in, and `accessToken`/`grantedScopes` are always returned. `serverAuthCode`
  is returned whenever `serverClientId` is set (`offlineAccess` has no effect).

Options that have no effect on the current platform log a `console.warn` in development. See
[Methods](../methods#googlesigninclientid-options) for the exact per-platform behavior.

#### Returns

`Promise<GoogleIdCredentialResult | CancelledCredentialResult>`

The promise resolves to:

**GoogleIdCredentialResult:**
```typescript
{
  type: CredentialsType.GOOGLE_ID;
  data: {
    id: string;                      // iOS: Google user id (sub). Android: account email
    idToken: string;                 // JWT ID token for backend verification
    displayName: string;             // Full name
    givenName: string;               // First name
    familyName: string;              // Last name
    email?: string;                  // Email
    profilePictureUri?: string | null;  // Profile picture URL
    phoneNumber?: string | null;     // Android only
    accessToken?: string | null;     // iOS: always. Android: when `scopes`/`offlineAccess` is set
    serverAuthCode?: string | null;  // iOS: when `serverClientId` is set. Android: when `offlineAccess` is set
    grantedScopes?: string[] | null; // Same as accessToken
  };
}
```

**CancelledCredentialResult:**
```typescript
{
  type: CredentialsType.CANCELLED;
  data: null;  // User cancelled the sign-in flow
}
```

#### Error Codes

The method may throw errors with the following codes:

| Error Code | Description | Platform |
|------------|-------------|----------|
| `CONFIGURATION_ERROR` | No client id (iOS: `iosClientId`/`GIDClientID`, Android: `webClientId`), or the iOS URL scheme is missing from Info.plist (the `message` has the exact scheme) | Both |
| `NOT_SUPPORTED_ERROR` | Google Play Services not available or outdated | Android only |
| `NO_ACTIVITY_ERROR` | No activity / view controller to present from | Both |
| `NO_SIGN_IN_AVAILABLE` | No Google account available for the requested filter (iOS: `googleSilentSignIn` only) | Both |
| `BROWSER_UNAVAILABLE` | The sign-in page could not be opened (app not active within 2 s, Guided Access, Safari restricted) | iOS only |
| `SIMULTANEOUS_CALL_ERROR` | `googleSignIn`/`googleSilentSignIn` is still pending | iOS only |
| `INVALID_RESULT_ERROR` | The provider failed or returned an unexpected result | Both |

#### Important Notes

- Check `GOOGLE_ID_SUPPORTED` before calling this method (on Android it is `false` without Play Services)
- The `idToken` should be sent to your backend for verification
- Options `mode`, `authorizedAccounts` and `autoSelectEnabled` only work on Android
- User can cancel the flow, resulting in `CancelledCredentialResult`
- Use `idToken`'s `sub` claim (verified on your backend) as the user id: `data.id` differs between platforms

#### Example Usage (TypeScript)

```ts
import {
  googleSignIn,
  isCredentialError,
  GOOGLE_ID_SUPPORTED,
  CredentialsType,
  CredentialError,
} from 'react-native-oauth-essentials';

const GOOGLE_CLIENT_IDS = {
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
};

async function signInWithGoogle(): Promise<void> {
  // Android: false without Google Play Services
  if (!GOOGLE_ID_SUPPORTED) {
    console.log('Google sign-in is not available on this device.');
    return;
  }

  try {
    const credential = await googleSignIn(GOOGLE_CLIENT_IDS, {
      authorizedAccounts: true,  // Android only
      autoSelectEnabled: false,  // Android only
    });

    if (credential.type === CredentialsType.GOOGLE_ID) {
      console.log('Signed in with Google:');
      console.log('ID Token:', credential.data.idToken);
      console.log('User ID:', credential.data.id);
      console.log('Name:', credential.data.displayName);
      console.log('Email:', credential.data.email);

      // Send idToken to your backend for verification
      await authenticateWithBackend(credential.data.idToken);
    } else if (credential.type === CredentialsType.CANCELLED) {
      console.log('User cancelled Google sign-in');
    }
  } catch (error) {
    if (isCredentialError(error, CredentialError.CONFIGURATION_ERROR)) {
      console.error('Setup problem:', error.message); // e.g. the iOS URL scheme to add
    } else if (isCredentialError(error, CredentialError.NOT_SUPPORTED_ERROR)) {
      console.error('Please install or update Google Play Services');
    } else if (isCredentialError(error, CredentialError.BROWSER_UNAVAILABLE)) {
      console.error('Could not open the Google page, try again');
    } else if (isCredentialError(error, CredentialError.NO_ACTIVITY_ERROR)) {
      console.error('Activity context not available');
    } else {
      console.error('Google sign-in failed:', error);
    }
  }
}
```

### `googleSilentSignIn(clientId: GoogleClientId, options?: GoogleSignInOptions)`

Restores a previous Google sign in. Takes the same `clientId` as `googleSignIn`. Resolves `GoogleIdCredentialResult` and
rejects with `NO_SIGN_IN_AVAILABLE` when there is nothing to restore (plus the `googleSignIn` errors).

- **iOS:** `restorePreviousSignIn`, never shows UI and refreshes the tokens. `hint`, `scopes`, `nonce` and
  `offlineAccess` are ignored and `serverAuthCode` is `null`.
- **Android:** bottom sheet filtered to accounts that already signed in to the app, with auto select on: no UI when
  there is a single one, otherwise the sheet is shown (dismissing it resolves `CANCELLED`). `mode` and `hint` are
  ignored. Authorization for
  `scopes`/`offlineAccess` is only requested without UI; when consent would be needed `accessToken` is `null`.

```ts
const credential = await googleSilentSignIn(GOOGLE_CLIENT_IDS);
```

### `signOut()`

Clears the Google session on iOS (so `googleSilentSignIn` rejects afterwards) and the Credential Manager state on
Android (turns off auto select until the user picks an account again). Resolves `true`, does not emit events.

```ts
await signOut();
```

## Setup Requirements

1. **Configure OAuth 2.0 in Google Cloud Console** (see the [Google OAuth setup guide](../google-oauth-setup.md)), all in
   the same project:
   - **Web** client id: your `webClientId`
   - **Android** client id: package name + SHA-1 of every signing key (including Play App Signing). Never passed in code
   - **iOS** client id: bundle id. Your `iosClientId`

2. **iOS native configuration** - Add the reversed iOS client id as a URL scheme in Info.plist
   (`1234-abcd.apps.googleusercontent.com` becomes `com.googleusercontent.apps.1234-abcd`), see
   [Installation](../installation.md#ios-setup), or use the [Expo config plugin](../expo.md) `google` option. Android
   needs no native configuration

3. **Backend Token Verification** (Recommended):
   - Always verify the `idToken` on your backend server
   - See [Google Identity: Authenticate with a backend server](https://developers.google.com/identity/sign-in/android/backend-auth)
   - Use Google's official libraries to verify the token

## Best Practices

1. **Always verify the ID token on your backend** - Don't trust client-side tokens
2. **Check platform support constants** before calling the method
3. **Handle cancellation gracefully** - Users may change their mind
4. **Provide fallback options** - Not all devices have Google Play Services
5. **Pass `{ iosClientId, webClientId }`** - Never the Android Client ID from Google Cloud Console