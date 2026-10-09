package com.oauthessentials

import android.accounts.Account
import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.Log
import android.util.Patterns
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CreatePasswordRequest
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialOption
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.GetPasswordOption
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.Scope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import java.security.SecureRandom
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class OauthEssentialsModule(reactContext: ReactApplicationContext) :
  NativeOauthEssentialsSpec(reactContext) {

  /**
   * Browser flows (web Apple sign in and generic OAuth) share CustomTabsActivity,
   * so only one can be pending at a time.
   */
  private enum class BrowserSessionKind { APPLE, OAUTH }

  private var browserSessionSettler: RCTPromiseSettler? = null
  private var browserSessionKind: BrowserSessionKind? = null
  private var authorizationContinuation: CancellableContinuation<Pair<Int, Intent?>>? = null
  private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      intent?.action?.let { action ->
        Log.d(LOG_TAG, "Handling intent action ${action} received")
        val settler = browserSessionSettler
        if (settler == null || settler.settled()) {
          Log.d(LOG_TAG, "No pending browser session for ${action}")
          return
        }
        val kind = browserSessionKind
        when (action) {
          WEB_APPLE_DEEP_LINK_RECEIVED_INTENT -> {
            val url = intent.getStringExtra("url") ?: return
            Log.d(LOG_TAG, "Receiving deep link ${url}")
            if (kind == BrowserSessionKind.OAUTH) {
              settler.resolve(CredentialFactory.fromRedirect(url))
            } else {
              val uri = url.toUri()
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
              resolveAndEmit(result, settler)
            }
          }

          WEB_APPLE_CANCELLED_INTENT -> {
            Log.d(LOG_TAG, "Receiving cancellation from CustomTabsActivity")
            if (kind == BrowserSessionKind.OAUTH) {
              settler.resolve(CredentialFactory.fromCancelled())
            } else {
              resolveAndEmit(CredentialFactory.fromCancelled(), settler)
            }
          }

          WEB_BROWSER_UNAVAILABLE_INTENT -> {
            val code = CredentialError.BROWSER_UNAVAILABLE.code
            val message = "No browser available to open the url"
            settler.reject(code, message, null, null)
            if (kind == BrowserSessionKind.APPLE) {
              emitFailure(code, message)
            }
          }

          else -> {
            throw IllegalArgumentException("Intent action not supported")
          }
        }
      }
    }
  }

  private val activityEventListener = object : ActivityEventListener {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode == AUTHORIZATION_REQUEST_CODE) {
        authorizationContinuation?.let {
          authorizationContinuation = null
          it.resume(resultCode to data)
        }
      }
    }

    override fun onNewIntent(intent: Intent) = Unit
  }

  @SuppressLint("ObsoleteSdkInt")
  override fun getTypedExportedConstants(): MutableMap<String, Any> {
    // Passwords and hybrid sign in go through Credential Manager, which needs Play Services.
    val hasCredentialManager = getCredentialManagerSupported() && hasGooglePlayServices()
    return mutableMapOf(
      "GOOGLE_PLAY_SERVICES_SUPPORTED" to hasGooglePlayServices(),
      "PASSWORD_SUPPORTED" to hasCredentialManager,
      "GOOGLE_ID_SUPPORTED" to googleIdSupported(),
      "APPLE_ID_SUPPORTED" to getAppleIdSupported(),
      "HYBRID_SUPPORTED" to hasCredentialManager,
      "PASSKEYS_SUPPORTED" to getPasskeysSupported(),
      "OAUTH_REDIRECT_URI" to "${reactApplicationContext.packageName}://oauth/callback"
    )
  }

  override fun hybridSignIn(jsClientId: String, options: ReadableMap, promise: Promise) {
    val clientId = resolveWebClientId(jsClientId, promise) ?: return

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

    moduleScope.launch {
      try {
        val manager = CredentialManager.create(activity)
        val result = getCredential(
          activity,
          manager,
          googleIdOption(clientId, options, silent = false),
          GetPasswordOption()
        )
        resolveAndEmit(CredentialFactory.fromCredentialResponse(result), promise)
      } catch (e: GetCredentialCancellationException) {
        Log.d(LOG_TAG, e.toString())
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: NoCredentialException) {
        rejectAndEmitEvent(CredentialError.NO_SIGN_IN_AVAILABLE.code, e, promise)
      } catch (e: Throwable) {
        Log.d(LOG_TAG, e.toString())
        rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      }
    }
  }

  /**
   * Performs the apple sign in.
   * The signing in is redirecting to the device default browser to handle it.
   */
  override fun appleSignIn(androidWebUrl: String?, options: ReadableMap, promise: Promise) {
    val uri: Uri
    try {
      uri = parseWebUrl(androidWebUrl)
    } catch (e: Throwable) {
      rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      return
    }
    openBrowserSession(uri, BrowserSessionKind.APPLE, promise)
  }

  override fun getAppleIdCredentialState(userId: String, promise: Promise) {
    promise.reject(
      CredentialError.NOT_SUPPORTED_ERROR.code,
      "Apple ID credential state is only available on iOS"
    )
  }

  /**
   * Opens an authorization url in a Custom Tab and resolves with the redirect url.
   * The redirect must reach CustomTabsActivity (OAUTH_REDIRECT_URI or an app intent filter).
   * It does not emit events: oauthSignIn finishes the flow in JS.
   */
  override fun openAuthSession(url: String, options: ReadableMap, promise: Promise) {
    val uri = url.toUri()
    if (uri.scheme != "https" && uri.scheme != "http") {
      promise.reject(CredentialError.INVALID_RESULT_ERROR.code, "Invalid authorization url: $url")
      return
    }
    openBrowserSession(uri, BrowserSessionKind.OAUTH, promise)
  }

  private fun openBrowserSession(uri: Uri, kind: BrowserSessionKind, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      val code = CredentialError.NO_ACTIVITY_ERROR.code
      promise.reject(code, "Could not find app activity.")
      if (kind == BrowserSessionKind.APPLE) {
        emitFailure(code, "Could not find app activity.")
      }
      return
    }

    // A new browser session replaces a pending one, which resolves as cancelled.
    browserSessionSettler?.let {
      if (!it.settled()) {
        it.resolve(CredentialFactory.fromCancelled())
      }
    }

    browserSessionSettler = RCTPromiseSettler(promise)
    browserSessionKind = kind
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
  override fun googleSignIn(jsClientId: String, options: ReadableMap, promise: Promise) {
    Log.d(LOG_TAG, "Calling googleSignIn")
    val clientId = resolveWebClientId(jsClientId, promise) ?: return

    if (!googleIdSupported() || !getCredentialManagerSupported()) {
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

    moduleScope.launch {
      try {
        val manager = CredentialManager.create(activity)
        val response = if (options.optString("mode") == "button") {
          getCredential(activity, manager, signInWithGoogleOption(clientId, options))
        } else {
          try {
            getCredential(activity, manager, googleIdOption(clientId, options, silent = false))
          } catch (e: NoCredentialException) {
            // No account on the device or the bottom sheet is in cooldown after being dismissed.
            // The button flow has no cooldown and lets the user add an account.
            if (options.optBoolean("authorizedAccounts")) throw e
            Log.d(LOG_TAG, "No credential for the bottom sheet, falling back to the button flow")
            getCredential(activity, manager, signInWithGoogleOption(clientId, options))
          }
        }

        val authorization = authorizeIfNeeded(activity, clientId, response, options, interactive = true)
        if (authorization == null && needsAuthorization(options)) {
          resolveAndEmit(CredentialFactory.fromCancelled(), promise)
          return@launch
        }
        resolveAndEmit(CredentialFactory.fromCredentialResponse(response, authorization), promise)
      } catch (e: GetCredentialCancellationException) {
        Log.d(LOG_TAG, e.toString())
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: NoCredentialException) {
        rejectAndEmitEvent(CredentialError.NO_SIGN_IN_AVAILABLE.code, e, promise)
      } catch (e: Throwable) {
        rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      }
    }
  }

  /**
   * Signs in with an account that already signed in to the app, auto selecting it when possible.
   */
  override fun googleSilentSignIn(jsClientId: String, options: ReadableMap, promise: Promise) {
    val clientId = resolveWebClientId(jsClientId, promise) ?: return

    if (!googleIdSupported() || !getCredentialManagerSupported()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not support googleSilentSignIn method.",
        promise
      )
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndEmitEvent(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available", promise)
      return
    }

    moduleScope.launch {
      try {
        val manager = CredentialManager.create(activity)
        val response = getCredential(activity, manager, googleIdOption(clientId, options, silent = true))
        val authorization = authorizeIfNeeded(activity, clientId, response, options, interactive = false)
        resolveAndEmit(CredentialFactory.fromCredentialResponse(response, authorization), promise)
      } catch (e: GetCredentialCancellationException) {
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: NoCredentialException) {
        rejectAndEmitEvent(CredentialError.NO_SIGN_IN_AVAILABLE.code, e, promise)
      } catch (e: Throwable) {
        rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      }
    }
  }

  /**
   * Clears the Credential Manager state, so auto select does not sign the user back in.
   */
  override fun signOut(promise: Promise) {
    moduleScope.launch {
      try {
        CredentialManager.create(reactApplicationContext)
          .clearCredentialState(ClearCredentialStateRequest())
        promise.resolve(true)
      } catch (e: Throwable) {
        Log.e(LOG_TAG, e.toString())
        promise.reject(CredentialError.INVALID_RESULT_ERROR.code, e)
      }
    }
  }

  /**
   * Gets the user current credentials.
   */
  override fun getPassword(promise: Promise) {
    if (!googleIdSupported()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not support getPassword method.",
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

    moduleScope.launch {
      try {
        val manager = CredentialManager.create(activity)
        val result = getCredential(activity, manager, GetPasswordOption())
        resolveAndEmit(
          CredentialFactory.fromCredentialResponse(result), promise
        )
      } catch (e: GetCredentialCancellationException) {
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: NoCredentialException) {
        // Same as iOS: no saved password is reported as cancelled.
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: Throwable) {
        Log.d(LOG_TAG, e.toString())
        rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      }
    }
  }

  /**
   * Stores a brand new username and password into the OS.
   */
  override fun passwordSignIn(username: String, password: String, promise: Promise) {
    if (!googleIdSupported()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not support passwordSignIn method.",
        promise
      )
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndEmitEvent(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available", promise)
      return
    }

    moduleScope.launch {
      try {
        val manager = CredentialManager.create(activity)
        val request = CreatePasswordRequest(
          id = username,
          password = password
        )

        // createCredential lança UI: deve rodar na Main thread.
        withContext(Dispatchers.Main) {
          manager.createCredential(
            request = request,
            context = activity
          )
        }
        promise.resolve(true)
      } catch (e: Throwable) {
        Log.e(LOG_TAG, e.toString())
        promise.resolve(false)
      }
    }
  }

  /**
   * Creates the passkey.
   */
  override fun createPassKey(options: ReadableMap, promise: Promise) {
    if (!getPasskeysSupported()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not support passkeys.",
        promise
      )
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndEmitEvent(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available", promise)
      return
    }

    moduleScope.launch {
      try {
        val requestJson = options.getString("requestJson")
          ?: throw IllegalArgumentException("\"requestJson\" field should be set on android.")
        // `isConditional` (conditional create) só existe em androidx.credentials
        // >= 1.6.0. Estamos fixados em 1.5.0 estável (ver build.gradle), então o
        // parâmetro não é suportado aqui.

        val manager = CredentialManager.create(activity)
        val request = CreatePublicKeyCredentialRequest(
          requestJson = requestJson,
          preferImmediatelyAvailableCredentials = options.optBoolean("preferImmediatelyAvailableCredentials")
        )
        // createCredential lança UI: deve rodar na Main thread.
        val result = withContext(Dispatchers.Main) {
          manager.createCredential(
            request = request,
            context = activity
          )
        }
        resolveAndEmit(CredentialFactory.fromPublicKeyCredential(result), promise)
      } catch (e: CreateCredentialCancellationException) {
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: Throwable) {
        Log.e(LOG_TAG, e.toString())
        rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      }
    }
  }

  /**
   * Gets the passkey.
   */
  override fun getPassKey(options: ReadableMap, promise: Promise) {
    if (!getPasskeysSupported()) {
      rejectAndEmitEvent(
        CredentialError.NOT_SUPPORTED_ERROR.code,
        "Device does not support passkeys.",
        promise
      )
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndEmitEvent(CredentialError.NO_ACTIVITY_ERROR.code, "Activity not available", promise)
      return
    }

    moduleScope.launch {
      try {
        val requestJson = options.getString("requestJson")
          ?: throw IllegalArgumentException("\"requestJson\" field should be set on android.")

        val manager = CredentialManager.create(activity)
        val request = GetCredentialRequest(
          listOf(
            GetPublicKeyCredentialOption(
              requestJson = requestJson,
            ),
          ),
          preferImmediatelyAvailableCredentials = options.optBoolean("preferImmediatelyAvailableCredentials")
        )
        // getCredential lança UI: deve rodar na Main thread.
        val result = withContext(Dispatchers.Main) {
          manager.getCredential(
            request = request,
            context = activity
          )
        }
        resolveAndEmit(CredentialFactory.fromPublicKeyCredential(result), promise)
      } catch (e: GetCredentialCancellationException) {
        resolveAndEmit(CredentialFactory.fromCancelled(), promise)
      } catch (e: NoCredentialException) {
        rejectAndEmitEvent(CredentialError.NO_SIGN_IN_AVAILABLE.code, e, promise)
      } catch (e: Throwable) {
        Log.e(LOG_TAG, e.toString())
        rejectAndEmitEvent(CredentialError.INVALID_RESULT_ERROR.code, e, promise)
      }
    }
  }

  /**
   * Passkey AutoFill is iOS only.
   */
  override fun cancelPassKeyAutoFill(promise: Promise) {
    promise.resolve(false)
  }

  /**
   * Generates a PKCE code verifier, its S256 challenge and a random state.
   */
  override fun generatePkce(promise: Promise) {
    try {
      val codeVerifier = randomBase64Url(32)
      val challenge = MessageDigest.getInstance("SHA-256")
        .digest(codeVerifier.toByteArray(Charsets.US_ASCII))
      promise.resolve(Arguments.createMap().apply {
        putString("codeVerifier", codeVerifier)
        putString("codeChallenge", base64Url(challenge))
        putString("state", randomBase64Url(16))
      })
    } catch (e: Throwable) {
      promise.reject(CredentialError.INVALID_RESULT_ERROR.code, e)
    }
  }

  private fun randomBase64Url(byteCount: Int): String {
    val bytes = ByteArray(byteCount)
    // SecureRandom() não bloqueia, ao contrário de getInstanceStrong().
    SecureRandom().nextBytes(bytes)
    return base64Url(bytes)
  }

  private fun base64Url(bytes: ByteArray): String =
    Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

  /**
   * Bottom sheet option: lists the device Google accounts.
   */
  private fun googleIdOption(clientId: String, options: ReadableMap, silent: Boolean): GetGoogleIdOption {
    val builder = GetGoogleIdOption.Builder()
      .setServerClientId(clientId)
      .setFilterByAuthorizedAccounts(silent || options.optBoolean("authorizedAccounts"))
      .setAutoSelectEnabled(silent || options.optBoolean("autoSelectEnabled"))
    options.optString("nonce")?.let { builder.setNonce(it) }
    return builder.build()
  }

  /**
   * "Sign in with Google" button option: always shows the sign in flow.
   */
  private fun signInWithGoogleOption(clientId: String, options: ReadableMap): GetSignInWithGoogleOption {
    val builder = GetSignInWithGoogleOption.Builder(clientId)
    options.optString("nonce")?.let { builder.setNonce(it) }
    options.optString("hostedDomain")?.let { builder.setHostedDomainFilter(it) }
    return builder.build()
  }

  /**
   * getCredential launches UI, so it must run on the main thread.
   */
  private suspend fun getCredential(
    activity: Activity,
    manager: CredentialManager,
    vararg credentialOptions: CredentialOption
  ): GetCredentialResponse {
    val request = GetCredentialRequest.Builder().apply {
      credentialOptions.forEach { addCredentialOption(it) }
    }.build()
    return withContext(Dispatchers.Main) {
      manager.getCredential(activity, request)
    }
  }

  private fun needsAuthorization(options: ReadableMap): Boolean =
    options.optStringList("scopes").isNotEmpty() || options.optBoolean("offlineAccess")

  /**
   * Requests the access token, granted scopes and server auth code when scopes or offline access
   * were requested. Returns null when not needed, when the user declined the consent screen or,
   * on silent sign in, when consent would be required.
   */
  private suspend fun authorizeIfNeeded(
    activity: Activity,
    clientId: String,
    response: GetCredentialResponse,
    options: ReadableMap,
    interactive: Boolean
  ): AuthorizationResult? {
    if (!needsAuthorization(options)) return null

    val scopes = options.optStringList("scopes").ifEmpty { listOf("openid", "email", "profile") }
    val builder = AuthorizationRequest.Builder()
      .setRequestedScopes(scopes.map { Scope(it) })
    if (options.optBoolean("offlineAccess")) {
      builder.requestOfflineAccess(options.optString("serverClientId") ?: clientId)
    }
    options.optString("hostedDomain")?.let { builder.filterByHostedDomain(it) }
    val credential = response.credential
    if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
      val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
      builder.setAccount(Account(googleCredential.id, "com.google"))
    }

    val client = Identity.getAuthorizationClient(activity)
    val result = suspendCancellableCoroutine { continuation ->
      client.authorize(builder.build())
        .addOnSuccessListener { continuation.resume(it) }
        .addOnFailureListener { continuation.resumeWithException(it) }
    }
    if (!result.hasResolution()) return result
    if (!interactive) return null

    val pendingIntent = result.pendingIntent ?: return null
    val (resultCode, data) = withContext(Dispatchers.Main) {
      suspendCancellableCoroutine { continuation ->
        authorizationContinuation?.cancel()
        authorizationContinuation = continuation
        continuation.invokeOnCancellation { authorizationContinuation = null }
        activity.startIntentSenderForResult(
          pendingIntent.intentSender, AUTHORIZATION_REQUEST_CODE, null, 0, 0, 0
        )
      }
    }
    if (resultCode != Activity.RESULT_OK) return null
    return client.getAuthorizationResultFromIntent(data)
  }

  /**
   * Gets if has google play services.
   */
  private fun hasGooglePlayServices(): Boolean {
    val result = GoogleApiAvailability.getInstance()
      .isGooglePlayServicesAvailable(reactApplicationContext)
    return result == ConnectionResult.SUCCESS
  }

  override fun initialize() {
    super.initialize()

    Log.d(LOG_TAG, "Initialize has been called")
    Log.d(LOG_TAG, "Registering deep link broadcast receiver")
    ContextCompat.registerReceiver(
      reactApplicationContext.applicationContext,
      receiver,
      IntentFilter().apply {
        addAction(WEB_APPLE_DEEP_LINK_RECEIVED_INTENT)
        addAction(WEB_APPLE_CANCELLED_INTENT)
        addAction(WEB_BROWSER_UNAVAILABLE_INTENT)
      },
      ContextCompat.RECEIVER_NOT_EXPORTED
    )
    reactApplicationContext.addActivityEventListener(activityEventListener)
  }

  override fun invalidate() {
    super.invalidate()
    Log.d(LOG_TAG, "Invalidate has been called")

    Log.d(LOG_TAG, "Cancelling all coroutines and credential operations")
    moduleScope.cancel()
    reactApplicationContext.removeActivityEventListener(activityEventListener)

    browserSessionSettler?.let {
      if (!it.settled()) {
        Log.d(LOG_TAG, "Rejecting pending browser session promise without event")
        it.reject(
          "CANCELLED",
          "Module is being invalidated",
          null,
          null
        )
      }
    }
    browserSessionSettler = null

    Log.d(LOG_TAG, "Unregistering deep link broadcast receiver")
    reactApplicationContext.applicationContext.unregisterReceiver(receiver)
  }

  /**
   * Parses the web url.
   */
  private fun parseWebUrl(url: String?): Uri {
    val url = url?.trim()
      ?: throw IllegalArgumentException("URL cannot be null")

    if (!Patterns.WEB_URL.matcher(url).matches()) {
      throw IllegalArgumentException("Invalid URL format: $url")
    }

    return url.toUri()
  }

  private fun googleIdSupported(): Boolean = hasGooglePlayServices()

  private fun getAppleIdSupported(): Boolean = true

  private fun getCredentialManagerSupported(): Boolean = true

  private fun getPasskeysSupported(): Boolean {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && getCredentialManagerSupported()
  }

  private fun ReadableMap.optBoolean(key: String): Boolean =
    hasKey(key) && !isNull(key) && getBoolean(key)

  private fun ReadableMap.optString(key: String): String? =
    if (hasKey(key) && !isNull(key)) getString(key)?.takeIf { it.isNotEmpty() } else null

  private fun ReadableMap.optStringList(key: String): List<String> {
    if (!hasKey(key) || isNull(key)) return emptyList()
    val array = getArray(key) ?: return emptyList()
    return (0 until array.size()).mapNotNull { array.getString(it) }
  }

  private fun emitFailure(code: String, message: String) {
    val error = Arguments.createMap()
    error.putString("code", code)
    error.putString("message", message)
    emitOnCredentialFailure(error)
  }

  /**
   * Credential Manager needs the web client id. JS passes '' when it is not given, then it is read
   * from the GOOGLE_WEB_CLIENT_ID meta-data (written by the Expo plugin) or the
   * `default_web_client_id` string (generated by the Firebase google-services Gradle plugin).
   * Rejects CONFIGURATION_ERROR and returns null when none is set.
   */
  private fun resolveWebClientId(jsClientId: String, promise: Promise): String? {
    val clientId = jsClientId.trim().ifEmpty { null }
      ?: webClientIdFromMetaData()
      ?: webClientIdFromFirebase()
    if (clientId != null) return clientId
    rejectAndEmitEvent(
      CredentialError.CONFIGURATION_ERROR.code,
      "Missing Google web client id (the web client id, not the Android one): pass { webClientId }, " +
        "add <meta-data android:name=\"$GOOGLE_WEB_CLIENT_ID_META_DATA\" android:value=\"...\" /> " +
        "to <application> in AndroidManifest.xml (the Expo plugin does it), or use the Firebase " +
        "google-services.json with the google-services Gradle plugin (default_web_client_id).",
      promise
    )
    return null
  }

  @Suppress("DEPRECATION")
  private fun webClientIdFromMetaData(): String? {
    return try {
      val info = reactApplicationContext.packageManager.getApplicationInfo(
        reactApplicationContext.packageName,
        PackageManager.GET_META_DATA
      )
      info.metaData?.getString(GOOGLE_WEB_CLIENT_ID_META_DATA)?.trim()?.ifEmpty { null }
    } catch (e: PackageManager.NameNotFoundException) {
      null
    }
  }

  @SuppressLint("DiscouragedApi")
  private fun webClientIdFromFirebase(): String? {
    val resources = reactApplicationContext.resources
    val id = resources.getIdentifier("default_web_client_id", "string", reactApplicationContext.packageName)
    if (id == 0) return null
    return resources.getString(id).trim().ifEmpty { null }
  }

  private fun rejectAndEmitEvent(code: String, e: Throwable, promise: Promise) {
    promise.reject(code, e.message ?: e.toString(), e)
    emitFailure(code, e.message ?: e.toString())
  }

  /**
   * Reject and emit event.
   */
  private fun rejectAndEmitEvent(code: String, e: String, promise: Promise) {
    promise.reject(code, e)
    emitFailure(code, e)
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

    // <application> meta-data with the Google web client id, used when JS passes no client id.
    const val GOOGLE_WEB_CLIENT_ID_META_DATA = "com.oauthessentials.GOOGLE_WEB_CLIENT_ID"

    // Browser session intents (web Apple sign in and generic OAuth)
    const val WEB_APPLE_DEEP_LINK_RECEIVED_INTENT =
      "com.oauthessentials.WEB_APPLE_DEEP_LINK_RECEIVED_INTENT"
    const val WEB_APPLE_CANCELLED_INTENT =
      "com.oauthessentials.WEB_APPLE_CANCELLED_INTENT"
    const val WEB_BROWSER_UNAVAILABLE_INTENT =
      "com.oauthessentials.WEB_BROWSER_UNAVAILABLE_INTENT"
    const val DISPLAY_CUSTOM_TABS_INTENT = "com.oauthessentials.DISPLAY_CUSTOM_TABS_INTENT"

    private const val AUTHORIZATION_REQUEST_CODE = 0x0A07
  }
}
