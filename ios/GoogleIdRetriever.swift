import GoogleSignIn
import React

public class GoogleIdRetriever: RCTPromiseSettler {

  init(
    clientId: String,
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    super.init(resolve: resolve, reject: reject)
    performGoogleSignIn(clientId:clientId, options: options)
  }

  private func isGoogleSignInSchemeMissing(clientId: String) -> Bool {
  let clientIdPrefix = clientId.replacingOccurrences(of: ".apps.googleusercontent.com", with: "")
  let reversedClientId = "com.googleusercontent.apps.\(clientIdPrefix)"
  print("Reversed client ID: \(reversedClientId)")
  guard let urlTypes = Bundle.main.infoDictionary?["CFBundleURLTypes"] as? [[String: Any]] else {
    return true
  }
  for urlType in urlTypes {
    if let schemes = urlType["CFBundleURLSchemes"] as? [String],
    schemes.contains(reversedClientId) {
      return false
    }
  }
  return true
}

  private func performGoogleSignIn(clientId: String, options: NSDictionary) {
  let rootVC: UIViewController?
  if #available(iOS 13.0, *) {
    rootVC = UIApplication.shared.connectedScenes
    .compactMap { $0 as? UIWindowScene }
    .flatMap { $0.windows }
    .first { $0.isKeyWindow }?
    .rootViewController
  } else {
    rootVC = UIApplication.shared.keyWindow?.rootViewController
  }

  guard let rootVC = rootVC else {
    self.reject?(
      CredentialError.noSignInAvailable.rawValue,
      "No root view controller available",
      nil
    )
    self.cleanup()
    return
  }

  GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
  GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) { result, error in
    if let error = error {
      self.reject?(CredentialError.invalidResult.rawValue, error.localizedDescription, error)
      self.cleanup()
      return
    }

    guard let user = result?.user else {
      self.reject?(CredentialError.invalidResult.rawValue, "No user returned", nil)
      self.cleanup()
      return
    }

    let profile = user.profile
    let data: [String: Any] = [
      "idToken": user.idToken?.tokenString ?? "",
      "id": user.userID ?? "",
      "displayName": profile?.name ?? "",
      "givenName": profile?.givenName ?? "",
      "familyName": profile?.familyName ?? "",
      "profilePictureUri": profile?.imageURL(withDimension: 200)?.absoluteString ?? "",
      "email": profile?.email ?? ""
    ]

    self.resolve?([
      "type": CredentialsType.googleId.rawValue,
      "data": data
    ])
    self.cleanup()
  }
}
}
