import {
  buildAuthorizationUrl,
  buildTokenRequestBody,
  getUrlScheme,
  parseRedirectParams,
} from '../oauth';

describe('buildAuthorizationUrl', () => {
  it('builds a PKCE authorization url', () => {
    const url = buildAuthorizationUrl({
      authorizationEndpoint: 'https://auth.example.com/authorize',
      clientId: 'client id',
      redirectUri: 'com.example.app://oauth/callback',
      scopes: ['openid', 'profile'],
      state: 'abc',
      codeChallenge: 'xyz',
      additionalParameters: { prompt: 'login' },
    });
    expect(url).toBe(
      'https://auth.example.com/authorize?response_type=code&client_id=client%20id' +
        '&redirect_uri=com.example.app%3A%2F%2Foauth%2Fcallback&state=abc' +
        '&scope=openid%20profile&code_challenge=xyz&code_challenge_method=S256&prompt=login'
    );
  });

  it('appends to an endpoint that already has a query', () => {
    const url = buildAuthorizationUrl({
      authorizationEndpoint: 'https://auth.example.com/authorize?tenant=1',
      clientId: 'c',
      redirectUri: 'app://cb',
      state: 's',
    });
    expect(
      url.startsWith(
        'https://auth.example.com/authorize?tenant=1&response_type=code'
      )
    ).toBe(true);
    expect(url).not.toContain('code_challenge');
  });

  it('ignores reserved additionalParameters and allows scope', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const url = buildAuthorizationUrl({
      authorizationEndpoint: 'https://auth.example.com/authorize',
      clientId: 'c',
      redirectUri: 'app://cb',
      scopes: ['openid'],
      state: 's',
      codeChallenge: 'x',
      additionalParameters: {
        state: 'mine',
        redirect_uri: 'other://cb',
        code_challenge: 'y',
        scope: 'openid email',
      },
    });
    expect(url).toContain('&state=s&');
    expect(url).toContain('redirect_uri=app%3A%2F%2Fcb');
    expect(url).toContain('code_challenge=x&');
    expect(url).toContain('scope=openid%20email');
    expect(url).not.toContain('mine');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('additionalParameters.state is ignored')
    );
    warn.mockRestore();
  });
});

describe('parseRedirectParams', () => {
  it('reads query and fragment parameters', () => {
    expect(
      parseRedirectParams('app://cb?code=a%2Fb&state=s+1#id_token=t&flag')
    ).toEqual({ code: 'a/b', state: 's 1', id_token: 't', flag: '' });
  });

  it('keeps malformed percent-encoding raw instead of throwing', () => {
    expect(
      parseRedirectParams(
        'app://cb?error=access_denied&error_description=50%off+now'
      )
    ).toEqual({ error: 'access_denied', error_description: '50%off now' });
  });

  it('returns an empty object without parameters', () => {
    expect(parseRedirectParams('app://cb')).toEqual({});
  });
});

describe('getUrlScheme', () => {
  it('extracts the scheme', () => {
    expect(getUrlScheme('com.example.app://oauth/callback')).toBe(
      'com.example.app'
    );
  });

  it('throws on invalid urls', () => {
    expect(() => getUrlScheme('no-scheme')).toThrow();
  });
});

describe('buildTokenRequestBody', () => {
  it('includes the code verifier when present', () => {
    expect(
      buildTokenRequestBody({
        code: 'c',
        clientId: 'id',
        redirectUri: 'app://cb',
        codeVerifier: 'v',
      })
    ).toBe(
      'grant_type=authorization_code&code=c&client_id=id&redirect_uri=app%3A%2F%2Fcb&code_verifier=v'
    );
  });
});
