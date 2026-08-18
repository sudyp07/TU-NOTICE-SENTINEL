package com.sudyp.tunoticesentinel

import com.sudyp.tunoticesentinel.security.AppSettings
import com.sudyp.tunoticesentinel.security.SettingsValidator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SettingsValidatorTest {
    @Test fun allowsAnEmptyFirstRunConfiguration() {
        assertNull(SettingsValidator.validate(AppSettings()))
    }

    @Test fun rejectsCleartextServerUrls() {
        assertEquals("Use an HTTPS server URL.", SettingsValidator.validate(AppSettings(baseUrl = "http://server.test", apiKey = "x".repeat(32))))
    }

    @Test fun requiresAStrongApiSecret() {
        assertEquals("API secret must contain at least 24 characters.", SettingsValidator.validate(AppSettings(baseUrl = "https://server.test", apiKey = "short")))
    }

    @Test fun acceptsACompleteSecureConfiguration() {
        assertNull(SettingsValidator.validate(AppSettings(baseUrl = "https://server.test", apiKey = "x".repeat(32))))
    }
}
