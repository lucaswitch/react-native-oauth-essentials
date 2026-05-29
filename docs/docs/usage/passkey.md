---
sidebar_position: 4
---

# Passkey Sign-In

Passkeys are a modern, secure way for users to sign in using biometric authentication (Face ID, Touch ID) or device PIN. They work across devices when synced via iCloud (iOS) or Google Password Manager (Android).

## Platform Support

### iOS
- **Minimum:** iOS 16+
- Uses native `AuthenticationServices` framework
- Presents native passkey creation/selection UI
- Full integration with iCloud Keychain
- Supports Face ID, Touch ID, and device PIN
- Check `PASSKEYS_SUPPORTED` constant before using

### Android
- **Minimum:** Android 9.0+ (API 28+)
- Uses Credential Manager API with passkey support
- Presents native passkey creation/selection UI
- Integrates with Google Password Manager
- Supports biometric and device authentication
- Check `PASSKEYS_SUPPORTED` constant before using

## Setup Requirements

### iOS Configuration

#### 1. Add Associated Domains Capability

To use passkeys on iOS, you must add the **Associated Domains** capability to your app:

1. Open your Xcode project
2. Select your target and go to **Signing & Capabilities** tab
3. Click **+ Capability** button
4. Search for and add **Associated Domains**
5. In the Associated Domains section, add your domain in this format:
   ```
   webcredentials:yourdomain.com
   ```

> **📚 Reference:** See [Apple's guide on adding capabilities to your app](https://developer.apple.com/documentation/xcode/adding-capabilities-to-your-app) for detailed instructions.

#### 2. Configure your Domain

Your backend domain must host an `apple-app-site-association` file at:
```
https://yourdomain.com/.well-known/apple-app-site-association
```

This file tells Apple that your app is allowed to use passkeys from your domain:
```json
{
  "webcredentials": {
    "apps": [
      "TEAM_ID.BUNDLE_ID"
    ]
  }
}
```

Replace:
- `TEAM_ID` with your Apple Team ID
- `BUNDLE_ID` with your app's bundle identifier

#### 3. Use the Correct Domain in Your Code

When creating or asserting passkeys, the `rp.id` (relying party ID) must match your configured domain:

```typescript
const options = {
  requestJson: JSON.stringify({
    challenge: 'your-challenge',
    rp: {
      id: 'yourdomain.com',  // Must match your Associated Domain
      name: 'Your App Name'
    },
    user: {
      id: 'user-id',
      name: 'user@yourdomain.com',
      displayName: 'User Name'
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred'
    }
  })
};
```

### Android Configuration

Android passkeys work with the Credential Manager API. No additional domain configuration is required, but ensure your backend properly validates the passkey assertions.

## Methods

### `createPassKey(options: PasskeyOptions): Promise<PassKeyCredentialResult>`

Creates a new passkey credential.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `options` | `PasskeyOptions` | Passkey creation configuration |

#### Returns

`Promise<PassKeyCredentialResult>`

**PassKeyCredentialResult:**
```typescript
{
  type: CredentialsType.PASSKEY;
  data: string;  // JSON string containing the public key credential response
}
```

#### Example Usage

```ts
import { createPassKey, PASSKEYS_SUPPORTED, CredentialsType } from 'react-native-oauth-essentials';

async function registerPasskey(): Promise<void> {
  if (!PASSKEYS_SUPPORTED) {
    console.log('Passkeys are not supported on this platform.');
    return;
  }

  try {
    const credential = await createPassKey({
      requestJson: JSON.stringify({
        challenge: await getServerChallenge(),
        rp: {
          id: 'yourdomain.com',
          name: 'Your App'
        },
        user: {
          id: 'user-id',
          name: 'user@yourdomain.com',
          displayName: 'User Display Name'
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred'
        }
      })
    });

    if (credential.type === CredentialsType.PASSKEY) {
      const passkeyData = JSON.parse(credential.data);
      console.log('Passkey created successfully');

      // Send to your backend for verification
      await verifyPasskeyWithBackend(passkeyData);
    }
  } catch (error) {
    console.error('Failed to create passkey:', error);
  }
}
```

### `getPassKey(options: PasskeyOptions): Promise<PassKeyCredentialResult>`

Retrieves an existing passkey credential for authentication.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `options` | `PasskeyOptions` | Passkey retrieval configuration |

#### Returns

`Promise<PassKeyCredentialResult>`

#### Example Usage

```ts
import { getPassKey, PASSKEYS_SUPPORTED, CredentialsType } from 'react-native-oauth-essentials';

async function authenticateWithPasskey(): Promise<void> {
  if (!PASSKEYS_SUPPORTED) {
    console.log('Passkeys are not supported on this platform.');
    return;
  }

  try {
    const credential = await getPassKey({
      requestJson: JSON.stringify({
        challenge: await getServerChallenge(),
        rpId: 'yourdomain.com',
        timeout: 60000,
        userVerification: 'preferred'
      })
    });

    if (credential.type === CredentialsType.PASSKEY) {
      const passkeyData = JSON.parse(credential.data);
      console.log('Passkey authentication successful');

      // Send to your backend for verification
      await verifyPasskeyWithBackend(passkeyData);
    }
  } catch (error) {
    console.error('Failed to authenticate with passkey:', error);
  }
}
```

## Best Practices

1. **Always check `PASSKEYS_SUPPORTED`** before calling passkey methods
2. **Use the correct domain** in `rp.id` - it must match your Associated Domain (iOS)
3. **Store challenges securely** on your backend and never reuse them
4. **Validate attestations** on your backend to ensure passkey authenticity
5. **Handle errors gracefully** - users may cancel or lack passkey support
6. **Use biometric verification** - passkeys are secure because they require user verification
7. **Test thoroughly** - test on physical devices with real passkeys

## Domain Configuration Summary

| Platform | Requirement | Format | Example |
|----------|-------------|--------|---------|
| **iOS** | Add Associated Domain capability | `webcredentials:domain.com` | `webcredentials:myapp.com` |
| **iOS** | Host apple-app-site-association | At `/.well-known/apple-app-site-association` | See iOS Configuration section |
| **Both** | Use domain in passkey options | In `rp.id` or `rpId` field | `yourdomain.com` |

## Platform Differences

| Feature | iOS | Android |
|---------|-----|---------|
| **Minimum Version** | iOS 16+ | Android 9.0+ (API 28+) |
| **Domain Setup** | Required (Associated Domain capability) | Not required |
| **UI** | Native iOS modal | Native Android bottom sheet |
| **Storage** | iCloud Keychain | Google Password Manager |
| **Sync** | Across Apple devices | Across Google account devices |
