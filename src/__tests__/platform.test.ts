import {
  missingNativeModuleMessage,
  resolveGoogleClientId,
  splitGoogleArgs,
  warnIgnored,
  warnOnce,
} from '../platform';

describe('splitGoogleArgs', () => {
  const options = { scopes: ['email'] };

  it('takes a string or client ids object as the client id', () => {
    expect(splitGoogleArgs('id', options)).toEqual({
      clientId: 'id',
      options,
    });
    expect(splitGoogleArgs({ webClientId: 'web' }, options)).toEqual({
      clientId: { webClientId: 'web' },
      options,
    });
    expect(splitGoogleArgs({ iosClientId: undefined }, undefined)).toEqual({
      clientId: { iosClientId: undefined },
      options: undefined,
    });
  });

  it('takes any other object as the options', () => {
    expect(splitGoogleArgs(options, undefined)).toEqual({
      clientId: undefined,
      options,
    });
  });

  it('accepts no client id', () => {
    expect(splitGoogleArgs(undefined, undefined)).toEqual({
      clientId: undefined,
      options: undefined,
    });
    expect(splitGoogleArgs(null, options)).toEqual({
      clientId: undefined,
      options,
    });
  });
});

describe('missingNativeModuleMessage', () => {
  const global = globalThis as { expo?: unknown };
  afterEach(() => {
    delete global.expo;
  });

  it('asks for a rebuild', () => {
    expect(missingNativeModuleMessage()).toMatch(/pod install/);
  });

  it('explains Expo Go', () => {
    global.expo = { modules: { ExpoGo: {} } };
    expect(missingNativeModuleMessage()).toMatch(/does not work in Expo Go/);
  });
});

describe('resolveGoogleClientId', () => {
  it('passes a string as is', () => {
    expect(resolveGoogleClientId('ios', 'abc', {})).toEqual({
      clientId: 'abc',
      options: {},
    });
    expect(resolveGoogleClientId('android', 'abc', {})).toEqual({
      clientId: 'abc',
      options: {},
    });
  });

  it('uses iosClientId on iOS and webClientId as default serverClientId', () => {
    expect(
      resolveGoogleClientId(
        'ios',
        { iosClientId: 'ios-id', webClientId: 'web-id' },
        {}
      )
    ).toEqual({ clientId: 'ios-id', options: { serverClientId: 'web-id' } });
  });

  it('keeps an explicit serverClientId on iOS', () => {
    expect(
      resolveGoogleClientId(
        'ios',
        { iosClientId: 'ios-id', webClientId: 'web-id' },
        { serverClientId: 'other' }
      ).options.serverClientId
    ).toBe('other');
  });

  it('sends an empty iOS client id so native reads GIDClientID', () => {
    expect(
      resolveGoogleClientId('ios', { webClientId: 'web-id' }, {}).clientId
    ).toBe('');
  });

  it('uses webClientId on Android', () => {
    expect(
      resolveGoogleClientId(
        'android',
        { iosClientId: 'ios-id', webClientId: 'web-id' },
        { nonce: 'n' }
      )
    ).toEqual({ clientId: 'web-id', options: { nonce: 'n' } });
    expect(
      resolveGoogleClientId('android', { iosClientId: 'ios-id' }, {}).clientId
    ).toBe('');
  });
});

describe('warnings', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('warns once per method and ignored option that was set', () => {
    warnIgnored('testMethod', 'android', { hint: 'a', nonce: 'n' }, ['hint']);
    warnIgnored('testMethod', 'android', { hint: 'b' }, ['hint']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe(
      '[react-native-oauth-essentials] testMethod: "hint" is ignored on Android.'
    );
  });

  it('does not warn for options that were not set', () => {
    warnIgnored('otherMethod', 'ios', { nonce: 'n' }, ['mode', 'hint']);
    warnIgnored('otherMethod', 'ios', undefined, ['mode']);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warnOnce logs a message once', () => {
    warnOnce('m', 'k', 'msg');
    warnOnce('m', 'k', 'msg');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
