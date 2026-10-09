import Foundation
import React
import GoogleSignIn
import AuthenticationServices
import CryptoKit
import Security
import UIKit

/// TurboModule methods are called on the module queue. Every method hops to the main thread, so
/// the retrievers, the simultaneous call lock and all UIKit/AuthenticationServices calls run on main.
public class OauthEssentialsModule: NSObject {

  public var onCredentialSuccess: ((NSDictionary) -> Void)?
  public var onCredentialFailure: ((NSDictionary) -> Void)?
  public var onAppleIdCredentialRevoked: ((NSDictionary) -> Void)?

  private var _password_retriever: PasswordRetriever? = nil
  private var _google_id_retriever: GoogleIdRetriever? = nil
  private var _apple_id_retriever: AppleIdRetriever? = nil
  private var _hybrid_retriever: HybridRetriever? = nil
  private var _passkey_retriever: RCTPromiseSettler? = nil
  private var _auth_session_retriever: AuthSessionRetriever? = nil
  private var revokedObserver: NSObjectProtocol?

  @objc
  public init(
    onCredentialSuccess: @escaping ((NSDictionary) -> Void),
    onCredentialFailure: @escaping ((NSDictionary) -> Void),
    onAppleIdCredentialRevoked: @escaping ((NSDictionary) -> Void)
  ) {
    super.init()

    self.onCredentialSuccess = onCredentialSuccess
    self.onCredentialFailure = onCredentialFailure
    self.onAppleIdCredentialRevoked = onAppleIdCredentialRevoked

    self.revokedObserver = NotificationCenter.default.addObserver(
      forName: ASAuthorizationAppleIDProvider.credentialRevokedNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.onAppleIdCredentialRevoked?(["type": "REVOKED"])
    }
  }

  deinit {
    if let revokedObserver = revokedObserver {
      NotificationCenter.default.removeObserver(revokedObserver)
    }
  }

  /// Returns true when the previous call of the same method already settled its promise.
  private func ensurePreviousPromiseSettled(settler: RCTPromiseSettler?, reject: RCTPromiseRejectBlock) -> Bool {
    guard let settler = settler else { return true }
    if settler.settled() { return true }

    reject(
      CredentialError.simultaneousCallError.rawValue,
      "Another operation is in progress",
      nil
    )
    return false
  }

  @objc(requiresMainQueueSetup)
  static func requiresMainQueueSetup() -> Bool { true }

