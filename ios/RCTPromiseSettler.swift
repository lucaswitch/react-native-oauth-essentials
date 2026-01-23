import React

public class RCTPromiseSettler: NSObject {
  internal var resolve: RCTPromiseResolveBlock?
  internal var reject: RCTPromiseRejectBlock?

  public enum CredentialError: String {
    case noSignInAvailable = "NO_SIGN_IN_AVAILABLE"
    case invalidResult = "INVALID_RESULT_ERROR"
    case simultaneousCallError = "SIMULTANEOUS_CALL_ERROR"
    case notSupportedError = "NOT_SUPPORTED_ERROR"
  }

  init(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    self.resolve = resolve
    self.reject = reject
  }

  public func settled() -> Bool {
    return self.resolve == nil && self.reject == nil
  }

  internal func cleanup() -> Void {
    self.resolve = nil
    self.reject = nil
  }
}
