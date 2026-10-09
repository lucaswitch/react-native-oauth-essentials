const {
  googleUrlScheme,
  googleIdsFromServicesPlist,
  googleIdsFromServicesJson,
  resolveGoogleIds,
  setGoogleInfoPlist,
  setGoogleWebClientIdMetaData,
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

  it('reads CLIENT_ID from GoogleService-Info.plist', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>CLIENT_ID</key>
  <string>${iosClientId}</string>
  <key>REVERSED_CLIENT_ID</key>
  <string>com.googleusercontent.apps.1234-abcd</string>
</dict></plist>`;
    expect(googleIdsFromServicesPlist(xml)).toEqual({ iosClientId });
    expect(googleIdsFromServicesPlist('<plist/>')).toEqual({
      iosClientId: undefined,
    });
  });

  const servicesJson = {
    client: [
      {
        client_info: {
          android_client_info: { package_name: 'com.other' },
        },
        oauth_client: [{ client_id: 'other-web', client_type: 3 }],
      },
      {
        client_info: { android_client_info: { package_name: 'com.app' } },
        oauth_client: [
          { client_id: 'android-id', client_type: 1 },
          { client_id: 'web-id', client_type: 3 },
        ],
        services: {
          appinvite_service: {
            other_platform_oauth_client: [
              { client_id: 'web-id', client_type: 3 },
              {
                client_id: 'other-ios',
                client_type: 2,
                ios_info: { bundle_id: 'com.other' },
              },
              {
                client_id: iosClientId,
                client_type: 2,
                ios_info: { bundle_id: 'com.app' },
              },
            ],
          },
        },
      },
    ],
  };

  it('reads the web and iOS client ids from google-services.json', () => {
    expect(
      googleIdsFromServicesJson(servicesJson, {
        androidPackage: 'com.app',
        bundleIdentifier: 'com.app',
      })
    ).toEqual({ webClientId: 'web-id', iosClientId });
    expect(googleIdsFromServicesJson({}, {})).toEqual({});
  });

  it('prefers explicit ids over the Firebase files', () => {
    expect(
      resolveGoogleIds(
        { webClientId: 'explicit-web' },
        { iosClientId: 'plist-ios' },
        { iosClientId: 'json-ios', webClientId: 'json-web' }
      )
    ).toEqual({ iosClientId: 'plist-ios', webClientId: 'explicit-web' });
    expect(resolveGoogleIds(true, {}, { webClientId: 'json-web' })).toEqual({
      iosClientId: undefined,
      webClientId: 'json-web',
    });
  });

  it('sets the web client id meta-data once', () => {
    const manifest = {
      manifest: {
        application: [
          {
            'meta-data': [
              { $: { 'android:name': 'other', 'android:value': 'x' } },
              {
                $: {
                  'android:name': 'com.oauthessentials.GOOGLE_WEB_CLIENT_ID',
                  'android:value': 'old',
                },
              },
            ],
          },
        ],
      },
    };
    const result = setGoogleWebClientIdMetaData(manifest, 'web-id');
    expect(result.manifest.application[0]['meta-data']).toEqual([
      { $: { 'android:name': 'other', 'android:value': 'x' } },
      {
        $: {
          'android:name': 'com.oauthessentials.GOOGLE_WEB_CLIENT_ID',
          'android:value': 'web-id',
        },
      },
    ]);
    expect(manifest.manifest.application[0]?.['meta-data']).toHaveLength(2);
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
