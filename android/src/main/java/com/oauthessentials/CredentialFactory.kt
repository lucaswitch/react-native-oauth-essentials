package com.oauthessentials

import android.net.Uri
import androidx.credentials.CreateCredentialResponse
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialResponse
import androidx.credentials.PasswordCredential
import androidx.credentials.PublicKeyCredential
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

object CredentialFactory {

  enum class CredentialsType(val code: String) {
    GOOGLE_ID("GOOGLE_ID"),
    PASSWORD("PASSWORD"),
    APPLE_ID("APPLE_ID"),
    WEB_APPLE_ID("WEB_APPLE_ID"),
    CANCELLED("CANCELLED"),
    PASSKEY("PASSKEY")
  }


  /**
   * Creates from an uri.
   */
  fun fromUri(uri: Uri): WritableMap {
    if (uri.query.isNullOrEmpty()) {
      throw IllegalStateException("Cannot handle empty deep link query.")
    }

    val data = Arguments.createMap()
    val queryParams = uri.queryParameterNames
    for (key in queryParams) {
      uri.getQueryParameter(key)?.let { value ->
        data.putString(key, value)
      }
    }

    val event = Arguments.createMap()
    event.putString("type", CredentialsType.WEB_APPLE_ID.code)
    event.putMap("data", data)
    return event
  }

  /**
   * Creates from a response.
   */
  fun fromCredentialResponse(result: GetCredentialResponse): WritableMap {
    return Arguments.createMap().apply {
      val data = Arguments.createMap()
      when (val credential = result.credential) {
        is PasswordCredential -> {
          val username = credential.id
          val password = credential.password

          putString("type", CredentialsType.PASSWORD.code)
          data.putString("username", username)
          data.putString("password", password)
        }

        is CustomCredential -> when (credential.type) {
          GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL -> {
            val googleCred = GoogleIdTokenCredential.createFrom(credential.data)

            putString("type", CredentialsType.GOOGLE_ID.code)
            data.putString("idToken", googleCred.idToken)
            data.putString("id", googleCred.id)
            data.putString("displayName", googleCred.displayName)
            data.putString("givenName", googleCred.givenName)
            data.putString("familyName", googleCred.familyName)
            data.putString("profilePictureUri", googleCred.profilePictureUri?.toString())
            data.putString("phoneNumber", googleCred.phoneNumber)
            data.putBoolean("legacy", false)
          }

          else -> {
            throw IllegalStateException("Invalid auth type.")
          }
        }

        else -> {
          throw IllegalStateException("Invalid auth type.")
        }
      }
      putMap("data", data)
    }
  }

  fun fromCancelled(): WritableMap {
    return Arguments.createMap().apply {
      putString("type", CredentialsType.CANCELLED.code)
      putNull("data")
    }
  }

  fun fromPublicKeyCredential(result: CreateCredentialResponse): WritableMap {
    val response = result as CreatePublicKeyCredentialResponse
    return Arguments.createMap().apply {
      putString("type", CredentialsType.PASSKEY.code)
      putString("data", response.registrationResponseJson)
    }
  }

  fun fromPublicKeyCredential(result: GetCredentialResponse): WritableMap {
    val credential = result.credential as PublicKeyCredential
    return Arguments.createMap().apply {
      putString("type", CredentialsType.PASSKEY.code)
      putString("data", credential.authenticationResponseJson)
    }
  }
}
