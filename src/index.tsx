import OauthEssentials from './NativeOauthEssentials';
import { Platform } from 'react-native';
import {
  type AppleIdCredentialResult,
  type CancelledCredentialResult,
  CredentialsType,
  type GoogleIdCredentialResult,
  type GoogleSignInOptions,
  type PassKeyCredentialResult,
  type PasskeyOptions,
  type PasswordCredentialResult,
  type WebAppleIdCredentialResult,
} from './types';

export * from './types';
const APPLE_ID_CACHED_RESULTS = new Map<
  string,
  AppleIdCredentialResult['data']
>();

/**
 * Performs the google sign in.
 * @param webClientId
 * @param options
 *
 * You should rely on GOOGLE_ID_SUPPORTED constant to check if you can use this method.
 * [Available on Android and IOS].
 */
export async function googleSignIn(
  webClientId: string,
  options?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult> {
  return (await OauthEssentials.googleSignIn(
    webClientId,
    parseGoogleIdOptions(options)
  )) as GoogleIdCredentialResult;
}

/**
 * Gets the stored password.
 * If does not have an stored password, returns false.
 *
 * You should rely on PASSWORD_SUPPORTED constant to check if you can use this method.
 * [Available on Android and IOS].
 */
export async function getPassword(): Promise<false | PasswordCredentialResult> {
  const result = await OauthEssentials.getPassword();
  return (result as PasswordCredentialResult) || false;
}

/**
 * Performs the password sign in.
 * Cannot be a already stored password.
 * @param {string} username
 * @param {string} password
 *
 * You should rely on PASSWORD_SUPPORTED constant to check if you can use this method.
 * [Available on Android and IOS].
 */
export async function passwordSignIn(
  username: string,
  password: string
): Promise<boolean> {
  return await OauthEssentials.passwordSignIn(username, password);
}

/**
 * Initiates the Apple Sign-In process.
 * On IOS devices it handles it smoothly using the latest UI workflow.
 * On Android it dispatches the androidWebUrl to device default browser for handling it.
 * you need to implement on your backend the redirect logic and validation accordingly to the link below
 * @see [Apple Sign In REST API Documentation](https://developer.apple.com/documentation/signinwithapplerestapi)
 *
 * @param {string} androidWebUrl - The web URL on Android where the user will complete the OAuth flow. **[Android only]**
 *
 * @returns {AppleIdCredentialResult|WebAppleIdCredentialResult} Returns AppleIdCredentialResult on IOS devices and WebAppleIdCredentialResult on android.
 */
export async function appleSignIn(
  androidWebUrl?: string
): Promise<AppleIdCredentialResult | WebAppleIdCredentialResult> {
  const result = (await OauthEssentials.appleSignIn(
    Platform.select({
      ios: undefined,
      android: androidWebUrl,
    })
  )) as AppleIdCredentialResult | WebAppleIdCredentialResult;
  if (result.type === CredentialsType.APPLE_ID) {
    if (APPLE_ID_CACHED_RESULTS.has(result.data.user)) {
      // Reuse the fullName and email provided
      const cached = APPLE_ID_CACHED_RESULTS.get(
        result.data.user
      ) as AppleIdCredentialResult['data'];

      const data = result.data;
      if (!data.fullName) {
        data.fullName = cached.fullName;
      }
      if (!data.email) {
        data.email = cached.email;
      }
    } else {
      APPLE_ID_CACHED_RESULTS.set(result.data.user, result.data);
    }
    return result as AppleIdCredentialResult;
  } else {
    return result as WebAppleIdCredentialResult;
  }
}

/**
 * Performs all sign in methods available on the platform at once.
 * This is supposed to be used on app start to get any existing sign in.
 */
export async function hybridSignIn(
  googleClientId: string,
  options?: GoogleSignInOptions
): Promise<
  | AppleIdCredentialResult
  | GoogleIdCredentialResult
  | PasswordCredentialResult
  | CancelledCredentialResult
> {
  return (await OauthEssentials.hybridSignIn(
    googleClientId,
    parseGoogleIdOptions(options)
  )) as
    | AppleIdCredentialResult
    | GoogleIdCredentialResult
    | PasswordCredentialResult;
}

/**
 * Creates a passkey.
 * @param options
 */
export async function createPassKey(
  options: PasskeyOptions
): Promise<PassKeyCredentialResult> {
  return (await OauthEssentials.createPassKey(
    options
  )) as PassKeyCredentialResult;
}

function parseGoogleIdOptions(options?: any) {
  const bridgeOptions: GoogleSignInOptions = {
    authorizedAccounts: false,
    autoSelectEnabled: false,
  };

  const hasOptions =
    options && typeof options === 'object' && Object.keys(options).length > 0;

  if (hasOptions) {
    if (Platform.OS === 'android') {
      if (options.hasOwnProperty('authorizedAccounts')) {
        bridgeOptions.authorizedAccounts = options.authorizedAccounts === true;
      }
      if (options.hasOwnProperty('autoSelectEnabled')) {
        bridgeOptions.autoSelectEnabled = options.autoSelectEnabled === true;
      }
    }
  }
  return bridgeOptions;
}

const CONSTANTS = OauthEssentials.getConstants();

/**
 * Google Play are supported.
 * It always false on IOS, cause IOS does not use Google Play Services.
 */
export const GOOGLE_PLAY_SERVICES_SUPPORTED =
  CONSTANTS.GOOGLE_PLAY_SERVICES_SUPPORTED;

/**
 * The password method is supported.
 */
export const PASSWORD_SUPPORTED = CONSTANTS.PASSWORD_SUPPORTED;

/**
 * Google Play id sign in is supported.
 * You should mainly rely on this constant to check if you can use google sign in.
 */
export const GOOGLE_ID_SUPPORTED = CONSTANTS.GOOGLE_ID_SUPPORTED;

/**
 * Gets if Apple id sign in is supported.
 */
export const APPLE_ID_SUPPORTED = CONSTANTS.APPLE_ID_SUPPORTED;

/**
 * Gets if "hybrid" is supported in this platform.
 */
export const HYBRID_SUPPORTED = CONSTANTS.HYBRID_SUPPORTED;

/**
 * Gets if passkeys are supported.
 */
export const PASSKEYS_SUPPORTED = CONSTANTS.PASSKEYS_SUPPORTED;
