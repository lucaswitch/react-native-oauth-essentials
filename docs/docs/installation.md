---
sidebar_position: 2
---

# Installation

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
pod install; or // bundle exec po
```

## Configuration

### Google OAuth Client ID Setup

Enabling Google Sign-In in your app requires a Google OAuth Client ID.
This guide walks you through the steps to create one for your application.

#### Creating Google ID credentials in Google Cloud Console

If you already have the credentials in hand you can skip this step.
Follow these steps to create an Android client ID for your app in the Google Cloud Console:

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

> These values will be displayed to users on the **Sign in with Google** consent screen during sign-up and on the *
*Third-party apps & services** screen.

4. **Specify policy URLs**
   Provide URLs for your app's **Privacy Policy** and **Terms of Service**.

5. **Create an Android client ID**
   On the **Clients** page:

- Create an **Android client ID** if you don't already have one.
- Specify your app's **package name** and **SHA-1 signature**.

> Once created, this client ID will be used by your Android/IOS app to integrate **Sign in with Google**.

### IOS Setup

Once you have your GOOGLE_CLIENT_ID, run the following command to quickly generate the corresponding Info.plist entry.

From inside your app base directory:

```bash
./node_modules/react-native-oauth-essentials/plist-generate.sh YOUR_GOOGLE_CLIENT_ID
```

It will generate something like the following:

```bash
Add carefully into your Info.plist the following entry:

<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>YOUR GOOGLE CLIENT ID</string>
        </array>
    </dict>
</array>
```

You just have to add it now into your ios/YOUR_APP_NAME/Info.plist.

There you go, you're ready to use it!
