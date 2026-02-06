package com.oauthessentials

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.util.Log
import android.util.Patterns
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.credentials.CreatePasswordRequest
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPasswordOption
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.security.SecureRandom
import java.util.Base64

class OauthEssentialsModule(reactContext: ReactApplicationContext) :
  NativeOauthEssentialsSpec(reactContext) {

  private val appleDeepLinkReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      intent?.getStringExtra("url")?.let { url ->
        Log.d(LOG_TAG, "Handling deep link url: ${url}")
        val uri = url.toUri()
        if (!uri.query.isNullOrEmpty()) {
          emitOnWebAppleCredentialSuccess(CredentialFactory.fromUri(uri))
        } else {
          Log.d(LOG_TAG, "Could not handle ${url}, deep link query string is empty")
        }
      }
    }
  }

  enum class CredentialError(val code: String) {
    NO_ACTIVITY_ERROR("NO_ACTIVITY_ERROR"),
    INVALID_RESULT_ERROR("INVALID_RESULT_ERROR"),
    NOT_SUPPORTED_ERROR("NOT_SUPPORTED")
  }

  @SuppressLint("ObsoleteSdkInt")
  override fun getTypedExportedConstants(): MutableMap<String, Boolean> {
    hasGooglePlayServices()
    val hasCredentialManager = getCredentialManagerSupported()
    val constants: MutableMap<String, Boolean> = mutableMapOf(
      "GOOGLE_PLAY_SERVICES_SUPPORTED" to hasGooglePlayServices(),
      "PASSWORD_SUPPORTED" to hasCredentialManager,
      "GOOGLE_ID_SUPPORTED" to googleIdSupported(),
      "APPLE_ID_SUPPORTED" to getAppleIdSupported(),
      "HYBRID_SUPPORTED" to hasCredentialManager
    )
    return constants
  }

  private fun googleIdSupported(): Boolean = hasGooglePlayServices()

  private fun getAppleIdSupported(): Boolean = true

  private fun getCredentialManagerSupported(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

  @RequiresApi(Build.VERSION_CODES.O)
  override fun hybridSignIn(clientId: String, options: ReadableMap, promise: Promise) {
    if (!hasGooglePlayServices()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not have GooglePlay Services",
        promise
      )
      return
    }
    if (!getCredentialManagerSupported()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not support Credential Manager, only android >=12 allowed.",
        promise
      )
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndEmitEvent(
        CredentialError.NO_ACTIVITY_ERROR.code,
        "Activity not available",
        promise
      )
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

        resolveAndEmit(
          CredentialFactory.fromCredentialResponse(
            manager.getCredential(
              request = request,
              context = activity
            )
          ), promise
        )
      } catch (e: GetCredentialCancellationException) {
        Log.d(LOG_TAG, e.toString())
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: Throwable) {
        Log.d(LOG_TAG, e.toString())
        rejectAndEmitEvent(
          CredentialError.INVALID_RESULT_ERROR.code,
          e,
          promise
        )
      }
    }
  }

  /**
   * Performs the apple sign in.
   * The signing in is redirecting to the device default browser to handle it.
   */
  @RequiresApi(Build.VERSION_CODES.O)
  override fun appleSignIn(androidWebUrl: String?, promise: Promise) {
    val activity = this.reactApplicationContext.currentActivity
    if (activity === null) {
      rejectAndEmitEvent(
        CredentialError.NO_ACTIVITY_ERROR.code,
        "Could not find app activity.",
        promise
      )
      return
    }

    var uri: Uri
    try {
      uri = parseWebUrl(androidWebUrl)
    } catch (e: Throwable) {
      rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      return
    }

    activity.runOnUiThread {
      val intent = Intent(Intent.ACTION_VIEW).apply {
        data = uri
      }
      activity.startActivity(intent)
    }
    promise.resolve(true)
  }

  /**
   * Performs the google sign in.
   */
  @Suppress("DEPRECATION")
  @RequiresApi(Build.VERSION_CODES.O)
  override fun googleSignIn(clientId: String, options: ReadableMap, promise: Promise) {
    if (!googleIdSupported()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not support googleSignIn method.",
        promise
      )
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndEmitEvent(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available", promise)
      return
    }

    if (getCredentialManagerSupported()) {
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
            .build()


          resolveAndEmit(
            CredentialFactory.fromCredentialResponse(
              manager.getCredential(activity, request)
            ), promise
          )
        } catch (e: GetCredentialCancellationException) {
          Log.d(LOG_TAG, e.toString())
          resolveAndEmit(CredentialFactory.fromCancelled(), promise)
        } catch (e: Throwable) {
          rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e.toString(), promise)
        }
      }
    } else {
      CoroutineScope(Dispatchers.IO).launch {
        try {
          Identity.getSignInClient(activity)
          BeginSignInRequest.builder()
            .setGoogleIdTokenRequestOptions(
              BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                .setSupported(true)
                .setServerClientId(clientId)
                .setFilterByAuthorizedAccounts(options.getBoolean("authorizedAccounts"))
                .build()
            )
            .build()

//          suspendCancellableCoroutine { continuation ->
//            oneTapClient.beginSignIn(signInRequest)
//              .addOnSuccessListener { res -> continuation.resume(res) }
//              .addOnFailureListener { e -> continuation.resumeWithException(e) }
//          }

          // todo needs to be launched from a different activity
//
//          resolveAndEmit(
//            CredentialFactory.fromLegacyCredentialResponse(
//              oneTapClient.getSignInCredentialFromIntent(intent)
//            ),
//            promise
//          )
        } catch (e: ApiException) {
          when (e.statusCode) {
            CommonStatusCodes.CANCELED -> {
              resolveAndEmit(CredentialFactory.fromCancelled(), promise)
            }

            else -> {
              rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e.toString(), promise)
            }
          }
        } catch (e: Exception) {
          rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e.toString(), promise)
        }
      }
    }
  }

  /**
   * Gets the user current credentials.
   */
  override fun getPassword(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndEmitEvent(
        CredentialError.NO_ACTIVITY_ERROR.code,
        "Activity not available",
        promise
      )
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val manager = CredentialManager.create(activity)
        val request = GetCredentialRequest(
          listOf(GetPasswordOption())
        )

        resolveAndEmit(
          CredentialFactory.fromCredentialResponse(
            manager.getCredential(
              request = request,
              context = activity
            )
          ), promise
        )
      } catch (e: Throwable) {
        Log.d(LOG_TAG, e.toString())
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
      rejectAndEmitEvent(
        CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available", promise
      )
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
   * Gets if has google play services.
   */
  private fun hasGooglePlayServices(): Boolean {
    val result = GoogleApiAvailability.getInstance()
      .isGooglePlayServicesAvailable(reactApplicationContext)
    return result == ConnectionResult.SUCCESS
  }

  @RequiresApi(Build.VERSION_CODES.O)
  override fun initialize() {
    super.initialize()

    Log.d(LOG_TAG, "Registering deep link broadcast receiver")
    val filter = IntentFilter(WEB_APPLE_ID_BROADCAST_INTENT)
    ContextCompat.registerReceiver(
      reactApplicationContext,
      appleDeepLinkReceiver,
      filter,
      ContextCompat.RECEIVER_NOT_EXPORTED
    )
  }

  override fun invalidate() {
    super.invalidate()
    Log.d(LOG_TAG, "Unregistering deep link broadcast receiver")
    reactApplicationContext.unregisterReceiver(appleDeepLinkReceiver)
  }

  private fun parseWebUrl(url: String?): Uri {
    val url = url?.trim()
      ?: throw IllegalArgumentException("URL cannot be null")

    if (!Patterns.WEB_URL.matcher(url).matches()) {
      throw IllegalArgumentException("Invalid URL format: $url")
    }

    return url.toUri()
  }

  /**
   * Reject and emit event.
   */
  private fun rejectAndEmitEvent(code: String, e: Throwable, promise: Promise) {
    promise.reject(code, e)

    val error = Arguments.createMap()
    error.putString("code", code)
    error.putString("message", e.toString())
    emitOnWebAppleCredentialSuccess(error)
  }

  /**
   * Reject and emit event.
   */
  private fun rejectAndEmitEvent(code: String, e: String, promise: Promise) {
    promise.reject(code, e)

    val error = Arguments.createMap()
    error.putString("code", code)
    error.putString("message", e)
    emitOnCredentialFailure(error)
  }

  /**
   * Resolves and emit event.
   */
  private fun resolveAndEmit(data: WritableMap, promise: Promise) {
    promise.resolve(data.copy())
    emitOnCredentialSuccess(data)
  }

  companion object {
    const val NAME = NativeOauthEssentialsSpec.NAME

    const val LOG_TAG = "NativeOauthEssentials"

    const val WEB_APPLE_ID_BROADCAST_INTENT = "com.oauthessentials.WEB_APPLE_ID_BROADCAST_SENT"

  }
}
