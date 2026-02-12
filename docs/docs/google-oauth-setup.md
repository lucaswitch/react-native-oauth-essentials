---
sidebar_position: 3
---

# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for your React Native app on both iOS and Android.

## Prerequisites

- A Google Cloud Console account
- Your React Native app's bundle identifier (iOS) and package name (Android)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**

## Step 2: Configure OAuth Consent Screen

1. Click **OAuth consent screen** in the left sidebar
2. Select **External** (or Internal if using Google Workspace)
3. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
4. Add scopes (at minimum):
   - `openid`
   - `profile`
   - `email`
5. Save and continue

## Step 3: Create OAuth 2.0 Credentials

You need to create **THREE** different OAuth client IDs for your app:

### 3.1. Web Application Client ID (Required)

This is the **primary credential** used in your React Native code.

1. Click **Create Credentials** → **OAuth client ID**
2. Select **Web application**
3. Name it (e.g., "My App - Web Client")
4. No need to add Authorized redirect URIs
5. Click **Create**
6. **Copy the Client ID** - you'll use this in your app code

### 3.2. iOS Client ID

1. Click **Create Credentials** → **OAuth client ID**
2. Select **iOS**
3. Name it (e.g., "My App - iOS")
4. Enter your iOS **Bundle ID** (e.g., `com.yourcompany.yourapp`)
   - Find this in your `Info.plist` or Xcode project settings
5. Click **Create**
6. **Copy the iOS Client ID** - you'll need this for Platform.select()

### 3.3. Android Client ID

1. Click **Create Credentials** → **OAuth client ID**
2. Select **Android**
3. Name it (e.g., "My App - Android")
4. Enter your Android **Package name** (e.g., `com.yourcompany.yourapp`)
   - Find this in `android/app/build.gradle` under `applicationId`
5. Enter your **SHA-1 certificate fingerprint**:

   **For Development (Debug):**
   ```bash
   # macOS/Linux
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # Windows
   keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

   **For Production (Release):**
   ```bash
   keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
   ```

6. Click **Create**
7. **Copy the Android Client ID** - you'll need this for Platform.select()

## Step 4: Configure Your React Native App

### 4.1. Use Platform.select() for Platform-Specific Client IDs

```typescript
import { Platform } from 'react-native';
import { googleSignIn } from 'react-native-oauth-essentials';

const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

// Use Platform.select() to choose the correct client ID
const googleClientId = Platform.select({
  ios: GOOGLE_IOS_CLIENT_ID,
  android: GOOGLE_ANDROID_CLIENT_ID,
  default: GOOGLE_WEB_CLIENT_ID,
});

async function signIn() {
  try {
    const credential = await googleSignIn(googleClientId);
    console.log('Signed in:', credential);
  } catch (error) {
    console.error('Sign in failed:', error);
  }
}
```

**Important:** Use the **Web Client ID** as the parameter, and the iOS/Android Client IDs are registered with Google to allow your app to authenticate.

Actually, the library uses the **Web Client ID** for both platforms. The iOS and Android Client IDs are registered with Google Cloud Console to authorize your apps, but you only pass the Web Client ID to the library:

```typescript
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

async function signIn() {
  try {
    // Use Web Client ID for both iOS and Android
    const credential = await googleSignIn(GOOGLE_WEB_CLIENT_ID);
    console.log('Signed in:', credential);
  } catch (error) {
    console.error('Sign in failed:', error);
  }
}
```

### 4.2. iOS Configuration (Info.plist)

You need to add a URL scheme to your iOS app's `Info.plist` file.

**Location:** `ios/YourAppName/Info.plist`

Add the following configuration:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- This is your iOS Client ID in reverse notation -->
      <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

#### Info.plist Generator

Use this tool to generate the correct Info.plist entry:

<div style={{padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px'}}>

**Info.plist Entry Generator**

<div style={{marginTop: '15px'}}>
<label>iOS Client ID:</label>
<input
  type="text"
  id="iosClientIdInput"
  placeholder="1234567890-abcdefgh.apps.googleusercontent.com"
  style={{width: '100%', padding: '8px', marginTop: '5px', fontFamily: 'monospace'}}
/>
</div>

<button
  onclick="generateInfoPlist()"
  style={{marginTop: '15px', padding: '10px 20px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
>
  Generate Info.plist Entry
</button>

<div id="infoPlistOutput" style={{marginTop: '20px', display: 'none'}}>
<label>Copy this to your Info.plist:</label>
<pre style={{backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto', marginTop: '5px'}}>
<code id="infoPlistCode"></code>
</pre>
<button
  onclick="copyInfoPlist()"
  style={{padding: '8px 16px', backgroundColor: '#34a853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
>
  Copy to Clipboard
</button>
</div>

</div>

<script>
{`
function generateInfoPlist() {
  const input = document.getElementById('iosClientIdInput').value.trim();

  if (!input) {
    alert('Please enter your iOS Client ID');
    return;
  }

  // Validate format
  if (!input.includes('.apps.googleusercontent.com')) {
    alert('Invalid iOS Client ID format. It should end with .apps.googleusercontent.com');
    return;
  }

  // Extract the part before .apps.googleusercontent.com
  const clientIdPart = input.replace('.apps.googleusercontent.com', '');

  // Create reversed notation
  const reversedScheme = 'com.googleusercontent.apps.' + clientIdPart;

  // Generate the plist entry
  const plistEntry = \`<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>\${reversedScheme}</string>
    </array>
  </dict>
</array>\`;

  // Display the result
  document.getElementById('infoPlistCode').textContent = plistEntry;
  document.getElementById('infoPlistOutput').style.display = 'block';
}

function copyInfoPlist() {
  const code = document.getElementById('infoPlistCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.backgroundColor = '#0f9d58';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.backgroundColor = '#34a853';
    }, 2000);
  }).catch(err => {
    alert('Failed to copy to clipboard. Please copy manually.');
  });
}
`}
</script>

