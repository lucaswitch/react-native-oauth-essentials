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
import androidx.core.view.WindowCompat
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
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.security.SecureRandom
import java.util.Base64

class OauthEssentialsModule(reactContext: ReactApplicationContext) :
  NativeOauthEssentialsSpec(reactContext) {

  private val deepLinkReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      val url = intent?.getStringExtra("url")
      Log.d(LOG_TAG, "Receiving deep link ${url}")

      intent?.getStringExtra("url")?.let { url ->
        val uri = url.toUri()
        appleSignInPromiseSettler?.let {
          if (!it.settled()) {
            Log.d(LOG_TAG, "Sending deep link callback")
            val result = Arguments.createMap().apply {
              putString("type", CredentialFactory.CredentialsType.WEB_APPLE_ID.code)
              putMap("data", Arguments.createMap().apply {
                putString("url", uri.toString())
                putString("scheme", uri.scheme)
                putString("host", uri.host)
                putString("path", uri.path)
                putString("query", uri.query)
              })
            }
            resolveAndEmit(result, it)
          } else {
            Log.d(LOG_TAG, "Cannot call deep link callback")
          }
        }
      }
    }
  }

  private var appleSignInPromiseSettler: RCTPromiseSettler? = null

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
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not have GooglePlay Services",
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
          CredentialFactory.fromResponse(
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
    appleSignInPromiseSettler?.let {
      if (!it.settled()) {
        it.resolve(CredentialFactory.fromCancelled())
      }
    }
    appleSignInPromiseSettler = null

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

    appleSignInPromiseSettler = RCTPromiseSettler(promise)
    activity.runOnUiThread {
      val intent = Intent(activity, CustomTabsActivity::class.java).apply {
        data = uri
        action = DISPLAY_CUSTOM_TABS_INTENT
      }
      activity.startActivity(intent)
    }
  }

  /**
   * Performs the google sign in.
   */
  @RequiresApi(Build.VERSION_CODES.O)
  override fun googleSignIn(clientId: String, options: ReadableMap, promise: Promise) {
    if (!hasGooglePlayServices()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not have GooglePlay Services",
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

        activity.runOnUiThread {
          WindowCompat.getInsetsController(
            activity.window,
            activity.window.decorView
          ).isAppearanceLightStatusBars = false
        }
        resolveAndEmit(
          CredentialFactory.fromResponse(
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
          CredentialFactory.fromResponse(
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
    val filter = IntentFilter(DEEPLINK_WEB_APPLE_INTENT)
    ContextCompat.registerReceiver(
      reactApplicationContext.applicationContext,
      deepLinkReceiver,
      filter,
      ContextCompat.RECEIVER_NOT_EXPORTED
    )
  }

  override fun invalidate() {
    super.invalidate()
    Log.d(LOG_TAG, "Unregistering deep link broadcast receiver")
    reactApplicationContext.unregisterReceiver(deepLinkReceiver)
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

  /**
   * Resolves and emit event.
   */
  private fun resolveAndEmit(data: WritableMap, settler: RCTPromiseSettler) {
    settler.resolve(data.copy())
    emitOnCredentialSuccess(data)
    Log.d(LOG_TAG, "Resolving event emitOnCredentialSuccess")
  }

  companion object {
    const val NAME = NativeOauthEssentialsSpec.NAME
    const val LOG_TAG = "NativeOauthEssentials"
    const val DEEPLINK_WEB_APPLE_INTENT = "com.oauthessentials.WEB_APPLE_DEEP_LINK_INTENT"
    const val DISPLAY_CUSTOM_TABS_INTENT = "com.oauthessentials.DISPLAY_CUSTOM_TABS"
  }
}
