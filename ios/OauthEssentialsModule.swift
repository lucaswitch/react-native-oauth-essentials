import Foundation
import React
import GoogleSignIn
import AuthenticationServices
import Security
import UIKit

@objcMembers public class OauthEssentialsModule: NSObject,
ASAuthorizationControllerDelegate,
ASAuthorizationControllerPresentationContextProviding {

  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?

  enum CredentialsType: String {
    case googleId = "GOOGLE_ID"
    case password = "PASSWORD"
    case appleId = "APPLE_ID"
  }

  enum CredentialError: String {
    case noSignInAvailable = "NO_SIGN_IN_AVAILABLE"
    case invalidResult = "INVALID_RESULT_ERROR"
    case simultaneousCallError = "SIMULTANEOUS_CALL_ERROR"
    case notSupportedError = "NOT_SUPPORTED_ERROR"
  }

  @objc(requiresMainQueueSetup) static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc public func getConstants() -> [String: Any] {
    var googleIdSupported: Bool = false
    var appleIdSupported: Bool = false
    var passwordSupported: Bool = false
    if #available (iOS 13.0, *) {
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

  private func isGoogleSignInSchemeMissing(clientId: String) -> Bool {
    let clientIdPrefix = clientId.replacingOccurrences(of: ".apps.googleusercontent.com", with: "")
    let reversedClientId = "com.googleusercontent.apps.\(clientIdPrefix)"
    print("Reversed client ID: \(reversedClientId)")
    guard let urlTypes = Bundle.main.infoDictionary ?["CFBundleURLTypes"] as ? [[String: Any]] else {
      return true
    }
    for urlType in urlTypes {
      if let schemes = urlType["CFBundleURLSchemes"] as ? [String],
      schemes.contains(reversedClientId) {
        return false
      }
    }
    return true
  }


  @objc public func googleSignIn(_ clientId: String,
  options: NSDictionary,
  resolver resolve: @escaping RCTPromiseResolveBlock,
  rejecter reject: @escaping RCTPromiseRejectBlock) {

    if isGoogleSignInSchemeMissing(clientId: clientId) {
      reject(
        CredentialError.noSignInAvailable.rawValue,
        "No URL types found in Info.plist",
        nil
      )
      return
    }

    let rootVC: UIViewController?
    if #available (iOS 13.0, *) {
      rootVC = UIApplication.shared.connectedScenes.compactMap {
        $0 as ?UIWindowScene
      }.flatMap {
        $0.windows
      }.first {
        $0.isKeyWindow
      } ?.rootViewController
    } else {
      rootVC = UIApplication.shared.keyWindow ?.rootViewController
    }

    guard let rootVC = rootVC else {
      reject(
        CredentialError.noSignInAvailable.rawValue,
        "No root view controller available",
        nil
      )
      return
    }

    GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
    GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) {
      result, error in
      if let error = error {
        reject(CredentialError.invalidResult.rawValue, error.localizedDescription, error)
        self.resolve = nil
        self.reject = nil
        return
      }

      guard let user = result ?.user else {
        reject(CredentialError.invalidResult.rawValue, "No user returned", nil)
        self.resolve = nil
        self.reject = nil
        return
      }

      let profile = user.profile
      let data: [String: Any] = [
        "idToken": user.idToken ?.tokenString ?? "",
        "id": user.userID ?? "",
        "displayName": profile ?.name ?? "",
        "givenName": profile ?.givenName ?? "",
        "familyName": profile ?.familyName ?? "",
        "profilePictureUri": profile ?.imageURL(withDimension: 200) ?.absoluteString ?? "",
        "email": profile ?.email ?? ""
      ]

      resolve([
        "type": CredentialsType.googleId.rawValue,
        "data": data
      ])
    }
  }

  @objc(appleSignIn:rejecter:) public func appleSignIn(resolve: @escaping RCTPromiseResolveBlock,
  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard self.reject == nil else {
      reject(
        CredentialError.simultaneousCallError.rawValue,
        "Another sign-in operation is in progress",
        nil
      )
      return
    }

    self.resolve = resolve
    self.reject = reject

    let controller = ASAuthorizationController(authorizationRequests: [
      ASAuthorizationAppleIDProvider().createRequest(),
    ])

    controller.delegate = self
    controller.presentationContextProvider = self

    if #available (iOS 16.0, *) {
      controller.performRequests(options: .preferImmediatelyAvailableCredentials)
    } else {
      controller.performRequests()
    }
  }

  @objc public func passwordSignIn(_ username: String, password: String,
  resolver resolve: @escaping RCTPromiseResolveBlock,
  rejecter reject: @escaping RCTPromiseRejectBlock) {
    let passwordCredential = ASPasswordCredential(user: username, password: password)
    ASCredentialIdentityStore.shared.saveCredential(passwordCredential) {
      success, error in
      if success {
        resolve(true)
      } else {
        reject(
          CredentialError.invalidResult.rawValue, error.localizedDescription, error
        )
      }
    }
  }

  @objc public func getPassword(resolver resolve: @escaping RCTPromiseResolveBlock,
  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard self.reject == nil else {
      reject(
        CredentialError.simultaneousCallError.rawValue,
        "Another sign-in operation is in progress",
        nil
      )
      return
    }
    self.resolve = resolve
    self.reject = reject

    let controller = ASAuthorizationController(authorizationRequests: [
      ASAuthorizationPasswordProvider().createRequest()
    ])

    controller.delegate = self
    controller.presentationContextProvider = self

    if #available (iOS 16.0, *) {
      controller.performRequests(options: .preferImmediatelyAvailableCredentials)
    } else {
      controller.performRequests()
    }
  }

  public func authorizationController(controller: ASAuthorizationController,
  didCompleteWithAuthorization authorization: ASAuthorization) {
    switch authorization.credential {
    case let appleIDCredential as ASAuthorizationAppleIDCredential:
      let idToken: Any = appleIDCredential.identityToken.flatMap {
        String(data: $0, encoding: .utf8)
      } ?? NSNull()

      let authorizationCode: Any = appleIDCredential.authorizationCode.flatMap {
        String(data: $0, encoding: .utf8)
      } ?? NSNull()

      let fullName = appleIDCredential.fullName.flatMap {
        PersonNameComponentsFormatter().string(from: $0)
      } ?? ""

      let data: [String: Any] = [
        "idToken": idToken,
        "authorizationCode": authorizationCode,
        "user": appleIDCredential.user,
        "email": appleIDCredential.email ?? "",
        "fullName": fullName,
        "likelyReal": appleIDCredential.realUserStatus == .likelyReal
      ]

      let result: [String: Any] = [
        "type": CredentialsType.appleId.rawValue,
        "data": data
      ]

      resolve ?(result)

    case let passwordCredential as ASPasswordCredential:
      self.resolve ?([
        "type": CredentialsType.password.rawValue,
        "data": [
          "username": passwordCredential.user,
          "password": passwordCredential.password
        ]
      ])

    default:
      reject ?(
        CredentialError.invalidResult.rawValue,
        "Unsupported authorization credential type",
        nil
      )
    }
    self.resolve = nil
    self.reject = nil
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    self.reject ?(
      CredentialError.invalidResult.rawValue,
      error.localizedDescription,
      error
    )
  }

  public func presentationAnchor(forcontroller: ASAuthorizationController) -> ASPresentationAnchor {
    guard let scene = UIApplication.shared.connectedScenes.first(where: {
      $0.activationState == .foregroundActive
    }) as ?UIWindowScene,
    let window = scene.windows.first(where: {
      $0.isKeyWindow
    }) else {
      return UIWindow()
    }

    return window
  }
}
