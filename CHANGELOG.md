# Changelog

## [1.1.1](https://github.com/lucaswitch/react-native-oauth-essentials/compare/v1.1.0...v1.1.1) (2026-10-14)

### Documentation

* redesign the README with a quick start, badges and collapsible reference

## [1.1.0](https://github.com/lucaswitch/react-native-oauth-essentials/compare/v1.0.12...v1.1.0) (2026-10-09)

### Features

* **expo:** resolve Google client ids from Firebase files and configure Android ([adcf95d](https://github.com/lucaswitch/react-native-oauth-essentials/commit/adcf95d))
* read Google client ids from the app config and explain missing native module ([d2bee56](https://github.com/lucaswitch/react-native-oauth-essentials/commit/d2bee56))
* add Expo config plugin and Jest mock ([9998d4d](https://github.com/lucaswitch/react-native-oauth-essentials/commit/9998d4d))
* accept { iosClientId, webClientId }, typed errors and dev warnings ([ae967fc](https://github.com/lucaswitch/react-native-oauth-essentials/commit/ae967fc))
* add oauthSignIn, googleSilentSignIn, signOut and Apple ID credential state ([2573b7f](https://github.com/lucaswitch/react-native-oauth-essentials/commit/2573b7f))
* **android:** add google button flow, scopes/offline access, signOut and generic OAuth ([fde8c40](https://github.com/lucaswitch/react-native-oauth-essentials/commit/fde8c40))

### Bug Fixes

* **ios:** pre-check the browser and skip the URL scheme check on silent sign in ([4c4dcc3](https://github.com/lucaswitch/react-native-oauth-essentials/commit/4c4dcc3))
* reserve OAuth params, keep malformed redirect values and relax the Expo iOS check ([7a225a5](https://github.com/lucaswitch/react-native-oauth-essentials/commit/7a225a5))
* **ios:** reject CONFIGURATION_ERROR instead of crashing on missing Google URL scheme ([1e7ec7d](https://github.com/lucaswitch/react-native-oauth-essentials/commit/1e7ec7d))
* **ios:** open Google sign-in from the main thread and report BROWSER_UNAVAILABLE ([2a6bd8d](https://github.com/lucaswitch/react-native-oauth-essentials/commit/2a6bd8d))

## <small>1.0.9 (2026-02-13)</small>

* feat: add better keywords ([8f6063a](https://github.com/lucaswitch/react-native-oauth-essentials/commit/8f6063a))

## <small>1.0.8 (2026-02-12)</small>

* fix: fix ios build error ([8bc151f](https://github.com/lucaswitch/react-native-oauth-essentials/commit/8bc151f))
* fix: fix passkey typo on ios ([abab043](https://github.com/lucaswitch/react-native-oauth-essentials/commit/abab043))
* fix: fix passkey typo on ios ([705e7f5](https://github.com/lucaswitch/react-native-oauth-essentials/commit/705e7f5))

## <small>1.0.7 (2026-02-12)</small>

* fix: fix ios build error ([8bc151f](https://github.com/lucaswitch/react-native-oauth-essentials/commit/8bc151f))
* fix: fix passkey typo on ios ([abab043](https://github.com/lucaswitch/react-native-oauth-essentials/commit/abab043))
* fix: fix passkey typo on ios ([705e7f5](https://github.com/lucaswitch/react-native-oauth-essentials/commit/705e7f5))

## <small>1.0.6 (2026-02-12)</small>

* fix: update correct homepage ([8a2b709](https://github.com/lucaswitch/react-native-oauth-essentials/commit/8a2b709))

## <small>1.0.5 (2026-02-12)</small>

* fix: docs ([492a97a](https://github.com/lucaswitch/react-native-oauth-essentials/commit/492a97a))

## <small>1.0.4 (2026-02-12)</small>

* fix: docs ([78439ac](https://github.com/lucaswitch/react-native-oauth-essentials/commit/78439ac))
* fix: docs ([e13af7a](https://github.com/lucaswitch/react-native-oauth-essentials/commit/e13af7a))
* fix: fix typo ([1d1cd0c](https://github.com/lucaswitch/react-native-oauth-essentials/commit/1d1cd0c))
* fix: remove --immutable flag to allow yarn version differences ([a8b3278](https://github.com/lucaswitch/react-native-oauth-essentials/commit/a8b3278))
* fix: update docs deployment workflow ([710a419](https://github.com/lucaswitch/react-native-oauth-essentials/commit/710a419))
* fix: update docs deployment workflow and add comprehensive documentation ([1a9281d](https://github.com/lucaswitch/react-native-oauth-essentials/commit/1a9281d))

## <small>1.0.3 (2026-02-12)</small>

* fix: docs ([78439ac](https://github.com/lucaswitch/react-native-oauth-essentials/commit/78439ac))
* fix: docs ([e13af7a](https://github.com/lucaswitch/react-native-oauth-essentials/commit/e13af7a))
* fix: fix typo ([1d1cd0c](https://github.com/lucaswitch/react-native-oauth-essentials/commit/1d1cd0c))
* fix: remove --immutable flag to allow yarn version differences ([a8b3278](https://github.com/lucaswitch/react-native-oauth-essentials/commit/a8b3278))
* fix: update docs deployment workflow ([710a419](https://github.com/lucaswitch/react-native-oauth-essentials/commit/710a419))
* fix: update docs deployment workflow and add comprehensive documentation ([1a9281d](https://github.com/lucaswitch/react-native-oauth-essentials/commit/1a9281d))

## <small>1.0.2 (2026-02-12)</small>

* fix: .release-it.json ([85d537a](https://github.com/lucaswitch/react-native-oauth-essentials/commit/85d537a))
* feat: add initial version ([f4e7c4e](https://github.com/lucaswitch/react-native-oauth-essentials/commit/f4e7c4e))

All notable changes to this project will be documented in this file.

The format is based on Conventional Commits.

---

## v1.0.0 - Initial Release

### 🚀 Added
- Initial release of `react-native-oauth-essentials`
- Support to Google Sign in
- Support to Apple Sign in
- Support to Credentials Keychain
- Support to Passkeys/Biometrics(Experimental)
- Added Turbo Module support (Kotlin + Swift)
- TypeScript by default
- Up to date iOS and Android native implementations


### ⚠️ Experimental
Passkeys support are still untested and experimental.

---
