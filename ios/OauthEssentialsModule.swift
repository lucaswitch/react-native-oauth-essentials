import Foundation
import React
import GoogleSignIn
import AuthenticationServices
import Security
import UIKit

public class OauthEssentialsModule: NSObject {

  public var onCredentialSuccess: ((NSDictionary) -> Void)?
  public var onCredentialFailure: ((NSDictionary) -> Void)?

  private var _password_retriever: PasswordRetriever? = nil
  private var _google_id_retriever: GoogleIdRetriever? = nil
  private var _apple_id_retriever: AppleIdRetriever? = nil
  private var _hybrid_retriever: HybridRetriever? = nil
  private var _passkey_retriever: RCTPromiseSettler? = nil

  @objc
  public init(
    onCredentialSuccess: @escaping ((NSDictionary) -> Void),
    onCredentialFailure: @escaping ((NSDictionary) -> Void)
  ) {
    super.init()

    self.onCredentialSuccess = onCredentialSuccess
    self.onCredentialFailure = onCredentialFailure
  }

  private func ensurePreviousPromiseSettled(settler: RCTPromiseSettler?, reject: RCTPromiseRejectBlock) -> Bool {
    if settler == nil || (settler != nil && ((settler?.settled()) != nil)) {
      return true
    }

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
      "PASSKEYS_SUPPORTED": passkeySupported
    ]
  }

  @objc
  public func googleSignIn(
    _ clientId: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if (ensurePreviousPromiseSettled(settler: self._google_id_retriever,reject: reject)) {
      self._google_id_retriever = GoogleIdRetriever(clientId: clientId, options: options,resolve: resolve,reject: reject, emitEvent: emitEvent)
    }
  }

  @objc
  public func passwordSignIn(
    _ username: String,
    password: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if (ensurePreviousPromiseSettled(settler: self._apple_id_retriever, reject: reject)) {
      self._apple_id_retriever = AppleIdRetriever(resolve: resolve, reject: reject, emitEvent: self.emitEvent)
    }
  }

  @objc
  public func getPassword(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
      if (ensurePreviousPromiseSettled(settler: self._password_retriever,reject: reject)) {
        self._password_retriever = PasswordRetriever(resolve: resolve,reject: reject, emitEvent: self.emitEvent)
      }
  }

  @objc
  public func hybridSignIn(
    _ clientId: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    if (ensurePreviousPromiseSettled(settler: self._hybrid_retriever,reject: reject)) {
      self._hybrid_retriever = HybridRetriever(clientId: clientId, options: options, resolve: resolve, reject: reject, emitEvent: emitEvent)
    }
  }

  @objc(createPassKey:resolver:rejecter:)
  public func createPassKey(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.0, *) else {
      reject(
        CredentialError.notSupportedError.rawValue,
        "Passkeys require iOS 16.0 or later",
        nil
      )
      return
    }

    if ensurePreviousPromiseSettled(settler: self._passkey_retriever, reject: reject) {
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
        mode: .registration,
        resolve: resolve,
        reject: reject,
        emitEvent: emitEvent
      )
    }
  }

  @objc(getPassKey:resolver:rejecter:)
  public func getPassKey(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.0, *) else {
      reject(
        CredentialError.notSupportedError.rawValue,
        "Passkeys require iOS 16.0 or later",
        nil
      )
      return
    }

    if ensurePreviousPromiseSettled(settler: self._passkey_retriever, reject: reject) {
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
        mode: .assertion,
        resolve: resolve,
        reject: reject,
        emitEvent: emitEvent
      )
    }
  }

  @objc(appleSignIn:resolver:rejecter:)
  public func appleSignIn(
    _ webAndroidUrl: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if (ensurePreviousPromiseSettled(settler: self._apple_id_retriever,reject: reject)) {
      self._apple_id_retriever = AppleIdRetriever(resolve: resolve,reject: reject,  emitEvent: emitEvent)
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