  @objc
  public func getConstants() -> [String: Any] {
    var googleIdSupported: Bool = false
    var appleIdSupported: Bool  = false
    var passwordSupported: Bool  = false
    var passkeySupported = false
    if #available(iOS 13.0, *) {
      // Modern GoogleSignIn works on iOS 13+
      googleIdSupported = true
      appleIdSupported = true
      passwordSupported = true
    }
    if #available(iOS 16.0, *) {
      passkeySupported = true
    }

    return [
      "GOOGLE_ID_SUPPORTED": googleIdSupported,
      "PASSWORD_SUPPORTED": passwordSupported,
      "GOOGLE_PLAY_SERVICES_SUPPORTED": false, // Not applicable on iOS, it does not have Google Play Services
      "APPLE_ID_SUPPORTED": appleIdSupported,
      "HYBRID_SUPPORTED": passwordSupported || appleIdSupported,
      "PASSKEYS_SUPPORTED": passkeySupported,
      "OAUTH_REDIRECT_URI": "\((Bundle.main.bundleIdentifier ?? "app").lowercased())://oauth/callback"
    ]
  }

  @objc
  public func googleSignIn(
    _ clientId: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.ensurePreviousPromiseSettled(settler: self._google_id_retriever, reject: reject) {
        self._google_id_retriever = GoogleIdRetriever(clientId: clientId, options: options, silent: false, resolve: resolve, reject: reject, emitEvent: self.emitEvent)
      }
    }
  }

  @objc
  public func googleSilentSignIn(
    _ clientId: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.ensurePreviousPromiseSettled(settler: self._google_id_retriever, reject: reject) {
        self._google_id_retriever = GoogleIdRetriever(clientId: clientId, options: options, silent: true, resolve: resolve, reject: reject, emitEvent: self.emitEvent)
      }
    }
  }

  @objc
  public func signOut(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      GIDSignIn.sharedInstance.signOut()
      resolve(true)
    }
  }

  /// iOS has no API to save a password without an associated domain: let the system offer it
  /// through the text fields `textContentType` instead.
  @objc
  public func passwordSignIn(
    _ username: String,
    password: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(false)
  }

  @objc
  public func getPassword(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.ensurePreviousPromiseSettled(settler: self._password_retriever, reject: reject) {
        self._password_retriever = PasswordRetriever(resolve: resolve, reject: reject, emitEvent: self.emitEvent)
      }
    }
  }

  @objc
  public func hybridSignIn(
    _ clientId: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if self.ensurePreviousPromiseSettled(settler: self._hybrid_retriever, reject: reject) {
        self._hybrid_retriever = HybridRetriever(clientId: clientId, options: options, resolve: resolve, reject: reject, emitEvent: self.emitEvent)
      }
    }
  }

  @objc(createPassKey:resolver:rejecter:)
  public func createPassKey(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    performPassKey(options: options, registration: true, resolve: resolve, reject: reject)
  }

  @objc(getPassKey:resolver:rejecter:)
  public func getPassKey(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    performPassKey(options: options, registration: false, resolve: resolve, reject: reject)
  }

  private func performPassKey(
    options: NSDictionary,
    registration: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.0, *) else {
      reject(
        CredentialError.notSupportedError.rawValue,
        "Passkeys require iOS 16.0 or later",
        nil
      )
      return
    }

    DispatchQueue.main.async {
      // A pending AutoFill request must not block an explicit passkey request.
      if let pending = self._passkey_retriever as? PasskeyRetriever, pending.autoFill, !pending.settled() {
        pending.cancel()
        pending.succeed(CredentialFactory.fromCancelled())
      }

      if self.ensurePreviousPromiseSettled(settler: self._passkey_retriever, reject: reject) {
        guard let requestJson = options["requestJson"] as? String else {
          reject(
            CredentialError.invalidResult.rawValue,
            "\"requestJson\" field is required",
            nil
          )
          return
        }

        self._passkey_retriever = PasskeyRetriever(
          requestJson: requestJson,
          mode: registration ? .registration : .assertion,
          autoFill: (options["mediation"] as? String) == "autofill",
          resolve: resolve,
          reject: reject,
          emitEvent: self.emitEvent
        )
      }
    }
  }

  @objc
  public func cancelPassKeyAutoFill(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.0, *) else {
      resolve(false)
      return
    }

    DispatchQueue.main.async {
      guard let pending = self._passkey_retriever as? PasskeyRetriever, pending.autoFill, !pending.settled() else {
        resolve(false)
        return
      }
      pending.cancel()
      pending.succeed(CredentialFactory.fromCancelled())
      resolve(true)
    }
  }

  @objc(appleSignIn:options:resolver:rejecter:)
  public func appleSignIn(
    _ webAndroidUrl: String?,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.ensurePreviousPromiseSettled(settler: self._apple_id_retriever, reject: reject) {
        self._apple_id_retriever = AppleIdRetriever(options: options, resolve: resolve, reject: reject, emitEvent: self.emitEvent)
      }
    }
  }

  @objc(getAppleIdCredentialState:resolver:rejecter:)
  public func getAppleIdCredentialState(
    _ userId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ASAuthorizationAppleIDProvider().getCredentialState(forUserID: userId) { state, error in
      if let error = error {
        reject(CredentialError.invalidResult.rawValue, error.localizedDescription, error)
        return
      }
      switch state {
      case .authorized:
        resolve("AUTHORIZED")
      case .revoked:
        resolve("REVOKED")
      case .transferred:
        resolve("TRANSFERRED")
      default:
        resolve("NOT_FOUND")
      }
    }
  }

  @objc
  public func generatePkce(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let codeVerifier = Pkce.randomString(byteCount: 32),
          let state = Pkce.randomString(byteCount: 16) else {
      reject(CredentialError.invalidResult.rawValue, "Unable to generate random bytes", nil)
      return
    }
    resolve([
      "codeVerifier": codeVerifier,
      "codeChallenge": Pkce.challenge(for: codeVerifier),
      "state": state
    ])
  }

  @objc(openAuthSession:options:resolver:rejecter:)
  public func openAuthSession(
    _ url: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.ensurePreviousPromiseSettled(settler: self._auth_session_retriever, reject: reject) {
        self._auth_session_retriever = AuthSessionRetriever(url: url, options: options, resolve: resolve, reject: reject)
      }
    }
  }

  private func emitEvent(eventName: String, body: NSDictionary) {
    switch eventName {
      case "onCredentialSuccess":
        onCredentialSuccess?(body)

      case "onCredentialFailure":
        onCredentialFailure?(body)

      default:
        print("Unhandled event found: \(eventName)")
    }
  }
}

