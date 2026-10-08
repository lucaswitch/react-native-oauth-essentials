//
//  PasskeyRetriever.swift
//  Pods
//
//  Created by Lucas on 12/02/26.
//


import AuthenticationServices
import React

@available(iOS 16.0, *)
public class PasskeyRetriever: RCTPromiseSettler,
  ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding {

  enum Mode {
    case registration
    case assertion
  }

  private let mode: Mode
  /// AutoFill requests wait for the user to pick a passkey in the QuickType bar.
  let autoFill: Bool
  private var controller: ASAuthorizationController?

  init(
    requestJson: String,
    mode: Mode,
    autoFill: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    self.mode = mode
    self.autoFill = autoFill && mode == .assertion
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)

    do {
      let request = try buildRequest(requestJson: requestJson, mode: mode)
      let controller = ASAuthorizationController(authorizationRequests: [request])
      controller.delegate = self
      controller.presentationContextProvider = self
      self.controller = controller
      if self.autoFill {
        controller.performAutoFillAssistedRequests()
      } else {
        controller.performRequests(options: .preferImmediatelyAvailableCredentials)
      }
    } catch {
      fail(.invalidResult, "Failed to parse requestJson: \(error.localizedDescription)", error)
    }
  }

  /// Cancels the pending request, which resolves it as cancelled.
  func cancel() {
    controller?.cancel()
  }

  private func buildRequest(requestJson: String, mode: Mode) throws -> ASAuthorizationRequest {
    guard let data = requestJson.data(using: .utf8),
          let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw NSError(domain: "PasskeyRetriever", code: -1, userInfo: [
        NSLocalizedDescriptionKey: "Invalid requestJson"
      ])
    }

    switch mode {
    case .registration:
      return try buildRegistrationRequest(json: json)
    case .assertion:
      return try buildAssertionRequest(json: json)
    }
  }

  private func buildRegistrationRequest(json: [String: Any]) throws -> ASAuthorizationRequest {
    guard let challengeStr = json["challenge"] as? String,
          let challenge = base64URLDecode(challengeStr) else {
      throw NSError(domain: "PasskeyRetriever", code: -1, userInfo: [
        NSLocalizedDescriptionKey: "Missing or invalid challenge"
      ])
    }

    guard let rp = json["rp"] as? [String: Any],
          let rpId = rp["id"] as? String else {
      throw NSError(domain: "PasskeyRetriever", code: -1, userInfo: [
        NSLocalizedDescriptionKey: "Missing or invalid rp.id"
      ])
    }

    guard let user = json["user"] as? [String: Any],
          let userIdStr = user["id"] as? String,
          let userId = base64URLDecode(userIdStr),
          let userName = user["name"] as? String else {
      throw NSError(domain: "PasskeyRetriever", code: -1, userInfo: [
        NSLocalizedDescriptionKey: "Missing or invalid user fields"
      ])
    }

    let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
    let request = provider.createCredentialRegistrationRequest(
      challenge: challenge,
      name: userName,
      userID: userId
    )

    if let userVerification = json["authenticatorSelection"] as? [String: Any],
       let uv = userVerification["userVerification"] as? String {
      request.userVerificationPreference = mapUserVerification(uv)
    }

    if let attestation = json["attestation"] as? String {
      request.attestationPreference = mapAttestation(attestation)
    }

    if let excludeCredentials = json["excludeCredentials"] as? [[String: Any]] {
        if #available(iOS 17.4, *) {
            request.excludedCredentials = excludeCredentials.compactMap { cred in
                guard let idStr = cred["id"] as? String,
                      let idData = base64URLDecode(idStr) else { return nil }
                return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: idData)
            }
        } else {
            // Fallback on earlier versions
        }
    }

    return request
  }

  private func buildAssertionRequest(json: [String: Any]) throws -> ASAuthorizationRequest {
    guard let challengeStr = json["challenge"] as? String,
          let challenge = base64URLDecode(challengeStr) else {
      throw NSError(domain: "PasskeyRetriever", code: -1, userInfo: [
        NSLocalizedDescriptionKey: "Missing or invalid challenge"
      ])
    }

    let rpId = json["rpId"] as? String ?? ""

    let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
    let request = provider.createCredentialAssertionRequest(challenge: challenge)

    if let allowCredentials = json["allowCredentials"] as? [[String: Any]] {
      request.allowedCredentials = allowCredentials.compactMap { cred in
        guard let idStr = cred["id"] as? String,
              let idData = base64URLDecode(idStr) else { return nil }
        return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: idData)
      }
    }

    if let uv = json["userVerification"] as? String {
      request.userVerificationPreference = mapUserVerification(uv)
    }

    return request
  }

  // MARK: - ASAuthorizationControllerDelegate

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    self.controller = nil
    switch mode {
    case .registration:
      if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
        succeed(CredentialFactory.fromPasskeyRegistration(credential: credential))
        return
      }
    case .assertion:
      if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
        succeed(CredentialFactory.fromPasskeyAssertion(credential: credential))
        return
      }
    }
    fail(.invalidResult, "Unexpected credential type")
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    self.controller = nil
    let nsError = error as NSError
    if nsError.domain == ASAuthorizationError.errorDomain,
       nsError.code == ASAuthorizationError.canceled.rawValue {
      succeed(CredentialFactory.fromCancelled())
    } else {
      fail(.invalidResult, error.localizedDescription, error)
    }
  }

  // MARK: - ASAuthorizationControllerPresentationContextProviding

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return PresentationContext.anchor()
  }

  // MARK: - Helpers

  private func base64URLDecode(_ string: String) -> Data? {
    var base64 = string
      .replacingOccurrences(of: "-", with: "+")
      .replacingOccurrences(of: "_", with: "/")
    let remainder = base64.count % 4
    if remainder > 0 {
      base64.append(String(repeating: "=", count: 4 - remainder))
    }
    return Data(base64Encoded: base64)
  }

  private func mapUserVerification(_ value: String) -> ASAuthorizationPublicKeyCredentialUserVerificationPreference {
    switch value {
    case "required":
      return .required
    case "discouraged":
      return .discouraged
    default:
      return .preferred
    }
  }

  private func mapAttestation(_ value: String) -> ASAuthorizationPublicKeyCredentialAttestationKind {
    switch value {
    case "direct":
      return .direct
    case "indirect":
      return .indirect
    case "enterprise":
      return .enterprise
    default:
      return .none
    }
  }
}
