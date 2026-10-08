import GoogleSignIn
import React

/// Must be created on the main thread: GIDSignIn presents ASWebAuthenticationSession synchronously.
public class GoogleIdRetriever: RCTPromiseSettler {

  /// How long to wait for the app to become active before giving up on opening the browser.
  private static let activeTimeout: TimeInterval = 2

  init(
    clientId: String,
    options: NSDictionary,
    silent: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)

    // GIDSignIn raises an NSException (crashing the app) for a missing client id or URL scheme,
    // so both are validated here and reported as CONFIGURATION_ERROR instead.
    guard let clientId = Self.resolveClientId(clientId) else {
      fail(
        .configuration,
        "Missing Google iOS client id: pass { iosClientId } or set GIDClientID in Info.plist"
      )
      return
    }
    let scheme = Self.urlScheme(for: clientId)
    guard Self.registeredUrlSchemes().contains(scheme) else {
      fail(
        .configuration,
        "Info.plist is missing the URL scheme \"\(scheme)\" required by Google Sign-In. Add it to "
          + "CFBundleURLTypes > CFBundleURLSchemes (or use the Expo config plugin). "
          + "\(clientId) must be the iOS client id; web client ids go in serverClientId."
      )
      return
    }

    GIDSignIn.sharedInstance.configuration = GIDConfiguration(
      clientID: clientId,
      serverClientID: options["serverClientId"] as? String ?? Self.infoPlistString("GIDServerClientID"),
      hostedDomain: options["hostedDomain"] as? String,
      openIDRealm: nil
    )

    if silent {
      restorePreviousSignIn()
    } else {
      performGoogleSignIn(options: options)
    }
  }

  private func performGoogleSignIn(options: NSDictionary) {
    if UIAccessibility.isGuidedAccessEnabled {
      fail(.browserUnavailable, "Google Sign-In cannot open the browser while Guided Access is enabled")
      return
    }

    PresentationContext.whenActive(timeout: Self.activeTimeout) { active in
      guard active else {
        self.fail(.browserUnavailable, "Google Sign-In requires the app to be active")
        return
      }
      guard let presenter = PresentationContext.topViewController() else {
        self.fail(.noActivity, "No view controller available to present Google Sign-In")
        return
      }

      GIDSignIn.sharedInstance.signIn(
        withPresenting: presenter,
        hint: options["hint"] as? String,
        additionalScopes: options["scopes"] as? [String],
        nonce: options["nonce"] as? String
      ) { result, error in
        self.handle(user: result?.user, serverAuthCode: result?.serverAuthCode, error: error)
      }
    }
  }

  private func restorePreviousSignIn() {
    guard GIDSignIn.sharedInstance.hasPreviousSignIn() else {
      fail(.noSignInAvailable, "No previous Google sign in to restore")
      return
    }

    GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
      if let error = error as NSError?,
         error.domain == kGIDSignInErrorDomain,
         error.code == GIDSignInError.hasNoAuthInKeychain.rawValue {
        self.fail(.noSignInAvailable, "No previous Google sign in to restore", error)
        return
      }
      self.handle(user: user, serverAuthCode: nil, error: error)
    }
  }

  private func handle(user: GIDGoogleUser?, serverAuthCode: String?, error: Error?) {
    if let error = error {
      let nsError = error as NSError
      if nsError.domain == kGIDSignInErrorDomain,
         nsError.code == GIDSignInError.canceled.rawValue {
        succeed(CredentialFactory.fromCancelled())
      } else if Self.isBrowserUnavailable(nsError) {
        fail(.browserUnavailable, error.localizedDescription, error)
      } else {
        fail(.invalidResult, error.localizedDescription, error)
      }
      return
    }

    guard let user = user else {
      fail(.invalidResult, "No user returned")
      return
    }

    succeed(CredentialFactory.fromGoogleId(user: user, serverAuthCode: serverAuthCode))
  }

  /// The client id passed from JS, or GIDClientID from Info.plist when it is empty.
  private static func resolveClientId(_ clientId: String) -> String? {
    let trimmed = clientId.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty {
      return trimmed
    }
    return infoPlistString("GIDClientID")
  }

  private static func infoPlistString(_ key: String) -> String? {
    guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
          !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return nil
    }
    return value
  }

  /// Same rule as GIDSignInCallbackSchemes: the reversed client id, lowercased.
  private static func urlScheme(for clientId: String) -> String {
    return clientId.split(separator: ".").reversed().joined(separator: ".").lowercased()
  }

  private static func registeredUrlSchemes() -> Set<String> {
    let urlTypes = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] ?? []
    let schemes = urlTypes.flatMap { $0["CFBundleURLSchemes"] as? [String] ?? [] }
    return Set(schemes.map { $0.lowercased() })
  }

  /// GIDSignIn reports a failed ASWebAuthenticationSession start as an unknown error that only
  /// keeps AppAuth's "Unable to open Safari." message (OIDErrorCodeSafariOpenError = -9).
  private static func isBrowserUnavailable(_ error: NSError) -> Bool {
    if let underlying = error.userInfo[NSUnderlyingErrorKey] as? NSError,
       underlying.domain == "org.openid.appauth.general",
       underlying.code == -9 {
      return true
    }
    return error.domain == kGIDSignInErrorDomain
      && error.code == GIDSignInError.unknown.rawValue
      && error.localizedDescription.contains("Unable to open Safari")
  }
}
