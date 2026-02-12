# Apple ID Sign-In

## Platform Support

### iOS
- **Minimum:** iOS 13+
- Uses native `AuthenticationServices` framework
- Presents native Apple Sign-In UI sheet
- Full integration with iOS Keychain
- Returns complete user information on first sign-in
- Caches email and fullName for subsequent sign-ins
- No additional configuration needed beyond library setup
- Check `APPLE_ID_SUPPORTED` constant before using

### Android
- **Minimum:** Android 8.0+ (API 26+)
- Uses Chrome Custom Tabs to open OAuth flow
- Opens your provided URL parameter in the device's default browser
- Returns redirect URL components after OAuth completion
- **Requires backend implementation** to handle OAuth flow
- You must implement Apple Sign-In REST API on your server
- See [Apple Sign-In REST API Documentation](https://developer.apple.com/documentation/signinwithapplerestapi)
- Check `APPLE_ID_SUPPORTED` constant before using

**Implementation Note:** iOS provides a complete native experience with full user data, while Android uses Chrome Custom Tabs to open your OAuth endpoint, then captures the redirect URL containing authorization data.

## Methods

### `appleSignIn(androidWebUrl?: string)`

Initiates the Apple Sign-In process.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `androidWebUrl` | `string` (optional) | The URL for Android OAuth flow. **Required on Android, ignored on iOS.** |

#### Returns

`Promise<AppleIdCredentialResult | WebAppleIdCredentialResult>`

The promise resolves to different result types depending on platform:

**AppleIdCredentialResult (iOS):**
```typescript
{
  type: CredentialsType.APPLE_ID;
  data: {
    idToken: string;                 // JWT ID token
    authorizationCode: string;       // Authorization code for backend
    user: string;                    // Unique user identifier (stable)
    email: string;                   // User's email (only on first sign-in)
    fullName: string;                // Full name (only on first sign-in)
    likelyReal: boolean;             // Indicates if user is likely real
  };
}
```

**WebAppleIdCredentialResult (Android):**
```typescript
{
  type: CredentialsType.WEB_APPLE_ID;
  data: {
    url: string;                     // Full redirect URL from browser
    scheme: string | null;           // URL scheme (e.g., "myapp")
    host: string | null;             // URL host
    path: string | null;             // URL path
    query: string | null;            // URL query parameters containing auth code
  };
}
```

#### Error Codes

The method may throw errors with the following codes:

| Error Code | Description | Platform |
|------------|-------------|----------|
| `NO_ACTIVITY_ERROR` | No Android activity context available | Android only |
| `INVALID_RESULT_ERROR` | Invalid URL parameter or authentication result | Both |

#### iOS Implementation Details

On iOS, the method:
1. Presents the native Apple Sign-In UI sheet
2. Returns complete user information on **first sign-in only**:
   - `email` and `fullName` are only provided on first authorization
   - Subsequent sign-ins return empty strings for these fields
3. **Caches** email and fullName internally for future use
4. The `user` identifier is stable across app reinstalls
5. Use `idToken` for backend verification
6. Use `authorizationCode` for server-to-server communication

**Important iOS Note:** Apple only provides email and fullName once. The library caches these values, but you should store them in your backend on first sign-in.

#### Android Implementation Details

On Android, the method:
1. Opens Chrome Custom Tabs with your `androidWebUrl`
2. User completes OAuth flow in the browser
3. Browser redirects to your app's deep link
4. Returns the redirect URL components
5. **Your backend must:**
   - Serve the Apple Sign-In OAuth page
   - Handle the OAuth flow
   - Redirect back to your app with authorization code
   - Verify the authorization code

**Important Android Note:** You must implement the server-side Apple Sign-In flow. The library only handles opening the browser and capturing the redirect.

#### Important Notes

- Always check `APPLE_ID_SUPPORTED` before calling this method
- On iOS: email/fullName only provided on first sign-in - cache them!
- On Android: `androidWebUrl` is required and must be implemented on your backend
- The flow and return types are completely different between platforms

#### Example Usage (TypeScript)

```ts
import {
  appleSignIn,
  APPLE_ID_SUPPORTED,
  CredentialsType,
  Platform,
} from 'react-native-oauth-essentials';

async function signInWithApple(): Promise<void> {
  if (!APPLE_ID_SUPPORTED) {
    console.log('Apple Sign-In is not supported on this platform.');
    return;
  }

  try {
    const credential = await appleSignIn(
      Platform.OS === 'android'
        ? 'https://yourserver.com/auth/apple'
        : undefined
    );

    if (credential.type === CredentialsType.APPLE_ID) {
      // iOS: Native Apple Sign-In result
      console.log('iOS Apple Sign-In:');
      console.log('User ID:', credential.data.user);
      console.log('ID Token:', credential.data.idToken);
      console.log('Auth Code:', credential.data.authorizationCode);
      console.log('Email:', credential.data.email || 'Not provided (subsequent sign-in)');
      console.log('Name:', credential.data.fullName || 'Not provided (subsequent sign-in)');
      console.log('Likely Real:', credential.data.likelyReal);

      // Send to your backend for verification
      await authenticateWithBackend({
        idToken: credential.data.idToken,
        authCode: credential.data.authorizationCode,
        user: credential.data.user,
        email: credential.data.email,
        fullName: credential.data.fullName,
      });

    } else if (credential.type === CredentialsType.WEB_APPLE_ID) {
      // Android: Redirect URL from browser OAuth flow
      console.log('Android Apple Sign-In:');
      console.log('Redirect URL:', credential.data.url);
      console.log('Query params:', credential.data.query);

      // RECOMMENDED: Extract short-lived session code from your backend
      const sessionCode = extractSessionCode(credential.data.query);

      // Exchange session code for credentials with your backend
      const authResult = await exchangeSessionCode(sessionCode);
      console.log('Authenticated:', authResult);

      // ALTERNATIVE (less secure): Extract auth code directly
      // const authCode = extractAuthCode(credential.data.query);
      // await exchangeAuthCode(authCode);
    }

  } catch (error) {
    if (error.code === CredentialError.NO_ACTIVITY_ERROR) {
      console.error('Activity context not available');
    } else if (error.code === CredentialError.INVALID_RESULT_ERROR) {
      console.error('Invalid authentication result');
    } else {
      console.error('Apple Sign-In failed:', error);
    }
  }
}

// Helper function for Android - Extract session code (RECOMMENDED)
function extractSessionCode(query: string | null): string {
  if (!query) throw new Error('No query parameters');
  const params = new URLSearchParams(query);
  const sessionCode = params.get('session_code');  // Your backend sends this
  if (!sessionCode) throw new Error('No session code in redirect');
  return sessionCode;
}

// Exchange session code for credentials (RECOMMENDED)
async function exchangeSessionCode(sessionCode: string) {
  const response = await fetch('https://yourserver.com/api/auth/apple/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_code: sessionCode }),
  });
  return await response.json();
}

// ALTERNATIVE (less secure): Extract authorization code directly
function extractAuthCode(query: string | null): string {
  if (!query) throw new Error('No query parameters');
  const params = new URLSearchParams(query);
  const code = params.get('code');  // Apple authorization code
  if (!code) throw new Error('No authorization code in redirect');
  return code;
}
```

## Setup Requirements

### iOS Configuration

1. **Enable Sign in with Apple:**
   - Add Sign in with Apple capability to your App ID in Apple Developer Portal
   - Enable the capability in Xcode project settings
   - The library handles all native implementation

2. **Backend Token Verification** (Recommended):
   - Verify the `idToken` on your backend server
   - See [Apple: Sign in with Apple REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user)
   - Use Apple's token verification endpoint

### Android Configuration

1. **Backend Implementation Required:**
   - Implement Apple Sign-In OAuth flow on your server
   - Serve an OAuth authorization page at your `androidWebUrl`
   - Handle the callback from Apple
   - Redirect back to your app with authorization code
   - See [Apple Sign-In REST API Documentation](https://developer.apple.com/documentation/signinwithapplerestapi)

2. **Deep Link Setup:**
   - Configure a deep link scheme in your AndroidManifest.xml
   - Handle incoming deep links from the browser
   - The library captures the redirect URL automatically

3. **Recommended Secure Backend Flow:**
   ```
   User clicks sign in → App opens Chrome Custom Tabs with your URL
   → Your server shows Apple OAuth page
   → User authorizes with Apple
   → Apple redirects to your server callback with authorization code
   → Your server generates a SHORT-LIVED session code (expires in 60s)
   → Your server redirects to your app deep link with the session code
   → App receives redirect URL with session code (NOT credentials)
   → App posts session code to your backend
   → Your backend validates session code and returns credentials
   ```

   **Security Benefit:** This avoids exposing sensitive credentials or authorization codes through the deep link URL, which could be intercepted or logged.

4. **Alternative (Less Secure) Flow:**
   If you cannot implement the session code flow, you can send the authorization code directly via deep link, but this is less secure:
   ```
   → Your server redirects to deep link with authorization code
   → App extracts code from query parameters
   → App immediately sends code to backend for token exchange
   ```

## Best Practices

1. **iOS:**
   - Store email and fullName from first sign-in - they won't be provided again
   - Use the `user` identifier as the stable user ID
   - Verify `idToken` on your backend
   - Handle cases where email/fullName are empty

2. **Android:**
   - Implement robust backend Apple Sign-In flow
   - Validate authorization codes server-side
   - Handle browser redirect errors gracefully
   - Provide fallback if user closes browser

3. **Cross-Platform:**
   - Check `APPLE_ID_SUPPORTED` before calling
   - Handle platform-specific result types
   - Provide alternative sign-in methods
   - Test on both platforms thoroughly

## Platform Differences Summary

| Feature | iOS | Android |
|---------|-----|---------|
| **UI** | Native iOS sheet | Chrome Custom Tabs |
| **User Data** | Complete on first sign-in | None (handled by backend) |
| **Backend Required** | No | Yes |
| **Return Type** | `AppleIdCredentialResult` | `WebAppleIdCredentialResult` |
| **Email/Name** | Provided once | Must be obtained via backend |
