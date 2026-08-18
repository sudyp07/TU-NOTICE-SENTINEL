package com.sudyp.tunoticesentinel.security

object SettingsValidator {
    fun validate(settings: AppSettings): String? = when {
        settings.baseUrl.isBlank() && settings.apiKey.isBlank() -> null
        !settings.baseUrl.startsWith("https://") -> "Use an HTTPS server URL."
        settings.apiKey.length < 24 -> "API secret must contain at least 24 characters."
        else -> null
    }
}