#### Manual Steps:

1. Open `ios/YourAppName/Info.plist` in Xcode or text editor
2. Find the `<dict>` section (usually near the top)
3. Add the generated `CFBundleURLTypes` configuration
4. Replace `YOUR_IOS_CLIENT_ID` with your actual iOS Client ID (without the `.apps.googleusercontent.com` part)

**Example:**

If your iOS Client ID is:
```
1234567890-abcdefghijklmnop.apps.googleusercontent.com
```

Your reversed URL scheme should be:
```
com.googleusercontent.apps.1234567890-abcdefghijklmnop
```

### 4.3. Android Configuration

No additional configuration needed! The library handles everything automatically.

Just make sure:
- You created the Android OAuth client ID in Google Cloud Console
- You added the correct SHA-1 certificate fingerprint
- Your package name matches

## Step 5: Verify Setup

### iOS Verification

1. Open Xcode
2. Select your target → Info tab
3. Expand "URL Types"
4. You should see your reversed client ID as a URL scheme

### Android Verification

1. Run your app on an Android device/emulator
2. Make sure Google Play Services is installed and updated
3. Test the sign-in flow

## Common Issues

### iOS: "No application found to handle URL"
- Verify your `CFBundleURLSchemes` matches your reversed iOS Client ID exactly
- Make sure there are no typos or extra spaces
- Rebuild your iOS app after making changes

### Android: "NO_PLAY_SERVICES_ERROR"
- Install Google Play Services on your device/emulator
- Update Google Play Services to the latest version
- Use a device with Google Play Store (not AOSP builds)

### Android: "DEVELOPER_ERROR"
- Verify your SHA-1 certificate fingerprint is correct
- Make sure package name matches exactly
- Wait a few minutes after creating credentials (Google takes time to propagate changes)

### Both: "Invalid Client ID"
- Double-check you're using the Web Client ID in your code
- Verify the client ID is copied correctly with no extra spaces
- Make sure the iOS/Android client IDs are created and active in Google Cloud Console

## Security Best Practices

1. **Never commit client IDs to public repositories**
   - Use environment variables or config files (added to `.gitignore`)
   - Example: `.env` file with `GOOGLE_WEB_CLIENT_ID=...`

2. **Use different credentials for development and production**
   - Create separate Google Cloud projects or OAuth clients
   - Use different SHA-1 fingerprints for debug and release builds

3. **Verify tokens on your backend**
   - Always validate the `idToken` server-side
   - See [Google Identity: Authenticate with a backend server](https://developers.google.com/identity/sign-in/android/backend-auth)

## Reference Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sign-In for iOS Documentation](https://developers.google.com/identity/sign-in/ios)
- [Google Sign-In for Android Documentation](https://developers.google.com/identity/sign-in/android)
- [OAuth 2.0 Client IDs](https://developers.google.com/identity/protocols/oauth2)
- [Backend Token Verification](https://developers.google.com/identity/sign-in/android/backend-auth)

## Complete Example

```typescript
import React from 'react';
import { Platform, Button, View, Text } from 'react-native';
import {
  googleSignIn,
  GOOGLE_ID_SUPPORTED,
  GOOGLE_PLAY_SERVICES_SUPPORTED,
  CredentialsType,
} from 'react-native-oauth-essentials';

// Your OAuth 2.0 Web Client ID from Google Cloud Console
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

export default function GoogleSignInExample() {
  const [user, setUser] = React.useState(null);

  async function handleGoogleSignIn() {
    // Check platform support
    if (!GOOGLE_ID_SUPPORTED) {
      alert('Google Sign-In is not supported on this platform');
      return;
    }

    // Android: Check for Google Play Services
    if (Platform.OS === 'android' && !GOOGLE_PLAY_SERVICES_SUPPORTED) {
      alert('Google Play Services not available');
      return;
    }

    try {
      const credential = await googleSignIn(GOOGLE_WEB_CLIENT_ID, {
        authorizedAccounts: true,  // Android only
        autoSelectEnabled: false,  // Android only
      });

      if (credential.type === CredentialsType.GOOGLE_ID) {
        setUser(credential.data);
        console.log('User signed in:', credential.data);

        // Send idToken to your backend for verification
        await verifyWithBackend(credential.data.idToken);
      } else if (credential.type === CredentialsType.CANCELLED) {
        console.log('User cancelled sign-in');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      alert('Sign-in failed: ' + error.message);
    }
  }

  async function verifyWithBackend(idToken: string) {
    try {
      const response = await fetch('https://yourapi.com/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();
      console.log('Backend verification:', data);
    } catch (error) {
      console.error('Backend verification failed:', error);
    }
  }

  return (
    <View style={{ padding: 20 }}>
      {user ? (
        <View>
          <Text>Welcome, {user.displayName}!</Text>
          <Text>Email: {user.email}</Text>
        </View>
      ) : (
        <Button title="Sign in with Google" onPress={handleGoogleSignIn} />
      )}
    </View>
  );
}
```

## Next Steps

After successfully setting up Google OAuth:

1. Test on both iOS and Android devices
2. Implement backend token verification
3. Handle user data securely
4. Set up proper error handling
5. Consider adding other sign-in methods (Apple, Password)

Need help? Check the [Usage Guide](./usage/google.md) for more examples.
