# Google ID Sign-In

## Platform Support

### iOS
- Uses the GoogleSignIn SDK, which opens the Google page in an `ASWebAuthenticationSession`
- Presented from the top most view controller; waits up to 2 seconds for the app to become active
- No Google Play Services dependency
- `GOOGLE_ID_SUPPORTED` is always `true`

### Android
- **Minimum:** Android 7.0 (API 24, the library `minSdk`)
- Uses Credential Manager (`GetGoogleIdOption` bottom sheet or `GetSignInWithGoogleOption` button flow) and, for
  `scopes`/`offlineAccess`, the Authorization API
- **Requires Google Play Services**: without them it rejects with `NOT_SUPPORTED_ERROR`. `GOOGLE_ID_SUPPORTED` equals
  `GOOGLE_PLAY_SERVICES_SUPPORTED`
- Supports additional options: `mode`, `authorizedAccounts` and `autoSelectEnabled`

## Methods

### `googleSignIn(webClientId: string, options?: GoogleSignInOptions)`

Performs Google ID sign-in on Android and iOS platforms.

#### Parameters

| Name          | Type                             | Description                                                                                             |
|---------------|----------------------------------|---------------------------------------------------------------------------------------------------------|
| `webClientId` | `string`                         | The web client ID from your Google Cloud Console. Required for Google authentication.                   |
| `options`     | `GoogleSignInOptions` (optional) | Optional configuration for Google Sign-In. See [GoogleSignInOptions](#googlesigninoptions) for details. |

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
  serverClientId?: string;               // iOS: idToken audience + serverAuthCode. Android: serverAuthCode client id
};
```

- `mode: 'button'` should be used when the user taps a "Sign in with Google" button. `bottomSheet` falls back to it automatically when no credential is available, unless `authorizedAccounts` is set.
- `scopes` and `offlineAccess` trigger an extra consent step on Android (Authorization API). Declining it resolves `CANCELLED`.
- On iOS `scopes` are requested during sign in, and `accessToken`/`grantedScopes` are always returned. `serverAuthCode`
  is returned whenever `serverClientId` is set (`offlineAccess` has no effect).

See [Methods](../methods#googlesigninwebclientid-options) for the exact per-platform behavior.

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
  GOOGLE_ID_SUPPORTED,
  CredentialsType,
  CredentialError,
} from 'react-native-oauth-essentials';

async function signInWithGoogle(): Promise<void> {
  // Android: false without Google Play Services
  if (!GOOGLE_ID_SUPPORTED) {
    console.log('Google sign-in is not available on this device.');
    return;
  }

  try {
    const credential = await googleSignIn('YOUR_GOOGLE_WEB_CLIENT_ID', {
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
    if (error.code === CredentialError.NOT_SUPPORTED_ERROR) {
      console.error('Please install or update Google Play Services');
    } else if (error.code === CredentialError.BROWSER_UNAVAILABLE) {
      console.error('Could not open the Google page, try again');
    } else if (error.code === CredentialError.NO_ACTIVITY_ERROR) {
      console.error('Activity context not available');
    } else {
      console.error('Google sign-in failed:', error);
    }
  }
}
```

### `googleSilentSignIn(webClientId: string, options?: GoogleSignInOptions)`

Restores a previous Google sign in. Resolves `GoogleIdCredentialResult` and rejects with `NO_SIGN_IN_AVAILABLE` when
there is nothing to restore.

- **iOS:** `restorePreviousSignIn`, never shows UI and refreshes the tokens. `hint`, `scopes`, `nonce` and
  `offlineAccess` are ignored and `serverAuthCode` is `null`.
- **Android:** bottom sheet filtered to accounts that already signed in to the app, with auto select on: no UI when
  there is a single one, otherwise the sheet is shown (dismissing it resolves `CANCELLED`). Authorization for
  `scopes`/`offlineAccess` is only requested without UI; when consent would be needed `accessToken` is `null`.

```ts
const credential = await googleSilentSignIn('YOUR_GOOGLE_WEB_CLIENT_ID');
```

### `signOut()`

Clears the Google session on iOS (so `googleSilentSignIn` rejects afterwards) and the Credential Manager state on
Android (turns off auto select until the user picks an account again). Resolves `true`, does not emit events.

```ts
await signOut();
```

## Setup Requirements

1. **Configure OAuth 2.0 in Google Cloud Console:**
   - Create a Web Application client ID (not Android or iOS client ID)
   - This single Web client ID works for both Android and iOS
   - Enable Google Sign-In API for your project

2. **No native configuration needed** - The library handles all native setup automatically

3. **Backend Token Verification** (Recommended):
   - Always verify the `idToken` on your backend server
   - See [Google Identity: Authenticate with a backend server](https://developers.google.com/identity/sign-in/android/backend-auth)
   - Use Google's official libraries to verify the token

## Best Practices

1. **Always verify the ID token on your backend** - Don't trust client-side tokens
2. **Check platform support constants** before calling the method
3. **Handle cancellation gracefully** - Users may change their mind
4. **Provide fallback options** - Not all devices have Google Play Services
5. **Use the Web Client ID** - Not the Android Client ID from Google Cloud Console