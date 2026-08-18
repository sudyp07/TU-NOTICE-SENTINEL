package com.sudyp.tunoticesentinel.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.sudyp.tunoticesentinel.SentinelApplication
import com.sudyp.tunoticesentinel.data.SentinelRepository
import com.sudyp.tunoticesentinel.data.local.toDomain
import com.sudyp.tunoticesentinel.data.local.DownloadEntity
import com.sudyp.tunoticesentinel.data.local.ResultEntity
import com.sudyp.tunoticesentinel.security.AppSettings
import com.sudyp.tunoticesentinel.security.SettingsValidator
import com.sudyp.tunoticesentinel.notifications.NoticeSyncWorker
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import java.time.Instant
import com.sudyp.tunoticesentinel.data.local.NotificationEntity

enum class ConnectionState { CONNECTED, OFFLINE, UNCONFIGURED }

data class ActionMessage(val text: String, val success: Boolean)

class SentinelViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as SentinelApplication
    private val dao = app.database.sentinelDao()
    private var repositoryKey = ""
    private var repository: SentinelRepository? = null

    val status = dao.observeStatus().map { it?.toDomain() }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val notices = dao.observeNotices().map { rows -> rows.map { it.toDomain() } }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val logs = dao.observeLogs().map { rows -> rows.map { it.toDomain() } }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val notifications = dao.observeNotifications().map { rows -> rows.map { it.toDomain() } }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val results = dao.observeResults().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val downloads = dao.observeDownloads().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _settings = MutableStateFlow(app.settings.read())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    private val _connection = MutableStateFlow(if (configured(_settings.value)) ConnectionState.OFFLINE else ConnectionState.UNCONFIGURED)
    val connection: StateFlow<ConnectionState> = _connection.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _message = MutableStateFlow<ActionMessage?>(null)
    val message: StateFlow<ActionMessage?> = _message.asStateFlow()

    private val _locked = MutableStateFlow(_settings.value.appLockEnabled)
    val locked: StateFlow<Boolean> = _locked.asStateFlow()


    init {
        if (configured(_settings.value)) refresh()
    }

    fun clearMessage() { _message.value = null }

    fun refresh() = perform("Dashboard updated") { refreshWithAlerts() }

    fun refresh(silent: Boolean) {
        if (silent) {
            if (_loading.value) return
            viewModelScope.launch { runCatching { refreshWithAlerts() } }
        } else refresh()
    }

    fun checkNow() = perform("Check request accepted") {
        repo().checkNow()
        refreshWithAlerts()
    }

    fun testEmail() = perform("Test email sent successfully") { repo().testEmail() }

    fun setBotEnabled(enabled: Boolean) = perform(if (enabled) "Bot enabled" else "Bot disabled") {
        repo().setBotEnabled(enabled)
        repo().refreshAll()
    }

    fun runBotTest() = perform("Bot self-test completed") { repo().runBotTest() }

    fun clearLogs() = perform("Logs cleared") { repo().clearLogs() }

    fun markNoticeRead(id: String) = viewModelScope.launch { dao.markNoticeRead(id) }
    fun markAllNoticesRead() = viewModelScope.launch { dao.markAllNoticesRead() }
    fun clearReadNotices() = viewModelScope.launch { dao.clearReadNotices() }
    fun toggleBookmark(id: String) = viewModelScope.launch { dao.toggleBookmark(id) }

    fun saveResult(program: String, semester: String, symbol: String, result: String, grade: String, notes: String) {
        if (program.isBlank() || result.isBlank()) {
            _message.value = ActionMessage("Program and result are required", false)
            return
        }
        viewModelScope.launch {
            dao.saveResult(ResultEntity(program = program.trim(), semester = semester.trim(), symbolNumber = symbol.trim(), result = result.trim(), grade = grade.trim(), notes = notes.trim()))
            _message.value = ActionMessage("Result saved privately on this device", true)
        }
    }

    fun deleteResult(id: Long) = viewModelScope.launch { dao.deleteResult(id) }

    fun recordDownload(title: String, url: String) = viewModelScope.launch {
        dao.saveDownload(DownloadEntity(title = title.ifBlank { "TU result download" }, url = url))
    }

    fun saveSettings(updated: AppSettings) {
        val normalized = updated.copy(
            baseUrl = updated.baseUrl.trim().trimEnd('/'),
            apiKey = updated.apiKey.trim(),
        )
        SettingsValidator.validate(normalized)?.let { validationError ->
            _message.value = ActionMessage(validationError, false)
            return
        }
        app.settings.save(normalized)
        _settings.value = app.settings.read()
        repository = null
        repositoryKey = ""
        _connection.value = if (configured(_settings.value)) ConnectionState.OFFLINE else ConnectionState.UNCONFIGURED
        _message.value = ActionMessage("Settings saved securely", true)
        if (configured(_settings.value)) refresh()
    }

    fun enablePin(pin: String) {
        runCatching { app.settings.setPin(pin) }
            .onSuccess {
                _settings.value = app.settings.read()
                _locked.value = false
                _message.value = ActionMessage("App lock enabled", true)
            }
            .onFailure { _message.value = ActionMessage(it.message ?: "Invalid PIN", false) }
    }

    fun disablePin() {
        app.settings.disablePin()
        _settings.value = app.settings.read()
        _locked.value = false
        _message.value = ActionMessage("App lock disabled", true)
    }

    fun unlock(pin: String) {
        if (app.settings.verifyPin(pin)) _locked.value = false
        else _message.value = ActionMessage("Incorrect PIN", false)
    }

    private fun perform(success: String, block: suspend () -> Unit) {
        if (_loading.value) return
        viewModelScope.launch {
            _loading.value = true
            try {
                block()
                _connection.value = ConnectionState.CONNECTED
                _message.value = ActionMessage(success, true)
            } catch (error: Exception) {
                _connection.value = if (error is IOException) ConnectionState.OFFLINE else _connection.value
                _message.value = ActionMessage(readableError(error), false)
            } finally {
                _loading.value = false
            }
        }
    }

    private fun repo(): SentinelRepository {
        val value = _settings.value
        check(configured(value)) { "Configure the HTTPS server URL and API key in Settings first." }
        val key = "${value.baseUrl}|${value.apiKey.hashCode()}"
        if (repository == null || repositoryKey != key) {
            repository = SentinelRepository(app.database, value.baseUrl, value.apiKey)
            repositoryKey = key
        }
        return checkNotNull(repository)
    }

    private suspend fun refreshWithAlerts() {
        val newRows = repo().refreshAll()
        val preferences = getApplication<Application>().getSharedPreferences("sentinel_worker", Context.MODE_PRIVATE)
        val initialized = preferences.getBoolean("initialized", false)
        if (initialized && newRows.isNotEmpty()) {
            NoticeSyncWorker.notifyNewNotices(getApplication(), newRows.map { it.title })
            val now = Instant.now().toString()
            dao.saveNotifications(listOf(NotificationEntity("local-$now", "push", newRows.size, now, "This device", "delivered", "New TU notice alert")))
        }
        preferences.edit().putBoolean("initialized", true).apply()
    }

    private fun configured(value: AppSettings) = value.baseUrl.startsWith("https://") && value.apiKey.isNotBlank()

    private fun readableError(error: Exception): String {
        if (error is HttpException) {
            val body = error.response()?.errorBody()?.string().orEmpty()
            val serverMessage = runCatching { JSONObject(body).optJSONObject("error")?.optString("message") }.getOrNull()
            if (!serverMessage.isNullOrBlank()) return serverMessage
            return "Sentinel server returned HTTP ${error.code()}."
        }
        if (error is IOException) return "Unable to connect to Sentinel server. Cached data is still available."
        return error.message?.takeIf { it.isNotBlank() } ?: "The action could not be completed."
    }
}
