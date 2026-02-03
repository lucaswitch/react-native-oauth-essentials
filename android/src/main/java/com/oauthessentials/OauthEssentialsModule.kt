package com.oauthessentials

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.credentials.CreatePasswordRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.GetPasswordOption
import androidx.credentials.PasswordCredential
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.security.SecureRandom
import java.util.Base64
import java.util.UUID

class OauthEssentialsModule(reactContext: ReactApplicationContext) :
  NativeOauthEssentialsSpec(reactContext) {

  private val onCredentialReceived = "onCredentialReceived"

  enum class CredentialsType(val code: String) {
    GOOGLE_ID("GOOGLE_ID"),
    PASSWORD("PASSWORD"),
  }

  enum class CredentialError(val code: String) {
    NO_ACTIVITY_ERROR("NO_ACTIVITY_ERROR"),
    INVALID_RESULT_ERROR("INVALID_RESULT_ERROR"),
    NOT_SUPPORTED_ERROR("NOT_SUPPORTED")
  }

  @SuppressLint("ObsoleteSdkInt")
  override fun getTypedExportedConstants(): MutableMap<String, Boolean> {
    val hasGoogleServices = hasGooglePlayServices()
    val constants: MutableMap<String, Boolean> = mutableMapOf(
      "GOOGLE_PLAY_SERVICES_SUPPORTED" to hasGoogleServices,
      "PASSWORD_SUPPORTED" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M),
      "GOOGLE_ID_SUPPORTED" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && hasGoogleServices),
      "APPLE_ID_SUPPORTED" to true
    )
    return constants
  }

  @RequiresApi(Build.VERSION_CODES.O)
  override fun hybridSignIn(clientId: String, options: ReadableMap, promise: Promise) {
    if (!hasGooglePlayServices()) {
      promise.reject(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not have GooglePlay Services"
      )
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available")
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val manager = CredentialManager.create(activity)
        val randomBytes = ByteArray(32)
        SecureRandom.getInstanceStrong().nextBytes(randomBytes)
        val randomNonce = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes)

        val googleIdOption: GetGoogleIdOption = GetGoogleIdOption.Builder()
          .setNonce(randomNonce)
          .setServerClientId(clientId)
          .setFilterByAuthorizedAccounts(options.getBoolean("authorizedAccounts"))
          .setAutoSelectEnabled(options.getBoolean("autoSelectEnabled"))
          .build()

        val request: GetCredentialRequest = GetCredentialRequest.Builder()
          .addCredentialOption(googleIdOption)
          .addCredentialOption(GetPasswordOption())
          .build()

        val result = getCredentialResultToWritableMap(
          manager.getCredential(
            request = request,
            context = activity
          )
        )
        promise.resolve(result)
        raiseJsEvent(onCredentialReceived, result)
      } catch (e: Throwable) {
        Log.e(LOG_TAG, e.toString())
        promise.reject(CredentialError.INVALID_RESULT_ERROR.code, e)
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.O)
  override fun appleSignIn(appleIdentifier: String?, redirectUrl: String?, promise: Promise) {
    if (appleIdentifier !is String || appleIdentifier.isEmpty()) {
      promise.reject(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Android apps need the apple identifier to enable apple sign-in."
      )
      return
    }
    if (redirectUrl !is String || redirectUrl.isEmpty()) {
      promise.reject(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Android apps need the redirectUrl to enable apple sign-in."
      )
      return
    }

    this.reactApplicationContext.packageName
    val activity = reactApplicationContext.currentActivity
    try {
      if (activity is Activity) {
        val state = UUID.randomUUID().toString()
        val nonce = UUID.randomUUID().toString()

        var intent = Intent(activity, AppleOAuthActivity::class.java)
          .apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("redirectUrl", redirectUrl)
            putExtra("clientId", appleIdentifier)
            putExtra("state", state)
            putExtra("nonce", nonce)
          }

        activity.runOnUiThread {
          activity.startActivity(intent)
        }
      } else {
        throw Error("No browser found into the device.")
      }
    } catch (e: Throwable) {
      promise.reject(CredentialError.INVALID_RESULT_ERROR.code, e)
    }
  }

  /**
   * Performs the google sign in.
   */
  @RequiresApi(Build.VERSION_CODES.O)
  override fun googleSignIn(clientId: String, options: ReadableMap, promise: Promise) {
    if (!hasGooglePlayServices()) {
      promise.reject(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not have GooglePlay Services"
      )
      return
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available")
      return
    }

    CoroutineScope(Dispatchers.Main).launch {
      try {
        val manager = CredentialManager.create(activity)
        val randomBytes = ByteArray(32)
        SecureRandom.getInstanceStrong().nextBytes(randomBytes)
        val randomNonce = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes)

        val googleIdOption: GetGoogleIdOption = GetGoogleIdOption.Builder()
          .setNonce(randomNonce)
          .setServerClientId(clientId)
          .setFilterByAuthorizedAccounts(options.getBoolean("authorizedAccounts"))
          .setAutoSelectEnabled(options.getBoolean("autoSelectEnabled"))
          .build()

        val request: GetCredentialRequest = GetCredentialRequest.Builder()
          .addCredentialOption(googleIdOption)
          .build()


        val result = getCredentialResultToWritableMap(
          manager.getCredential(activity, request)
        )
        promise.resolve(result)
        raiseJsEvent(onCredentialReceived, result)
      } catch (e: Throwable) {
        promise.reject(CredentialError.INVALID_RESULT_ERROR.code, e.toString())
      }
    }
  }

  /**
   * Gets the user current credentials.
   */
  override fun getPassword(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available")
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val manager = CredentialManager.create(activity)
        val request = GetCredentialRequest(
          listOf(GetPasswordOption())
        )

        val result = getCredentialResultToWritableMap(
          manager.getCredential(
            request = request,
            context = activity
          )
        )
        promise.resolve(result)
        raiseJsEvent(onCredentialReceived, result)
      } catch (e: Throwable) {
        Log.e(LOG_TAG, e.toString())
        promise.resolve(false)
      }
    }
  }

  /**
   * Stores a brand new username and password into the OS.
   */
  override fun passwordSignIn(username: String, password: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available")
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val manager = CredentialManager.create(activity)
        val request = CreatePasswordRequest(
          id = username,
          password = password
        )

        manager.createCredential(
          request = request,
          context = activity
        )
        promise.resolve(true)
      } catch (e: Throwable) {
        Log.e(LOG_TAG, e.toString())
        promise.resolve(false)
      }
    }
  }

  /**
   * Gets the result formated as a writableMap.
   */
  private fun getCredentialResultToWritableMap(result: GetCredentialResponse): WritableMap {
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

  /**
   * Gets if has google play services.
   */
  private fun hasGooglePlayServices(): Boolean {
    val result = GoogleApiAvailability.getInstance()
      .isGooglePlayServicesAvailable(reactApplicationContext)
    return result == ConnectionResult.SUCCESS
  }

  /**
   * Raises the js event.
   */
  private fun raiseJsEvent(eventName: String, data: WritableMap?) {
    this.reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, data)
  }

  companion object {
    const val NAME = NativeOauthEssentialsSpec.NAME
    const val LOG_TAG = "NativeOauthEssentials"
  }
}
