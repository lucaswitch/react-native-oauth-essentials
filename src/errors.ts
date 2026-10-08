import {
  CredentialError,
  type CredentialErrorCode,
  type OauthEssentialsError,
} from './types';

const CODES = new Set<string>(Object.values(CredentialError));

/**
 * Narrows an unknown error (e.g. in a `catch`) to an error rejected by this library, optionally
 * with a specific code.
 *
 * ```ts
 * try {
 *   await googleSignIn({ iosClientId, webClientId });
 * } catch (e) {
 *   if (isCredentialError(e, CredentialError.BROWSER_UNAVAILABLE)) retryLater();
 *   else if (isCredentialError(e)) report(e.code, e.message);
 *   else throw e;
 * }
 * ```
 */
export function isCredentialError<
  C extends CredentialErrorCode = CredentialErrorCode
>(error: unknown, code?: C): error is OauthEssentialsError<C> {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const value = (error as { code?: unknown }).code;
  if (typeof value !== 'string' || !CODES.has(value)) {
    return false;
  }
  return code === undefined || value === code;
}

export function createCredentialError<C extends CredentialErrorCode>(
  code: C,
  message: string,
  cause?: unknown
): OauthEssentialsError<C> {
  const error = new Error(message) as OauthEssentialsError<C> & {
    cause?: unknown;
  };
  error.code = code;
  if (cause !== undefined) {
    error.cause = cause;
  }
  return error;
}
