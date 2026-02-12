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

  init(
    requestJson: String,
    mode: Mode,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    self.mode = mode
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)

    do {
      let request = try buildRequest(requestJson: requestJson, mode: mode)
      let controller = ASAuthorizationController(authorizationRequests: [request])
      controller.delegate = self
      controller.presentationContextProvider = self
      controller.performRequests(options: .preferImmediatelyAvailableCredentials)
    } catch {
      reject(
        CredentialError.invalidResult.rawValue,
        "Failed to parse requestJson: \(error.localizedDescription)",
        error
      )
      cleanup()
    }
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
      request.excludedCredentials = excludeCredentials.compactMap { cred in
        guard let idStr = cred["id"] as? String,
              let idData = base64URLDecode(idStr) else { return nil }
        return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: idData)
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
    switch mode {
    case .registration:
      if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
        let result = CredentialFactory.fromPasskeyRegistration(credential: credential)
        self.resolve?(result)
        self.emitEvent?("onCredentialSuccess", result as NSDictionary)
      }
    case .assertion:
      if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
        let result = CredentialFactory.fromPasskeyAssertion(credential: credential)
        self.resolve?(result)
        self.emitEvent?("onCredentialSuccess", result as NSDictionary)
      }
    }
    cleanup()
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    let nsError = error as NSError
    if nsError.domain == ASAuthorizationError.errorDomain,
       nsError.code == ASAuthorizationError.canceled.rawValue {
      let result = CredentialFactory.fromCancelled()
      self.resolve?(result)
      self.emitEvent?("onCredentialSuccess", result as NSDictionary)
    } else {
      self.reject?(
        CredentialError.invalidResult.rawValue,
        error.localizedDescription,
        error
      )
      self.emitEvent?("onCredentialFailure", [
        "code": CredentialError.invalidResult.rawValue,
        "message": error.localizedDescription
      ])
    }
    cleanup()
  }

  // MARK: - ASAuthorizationControllerPresentationContextProviding

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return UIWindow()
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