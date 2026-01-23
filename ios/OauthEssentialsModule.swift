import Foundation
import React
import GoogleSignIn
import AuthenticationServices
import Security
import UIKit

public class OauthEssentialsModule: NSObject {

  private var _password_retriever: PasswordRetriever? = nil
  private var _google_id_retriever: GoogleIdRetriever? = nil
  private var _apple_id_retriever: AppleIdRetriever? = nil
  private var _hybrid_retriever: HybridRetriever? = nil

  private func ensurePreviousPromiseSettled(settler: RCTPromiseSettler?, reject: RCTPromiseRejectBlock) -> Bool {
    if settler == nil || (settler != nil && ((settler?.settled()) != nil)) {
      return true
    }

    reject(
      RCTPromiseSettler.CredentialError.simultaneousCallError.rawValue,
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
    if #available(iOS 13.0, *) {
      // Modern GoogleSignIn works on iOS 13+
      googleIdSupported = true
      appleIdSupported = true
      passwordSupported = true
    }

    return [
      "GOOGLE_ID_SUPPORTED": googleIdSupported,
      "PASSWORD_SUPPORTED": passwordSupported,
      "GOOGLE_PLAY_SERVICES_SUPPORTED": false, // Not applicable on iOS, it does not have Google Play Services
      "APPLE_ID_SUPPORTED": appleIdSupported
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
      self._google_id_retriever = GoogleIdRetriever(clientId: clientId, options: options,resolve: resolve,reject: reject)
    }
  }

  @objc
  public func appleSignIn(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    if (ensurePreviousPromiseSettled(settler: self._apple_id_retriever,reject: reject)) {
      self._apple_id_retriever = AppleIdRetriever(resolve: resolve,reject: reject)
    }
  }

  @objc
  public func passwordSignIn(
    _ username: String, password: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    reject(
      RCTPromiseSettler.CredentialError.invalidResult.rawValue,
      "passwordSignIn is not available on iOS. Instead, ensure your username and password fields are properly marked in your UI so that iOS can save them as credentials. These saved credentials can then be retrieved later using the getCredentials method.",
      nil
    )
  }

  @objc
  public func getPassword(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
      if (ensurePreviousPromiseSettled(settler: self._password_retriever,reject: reject)) {
        self._password_retriever = PasswordRetriever(resolve: resolve,reject: reject)
      }
  }

  @objc
  public func hybridSignIn(
    _ clientId: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    if (ensurePreviousPromiseSettled(settler: self._hybrid_retriever,reject: reject)) {
      self._hybrid_retriever = HybridRetriever(clientId: clientId, options: options, resolve: resolve, reject: reject)
    }
  }
}
