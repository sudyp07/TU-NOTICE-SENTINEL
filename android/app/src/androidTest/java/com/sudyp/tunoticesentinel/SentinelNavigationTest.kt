package com.sudyp.tunoticesentinel

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

class SentinelNavigationTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    @Test fun dashboardRendersInUnconfiguredOfflineSafeState() {
        rule.onNodeWithTag("dashboard_screen").assertIsDisplayed()
        rule.onNodeWithText("Configure your HTTPS API URL and key in Settings.").assertIsDisplayed()
    }

    @Test fun noticeListAndSettingsAreReachable() {
        rule.onNodeWithText("Notices").performClick()
        rule.onNodeWithTag("notices_screen").assertIsDisplayed()
        rule.onNodeWithText("Settings").performClick()
        rule.onNodeWithTag("settings_screen").assertIsDisplayed()
    }
}
