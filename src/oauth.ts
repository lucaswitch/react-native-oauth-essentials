import { createCredentialError } from './errors';
import { warnOnce } from './platform';
import { CredentialError } from './types';

export type PkcePair = {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
};

export type AuthorizationUrlParams = {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  additionalParameters?: Record<string, string>;
  state: string;
  codeChallenge?: string;
};

function encodeQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]!)}`
    )
    .join('&');
}

/**
 * Decodes a query component, keeping it raw when its percent-encoding is malformed (`50%off`), so
 * a provider bug does not turn into an error without `code`.
 */
function decodeComponent(value: string): string {
  const spaced = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

/**
 * Set by the library and checked or reused later (state, PKCE, token exchange), so
 * `additionalParameters` cannot override them.
 */
export const RESERVED_AUTHORIZATION_PARAMS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
] as const;

export function buildAuthorizationUrl(p: AuthorizationUrlParams): string {
  const params: Record<string, string> = {
    response_type: 'code',
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    state: p.state,
  };
  if (p.scopes && p.scopes.length > 0) {
    params.scope = p.scopes.join(' ');
  }
  if (p.codeChallenge) {
    params.code_challenge = p.codeChallenge;
    params.code_challenge_method = 'S256';
  }
  const reserved: readonly string[] = RESERVED_AUTHORIZATION_PARAMS;
  for (const [key, value] of Object.entries(p.additionalParameters ?? {})) {
    if (reserved.includes(key)) {
      warnOnce(
        'oauthSignIn',
        `additionalParameters.${key}`,
        `additionalParameters.${key} is ignored: the library sets it (use the matching option instead).`
      );
      continue;
    }
    params[key] = value;
  }

  const separator = p.authorizationEndpoint.includes('?') ? '&' : '?';
  return `${p.authorizationEndpoint}${separator}${encodeQuery(params)}`;
}

/**
 * Reads the query and fragment parameters of a redirect url.
 */
export function parseRedirectParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');
  const parts: string[] = [];
  if (queryStart >= 0) {
    parts.push(
      url.slice(queryStart + 1, hashStart > queryStart ? hashStart : undefined)
    );
  }
  if (hashStart >= 0) {
    parts.push(url.slice(hashStart + 1));
  }
  for (const part of parts) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = decodeComponent(eq >= 0 ? pair.slice(0, eq) : pair);
      params[key] = eq >= 0 ? decodeComponent(pair.slice(eq + 1)) : '';
    }
  }
  return params;
}

export function getUrlScheme(url: string): string {
  const index = url.indexOf(':');
  if (index <= 0) {
    throw createCredentialError(
      CredentialError.CONFIGURATION_ERROR,
      `Invalid redirect uri: ${url}`
    );
  }
  return url.slice(0, index);
}

export function buildTokenRequestBody(p: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string | null;
}): string {
  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    code: p.code,
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
  };
  if (p.codeVerifier) {
    params.code_verifier = p.codeVerifier;
  }
  return encodeQuery(params);
}
