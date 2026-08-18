package com.sudyp.tunoticesentinel.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColors = darkColorScheme(
    primary = Color(0xFF73A9FF),
    onPrimary = Color(0xFF002F65),
    primaryContainer = Color(0xFF0D3868),
    secondary = Color(0xFF6DDBC0),
    background = Color(0xFF07131F),
    surface = Color(0xFF0E1E2D),
    surfaceVariant = Color(0xFF172A3B),
    error = Color(0xFFFFB4AB),
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF185FAE),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD7E3FF),
    secondary = Color(0xFF006B59),
    background = Color(0xFFF6F9FC),
    surface = Color.White,
    surfaceVariant = Color(0xFFE8EEF5),
    error = Color(0xFFBA1A1A),
)

@Composable
fun SentinelTheme(darkMode: Boolean? = null, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkMode ?: isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