enum Pkce {
  static func randomString(byteCount: Int) -> String? {
    var bytes = [UInt8](repeating: 0, count: byteCount)
    guard SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes) == errSecSuccess else {
      return nil
    }
    return Data(bytes).base64URLEncodedString()
  }

  static func challenge(for verifier: String) -> String {
    return Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncodedString()
  }
}

/// Opens an url in ASWebAuthenticationSession and resolves with the redirect url.
/// It does not emit events: oauthSignIn finishes the flow in JS.
public class AuthSessionRetriever: RCTPromiseSettler, ASWebAuthenticationPresentationContextProviding {

  private var session: ASWebAuthenticationSession?

  init(
    url: String,
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    super.init(resolve: resolve, reject: reject, emitEvent: nil)

    guard let authUrl = URL(string: url),
          let callbackScheme = options["callbackScheme"] as? String else {
      fail(.invalidResult, "Invalid authorization url or redirect uri")
      return
    }
    whenBrowserCanOpen("oauthSignIn") { _ in
      let session = ASWebAuthenticationSession(url: authUrl, callbackURLScheme: callbackScheme) { callbackURL, error in
        self.session = nil
        self.handle(callbackURL: callbackURL, error: error)
      }
      session.presentationContextProvider = self
      session.prefersEphemeralWebBrowserSession = (options["prefersEphemeralSession"] as? Bool) ?? false
      self.session = session

      if !session.start() {
        self.session = nil
        self.fail(.browserUnavailable, "Unable to start the browser session")
      }
    }
  }

  private func handle(callbackURL: URL?, error: Error?) {
    if let error = error {
      let nsError = error as NSError
      if nsError.domain == ASWebAuthenticationSessionError.errorDomain {
        switch nsError.code {
        case ASWebAuthenticationSessionError.canceledLogin.rawValue:
          succeed(CredentialFactory.fromCancelled())
          return
        case ASWebAuthenticationSessionError.presentationContextNotProvided.rawValue,
             ASWebAuthenticationSessionError.presentationContextInvalid.rawValue:
          fail(.browserUnavailable, error.localizedDescription, error)
          return
        default:
          break
        }
      }
      fail(.invalidResult, error.localizedDescription, error)
      return
    }

    guard let callbackURL = callbackURL else {
      fail(.invalidResult, "No redirect url returned")
      return
    }
    succeed([
      "type": CredentialsType.redirect.rawValue,
      "data": ["url": callbackURL.absoluteString]
    ])
  }

  public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    return PresentationContext.anchor()
  }
}
