package com.sudyp.tunoticesentinel.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.sudyp.tunoticesentinel.data.Notice
import com.sudyp.tunoticesentinel.security.AppSettings
import kotlinx.coroutines.delay

private enum class Tab(val route: String, val label: String) {
    Home("home", "Pulse"), Notices("notices", "Notices"), Alerts("alerts", "Alerts"), Results("results", "Results"), Settings("settings", "Settings")
}

@Composable
fun SentinelApp(model: SentinelViewModel) {
    val nav = rememberNavController()
    val status by model.status.collectAsStateWithLifecycle()
    val notices by model.notices.collectAsStateWithLifecycle()
    val notifications by model.notifications.collectAsStateWithLifecycle()
    val settings by model.settings.collectAsStateWithLifecycle()
    val connection by model.connection.collectAsStateWithLifecycle()
    val loading by model.loading.collectAsStateWithLifecycle()

    LaunchedEffect(settings.baseUrl, settings.apiKey) {
        if (settings.baseUrl.startsWith("https://") && settings.apiKey.isNotBlank()) {
            while (true) {
                model.refresh(silent = true)
                delay(15_000)
            }
        }
    }

    Scaffold(
        bottomBar = {
            val route = nav.currentBackStackEntryAsState().value?.destination?.route
            NavigationBar(Modifier.navigationBarsPadding()) {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = route == tab.route,
                        onClick = { nav.navigate(tab.route) { launchSingleTop = true } },
                        icon = { Icon(tabIcon(tab), contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { pad ->
        NavHost(nav, startDestination = Tab.Home.route, modifier = Modifier.padding(pad)) {
            composable(Tab.Home.route) { HomeScreen(status, notices, connection.name, loading, model) }
            composable(Tab.Notices.route) { NoticeScreen(notices, model) }
            composable(Tab.Alerts.route) { AlertScreen(notifications, model) }
            composable(Tab.Results.route) { ResultsScreen(settings, model.results.collectAsStateWithLifecycle().value, model) }
            composable(Tab.Settings.route) { PulseSettings(settings, model) }
        }
    }
}

private fun tabIcon(tab: Tab) = when (tab) {
    Tab.Home -> Icons.Outlined.Home
    Tab.Notices -> Icons.Outlined.Article
    Tab.Alerts -> Icons.Outlined.Notifications
    Tab.Results -> Icons.Outlined.School
    Tab.Settings -> Icons.Outlined.Settings
}

@Composable
private fun HomeScreen(status: com.sudyp.tunoticesentinel.data.BotStatus?, notices: List<Notice>, connection: String, loading: Boolean, model: SentinelViewModel) {
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("TU PULSE", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold); Text("Your university, in motion.", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black) }
                IconButton(onClick = { model.refresh() }) { Icon(Icons.Outlined.Refresh, "Refresh") }
            }
        }
        item {
            val live = status?.online == true
            Card(colors = CardDefaults.cardColors(containerColor = if (live) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer), shape = RoundedCornerShape(24.dp)) {
                Row(Modifier.padding(18.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(12.dp).clip(CircleShape).background(if (live) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error))
                    Spacer(Modifier.size(12.dp))
                    Column(Modifier.weight(1f)) { Text(if (live) "Sentinel is live" else "Sentinel is offline", fontWeight = FontWeight.Bold); Text("API: $connection • ${status?.bot ?: "unknown"}") }
                    if (loading) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Metric("NEW", status?.newNotices ?: 0, Modifier.weight(1f))
                Metric("STORED", status?.storedNotices ?: 0, Modifier.weight(1f))
                Metric("MAIL", status?.emailsSent ?: 0, Modifier.weight(1f))
            }
        }
        item { SectionTitle("Latest signal") }
        items(notices.take(5), key = { it.id }) { NoticeCard(it, model) }
        item { FilledTonalButton(onClick = { model.checkNow() }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.Bolt, null); Spacer(Modifier.size(8.dp)); Text("Check TU now") } }
    }
}

@Composable private fun Metric(label: String, value: Int, modifier: Modifier) { Card(modifier, shape = RoundedCornerShape(18.dp)) { Column(Modifier.padding(14.dp)) { Text(label, style = MaterialTheme.typography.labelSmall); Text(value.toString(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black) } } }
@Composable private fun SectionTitle(text: String) { Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }

@Composable
private fun NoticeScreen(notices: List<Notice>, model: SentinelViewModel) {
    var query by remember { mutableStateOf("") }
    val filtered = notices.filter { it.title.contains(query, true) || it.bsDate.orEmpty().contains(query, true) }
    LazyColumn(contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), singleLine = true, leadingIcon = { Icon(Icons.Outlined.Search, null) }, placeholder = { Text("Search notices") }) }
        item { SectionTitle("Notice stream") }
        items(filtered, key = { it.id }) { NoticeCard(it, model) }
    }
}

