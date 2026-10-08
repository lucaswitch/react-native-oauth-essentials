const {
  googleUrlScheme,
  setGoogleInfoPlist,
  setEntitlements,
} = require('../../plugin/withOauthEssentials');

describe('Expo plugin', () => {
  const iosClientId = '1234-abcd.apps.googleusercontent.com';

  it('reverses the client id like GoogleSignIn', () => {
    expect(googleUrlScheme(iosClientId)).toBe(
      'com.googleusercontent.apps.1234-abcd'
    );
  });

  it('adds the URL scheme and client ids to Info.plist', () => {
    const plist = setGoogleInfoPlist(
      { CFBundleURLTypes: [{ CFBundleURLSchemes: ['myapp'] }] },
      { iosClientId, webClientId: 'web-id' }
    );
    expect(plist.CFBundleURLTypes).toEqual([
      { CFBundleURLSchemes: ['myapp'] },
      { CFBundleURLSchemes: ['com.googleusercontent.apps.1234-abcd'] },
    ]);
    expect(plist.GIDClientID).toBe(iosClientId);
    expect(plist.GIDServerClientID).toBe('web-id');
  });

  it('does not duplicate an existing scheme', () => {
    const input = {
      CFBundleURLTypes: [
        { CFBundleURLSchemes: ['com.googleusercontent.apps.1234-ABCD'] },
      ],
    };
    expect(
      setGoogleInfoPlist(input, { iosClientId }).CFBundleURLTypes
    ).toHaveLength(1);
  });

  it('requires iosClientId', () => {
    expect(() => setGoogleInfoPlist({}, { webClientId: 'web-id' })).toThrow(
      /iosClientId/
    );
  });

  it('adds Apple and webcredentials entitlements without duplicates', () => {
    const entitlements = setEntitlements(
      {
        'com.apple.developer.associated-domains': [
          'applinks:example.com',
          'webcredentials:example.com',
        ],
      },
      { appleSignIn: true, webCredentialsDomains: ['example.com', 'other.com'] }
    );
    expect(entitlements['com.apple.developer.applesignin']).toEqual([
      'Default',
    ]);
    expect(entitlements['com.apple.developer.associated-domains']).toEqual([
      'applinks:example.com',
      'webcredentials:example.com',
      'webcredentials:other.com',
    ]);
  });
});

export {};
