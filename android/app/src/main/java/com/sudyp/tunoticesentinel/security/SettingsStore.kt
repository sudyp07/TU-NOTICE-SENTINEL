package com.sudyp.tunoticesentinel.security

import android.content.Context
import android.util.Base64
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

data class AppSettings(
    val baseUrl: String = "",
    val apiKey: String = "",
    val darkMode: Boolean = true,
    val appLockEnabled: Boolean = false,
    val profileName: String = "",
    val faculty: String = "All faculties",
    val batch: String = "",
    val symbolNumber: String = "",
    val dateOfBirth: String = "",
    val backgroundAlerts: Boolean = true,
)

class SettingsStore(context: Context) {
    private val secure = SecureStore(context)
    private val plain = context.getSharedPreferences("sentinel_preferences", Context.MODE_PRIVATE)

    fun read() = AppSettings(
        baseUrl = secure.get("base_url"),
        apiKey = secure.get("api_key"),
        darkMode = plain.getBoolean("dark_mode", true),
        appLockEnabled = plain.getBoolean("app_lock", false) && secure.get("pin_hash").isNotBlank(),
        profileName = secure.get("profile_name"),
        faculty = secure.get("faculty").ifBlank { "All faculties" },
        batch = secure.get("batch"),
        symbolNumber = secure.get("symbol_number"),
        dateOfBirth = secure.get("date_of_birth"),
        backgroundAlerts = plain.getBoolean("background_alerts", true),
    )

    fun save(settings: AppSettings) {
        secure.put("base_url", settings.baseUrl.trim())
        secure.put("api_key", settings.apiKey.trim())
        plain.edit().putBoolean("dark_mode", settings.darkMode).apply()
        plain.edit().putBoolean("background_alerts", settings.backgroundAlerts).apply()
        secure.put("profile_name", settings.profileName.trim())
        secure.put("faculty", settings.faculty.trim())
        secure.put("batch", settings.batch.trim())
        secure.put("symbol_number", settings.symbolNumber.trim())
        secure.put("date_of_birth", settings.dateOfBirth.trim())
        if (!settings.appLockEnabled) plain.edit().putBoolean("app_lock", false).apply()
    }

    fun setPin(pin: String) {
        require(pin.matches(Regex("\\d{4,8}"))) { "PIN must contain 4 to 8 digits" }
        val salt = ByteArray(16).also(SecureRandom()::nextBytes)
        secure.put("pin_salt", Base64.encodeToString(salt, Base64.NO_WRAP))
        secure.put("pin_hash", derivePin(pin, salt))
        plain.edit().putBoolean("app_lock", true).apply()
    }

    fun disablePin() {
        plain.edit().putBoolean("app_lock", false).apply()
        secure.remove("pin_hash")
        secure.remove("pin_salt")
    }

    fun verifyPin(pin: String): Boolean {
        val saltText = secure.get("pin_salt")
        val expected = secure.get("pin_hash")
        if (saltText.isBlank() || expected.isBlank()) return false
        val actual = derivePin(pin, Base64.decode(saltText, Base64.NO_WRAP))
        return MessageDigest.isEqual(actual.toByteArray(), expected.toByteArray())
    }

    private fun derivePin(pin: String, salt: ByteArray): String {
        val spec = PBEKeySpec(pin.toCharArray(), salt, 120_000, 256)
        return Base64.encodeToString(
            SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded,
            Base64.NO_WRAP,
        )
    }
}
