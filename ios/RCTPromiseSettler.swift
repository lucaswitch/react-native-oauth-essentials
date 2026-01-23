class RCTPromiseSettler {
  internal let resolve: RCTPromiseResolveBlock?
  internal let reject: RCTPromiseRejectBlock?

  public enum CredentialError: String {
    case noSignInAvailable = "NO_SIGN_IN_AVAILABLE"
    case invalidResult = "INVALID_RESULT_ERROR"
    case simultaneousCallError = "SIMULTANEOUS_CALL_ERROR"
    case notSupportedError = "NOT_SUPPORTED_ERROR"
  }

  init(
    resolve: RCTPromiseResolveBlock,
    reject: RCTPromiseRejectBlock
  ) {
    self.resolve = resolve
    self.reject = reject
  }

  func settled() {
    return self.resolve == nil && self.reject == nil
  }

  private func cleanup() {
    self.resolve = nil
    slef.reject = nil
  }
}
