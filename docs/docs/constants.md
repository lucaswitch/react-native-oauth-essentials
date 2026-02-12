---
sidebar_position: 4
---

# Constants

This module exposes **constants** that indicate which authentication methods are available on the current platform.

### Usage

```ts
// TypeScript / ES Module
import {
  GOOGLE_PLAY_SERVICES_SUPPORTED,
  PASSWORD_SUPPORTED,
  GOOGLE_ID_SUPPORTED,
  APPLE_ID_SUPPORTED
} from 'react-native-oauth-essentials';
```

### Definition

| Constant                         | Type      | Supported    | Description                                             |
|----------------------------------|-----------|--------------|---------------------------------------------------------|
| `GOOGLE_PLAY_SERVICES_SUPPORTED` | `boolean` | true / false | Indicates if Google Play Services sign-in is available. |
| `PASSWORD_SUPPORTED`             | `boolean` | true / false | Indicates if username/password sign-in is available.    |
| `GOOGLE_ID_SUPPORTED`            | `boolean` | true / false | Indicates if Google ID sign-in is available.            |
| `APPLE_ID_SUPPORTED`             | `boolean` | true / false | Indicates if Apple ID sign-in is available.             |

> Note: The `true` or `false` values are determined at runtime by the module.