@Composable private fun NoticeCard(notice: Notice, model: SentinelViewModel) {
    Card(shape = RoundedCornerShape(20.dp), onClick = { model.markNoticeRead(notice.id) }) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (notice.isNew) Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) { Text("NEW", Modifier.padding(horizontal = 7.dp, vertical = 3.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold) }
                Spacer(Modifier.size(8.dp)); Text(notice.bsDate ?: notice.adDate ?: "TU notice", style = MaterialTheme.typography.labelMedium)
            }
            Spacer(Modifier.height(7.dp))
            Text(notice.title, fontWeight = FontWeight.Bold, maxLines = 3, overflow = TextOverflow.Ellipsis)
            if (notice.isRead) { Spacer(Modifier.height(6.dp)); Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Check, null, Modifier.size(16.dp)); Spacer(Modifier.size(4.dp)); Text("Read", style = MaterialTheme.typography.labelSmall) } }
        }
    }
}

@Composable private fun AlertScreen(rows: List<com.sudyp.tunoticesentinel.data.NotificationRecord>, model: SentinelViewModel) {
    LazyColumn(contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("Alerts", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black) }
        if (rows.isEmpty()) item { Text("No alerts yet. New notice notifications will appear here.") }
        items(rows, key = { it.id }) { row -> Card(shape = RoundedCornerShape(18.dp)) { Column(Modifier.padding(16.dp)) { Text(row.summary, fontWeight = FontWeight.Bold); Text("${row.noticeCount} notice(s) • ${row.status}") } } }
        item { Button(onClick = { model.refresh() }, modifier = Modifier.fillMaxWidth()) { Text("Sync alerts") } }
    }
}


@Composable
private fun PulseSettings(settings: AppSettings, model: SentinelViewModel) {
    var baseUrl by rememberSaveable { mutableStateOf(settings.baseUrl) }
    var apiKey by rememberSaveable { mutableStateOf(settings.apiKey) }
    var visible by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(settings) { baseUrl = settings.baseUrl; apiKey = settings.apiKey }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text("Settings", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black); Text("Connect TU Pulse to your existing Render Sentinel API.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        item {
            Card(shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(baseUrl, { baseUrl = it }, Modifier.fillMaxWidth(), singleLine = true, label = { Text("HTTPS API URL") })
                    OutlinedTextField(apiKey, { apiKey = it }, Modifier.fillMaxWidth(), singleLine = true, label = { Text("API secret") }, visualTransformation = if (visible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation())
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(if (visible) "Secret visible" else "Secret hidden", style = MaterialTheme.typography.labelMedium)
                        androidx.compose.material3.TextButton(onClick = { visible = !visible }) { Text(if (visible) "Hide" else "Show") }
                    }
                    Button(onClick = { model.saveSettings(settings.copy(baseUrl = baseUrl, apiKey = apiKey)) }, Modifier.fillMaxWidth()) { Text("Save & connect") }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp)) {
                    Text("Runtime", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text("Foreground sync: every 15 seconds\nBackend scan: controlled by Render\nGitHub Actions: Android build only")
                }
            }
        }
    }
}
