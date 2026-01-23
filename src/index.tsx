import OauthEssentials from './NativeOauthEssentials';
import { Platform } from 'react-native';
import type {
  AppleIdCredentialResult,
  GoogleIdCredentialResult,
  GoogleSignInOptions,
  PasswordCredentialResult,
} from './types';

export * from './types';

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
): Promise<GoogleIdCredentialResult> {
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
 * Performs the apple sign in.
 */
export async function appleSignIn(): Promise<AppleIdCredentialResult> {
  return (await OauthEssentials.appleSignIn()) as AppleIdCredentialResult;
}

/**
 * Performs all sign in methods available on the platform at once.
 * This is supposed to be used on app start to get any existing sign in.
 */
export async function hybridSignIn(
  googleClientId: string,
  options?: GoogleSignInOptions
): Promise<
  AppleIdCredentialResult | GoogleIdCredentialResult | PasswordCredentialResult
> {
  return (await OauthEssentials.hybridSignIn(
    googleClientId,
    parseGoogleIdOptions(options)
  )) as
    | AppleIdCredentialResult
    | GoogleIdCredentialResult
    | PasswordCredentialResult;
}

function parseGoogleIdOptions(options?: any) {
  const bridgeOptions = {
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
