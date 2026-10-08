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

function decodeComponent(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, ' '));
}

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
  Object.assign(params, p.additionalParameters ?? {});

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
    throw new Error(`Invalid redirect uri: ${url}`);
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
