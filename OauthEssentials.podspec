require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "OauthEssentials"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  # iOS 16 is the minimum (passkeys; GoogleSignIn 10 itself needs 15).
  s.platforms    = { :ios => [Gem::Version.new(min_ios_version_supported), Gem::Version.new("16.0")].max.to_s }
  s.source       = { :git => "https://github.com/lucaswitch/react-native-oauth-essentials.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"

  s.dependency "GoogleSignIn", "~> 10.1"

  # AppCheckCore (a GoogleSignIn dependency) is Swift: as static libraries, CocoaPods only integrates it if
  # these pods define modules. Enable it here so apps do not have to edit their Podfile.
  begin
    # The ivar: `podfile` would parse the Podfile again while it is still being evaluated.
    podfile = Pod::Config.instance.instance_variable_get(:@podfile)
    (podfile ? podfile.target_definition_list : []).each do |target|
      %w[GoogleUtilities RecaptchaInterop].each do |name|
        target.set_use_modular_headers_for_pod(name, true)
      end
    end
  rescue StandardError, NoMethodError
    # Internal CocoaPods API: if it changes, apps fall back to declaring the pods in their Podfile.
  end

  install_modules_dependencies(s)
end
