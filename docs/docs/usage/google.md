# Google ID Sign-In

## Platform Support

### iOS
- **Minimum:** iOS 13+
- Uses native iOS Google Sign-In SDK
- Presents native iOS authentication UI
- No Google Play Services dependency
- Supports One Tap sign-in experience
- Check `GOOGLE_ID_SUPPORTED` constant before using

### Android
- **Minimum:** Android 8.0+ (API 26+)
- Uses Credential Manager API with Google ID provider
- **Requires Google Play Services** to be installed and up-to-date
- Check both `GOOGLE_ID_SUPPORTED` and `GOOGLE_PLAY_SERVICES_SUPPORTED` before using
- Presents native Android credential picker UI
- Supports additional options: `authorizedAccounts` and `autoSelectEnabled`

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
  authorizedAccounts?: boolean;  // Android only: Filter to authorized accounts
  autoSelectEnabled?: boolean;   // Android only: Enable auto-selection
};
```

**Note:** Both options are **Android-only** and will be ignored on iOS.

#### Returns

`Promise<GoogleIdCredentialResult | CancelledCredentialResult>`

The promise resolves to:

**GoogleIdCredentialResult:**
```typescript
{
  type: CredentialsType.GOOGLE_ID;
  data: {
    id: string;                      // User's Google ID
    idToken: string;                 // JWT ID token for backend verification
    displayName: string;             // Full name
    givenName: string;               // First name
    familyName: string;              // Last name
    profilePictureUri?: string | null;  // Profile picture URL
    phoneNumber?: string | null;     // Phone number (if available)
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
| `NO_PLAY_SERVICES_ERROR` | Google Play Services not available or outdated | Android only |
| `NO_ACTIVITY_ERROR` | No Android activity context available | Android only |
| `INVALID_RESULT_ERROR` | Invalid result from authentication provider | Both |

#### Important Notes

- Always check `GOOGLE_ID_SUPPORTED` before calling this method
- On Android, also check `GOOGLE_PLAY_SERVICES_SUPPORTED` to ensure Google Play Services are available
- The `idToken` should be sent to your backend for verification
- Options `authorizedAccounts` and `autoSelectEnabled` only work on Android
- User can cancel the flow, resulting in `CancelledCredentialResult`

#### Example Usage (TypeScript)

```ts
import {
  googleSignIn,
  GOOGLE_ID_SUPPORTED,
  GOOGLE_PLAY_SERVICES_SUPPORTED,
  CredentialsType,
  CredentialError,
} from 'react-native-oauth-essentials';

async function signInWithGoogle(): Promise<void> {
  // Check platform support
  if (!GOOGLE_ID_SUPPORTED) {
    console.log('Google sign-in is not supported on this platform.');
    return;
  }

  // Android: Also check for Google Play Services
  if (Platform.OS === 'android' && !GOOGLE_PLAY_SERVICES_SUPPORTED) {
    console.log('Google Play Services not available.');
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
    if (error.code === CredentialError.NO_PLAY_SERVICES_ERROR) {
      console.error('Please install or update Google Play Services');
    } else if (error.code === CredentialError.NO_ACTIVITY_ERROR) {
      console.error('Activity context not available');
    } else {
      console.error('Google sign-in failed:', error);
    }
  }
}
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