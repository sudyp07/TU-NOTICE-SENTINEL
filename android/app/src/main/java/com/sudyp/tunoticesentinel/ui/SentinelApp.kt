@file:OptIn(ExperimentalMaterial3Api::class)

package com.sudyp.tunoticesentinel.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AlternateEmail
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.LockOpen
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Science
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.AssistChip
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.sudyp.tunoticesentinel.R
import com.sudyp.tunoticesentinel.data.BotStatus
import com.sudyp.tunoticesentinel.data.LogEntry
import com.sudyp.tunoticesentinel.data.Notice
import com.sudyp.tunoticesentinel.data.NotificationRecord
import com.sudyp.tunoticesentinel.security.AppSettings
import java.time.Instant
import java.time.Duration
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private const val TU_LOGO_URL = "https://portal.tu.edu.np/medias/2025_04_17_16_42_31.png"

private enum class Destination(val route: String, val label: String, val icon: ImageVector, val primary: Boolean = true) {
    Dashboard("dashboard", "Home", Icons.Outlined.Home),
    Notices("notices", "Notices", Icons.Outlined.Article),
    Results("results", "Results", Icons.Outlined.School),
    Notifications("notifications", "Alerts", Icons.Outlined.Notifications),
    Profile("profile", "Profile", Icons.Outlined.Person),
    Logs("logs", "Logs", Icons.Outlined.AlternateEmail, false),
    Settings("settings", "Settings", Icons.Outlined.Settings, false),
}

@Composable
fun SentinelApp(model: SentinelViewModel) {
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val status by model.status.collectAsStateWithLifecycle()
    val notices by model.notices.collectAsStateWithLifecycle()
    val logs by model.logs.collectAsStateWithLifecycle()
    val notifications by model.notifications.collectAsStateWithLifecycle()
    val settings by model.settings.collectAsStateWithLifecycle()
    val connection by model.connection.collectAsStateWithLifecycle()
    val loading by model.loading.collectAsStateWithLifecycle()
    val message by model.message.collectAsStateWithLifecycle()
    val githubState by model.githubState.collectAsStateWithLifecycle()
    val results by model.results.collectAsStateWithLifecycle()
    val downloads by model.downloads.collectAsStateWithLifecycle()

    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it.text)
            model.clearMessage()
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().testTag("sentinel_app"),
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = { SentinelBottomBar(nav) },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            ConnectionBanner(connection, status)
            NavHost(navController = nav, startDestination = Destination.Dashboard.route, modifier = Modifier.weight(1f)) {
                composable(Destination.Dashboard.route) {
                    DashboardScreen(status, personalizedNotices(notices, settings.faculty), connection, githubState, loading, model, nav)
                }
                composable(Destination.Notices.route) { NoticesScreen(notices, settings.faculty, model) }
                composable(Destination.Results.route) { ResultsScreen(settings, results, model) }
                composable(Destination.Notifications.route) { NotificationsScreen(notifications, model::refresh, loading) }
                composable(Destination.Profile.route) {
                    ProfileScreen(settings, notices.filter { it.bookmarked }, downloads, results.size, notices.count { it.isRead }, model, {
                        nav.navigate(Destination.Settings.route)
                    }, { nav.navigate(Destination.Logs.route) })
                }
                composable(Destination.Logs.route) { LogsScreen(logs, model::refresh, model::clearLogs, loading) }
                composable(Destination.Settings.route) { SettingsScreen(settings, githubState, loading, model) }
            }
        }
    }
}

@Composable
private fun SentinelBottomBar(nav: NavHostController) {
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    BottomAppBar(Modifier.navigationBarsPadding(), containerColor = MaterialTheme.colorScheme.surface) {
        Destination.entries.filter { it.primary }.forEach { destination ->
            NavigationBarItem(
                selected = route == destination.route,
                onClick = {
                    if (route != destination.route) nav.navigate(destination.route) {
                        popUpTo(Destination.Dashboard.route) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { Icon(destination.icon, destination.label) },
                label = { Text(destination.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primaryContainer),
            )
        }
    }
}

@Composable
private fun ConnectionBanner(connection: ConnectionState, status: BotStatus?) {
    val cached = status?.cachedAt?.takeIf { it > 0 }?.let { formatEpoch(it) }
    AnimatedVisibility(connection != ConnectionState.CONNECTED) {
        Surface(color = if (connection == ConnectionState.UNCONFIGURED) MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.errorContainer) {
            Text(
                text = if (connection == ConnectionState.UNCONFIGURED)
                    "Configure your HTTPS API URL and key in Settings."
                else "Offline — showing cached data${cached?.let { " from $it" } ?: ""}.",
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                style = MaterialTheme.typography.bodySmall,
                color = if (connection == ConnectionState.UNCONFIGURED) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onErrorContainer,
            )
        }
    }
}

@Composable
private fun DashboardScreen(
    status: BotStatus?,
    notices: List<Notice>,
    connection: ConnectionState,
    githubState: String,
    loading: Boolean,
    model: SentinelViewModel,
    nav: NavHostController,
) {
    val context = LocalContext.current
    LazyColumn(
        modifier = Modifier.fillMaxSize().testTag("dashboard_screen"),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                AsyncImage(
                    model = TU_LOGO_URL,
                    contentDescription = "Tribhuvan University emblem",
                    placeholder = painterResource(R.drawable.ic_tu_fallback),
                    error = painterResource(R.drawable.ic_tu_fallback),
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(66.dp).clip(CircleShape).background(Color.White).padding(5.dp),
                )
                Column(Modifier.weight(1f)) {
                    Text("TU SENTINEL PRO", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                    Text("Notices • results • backend control", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Unofficial student companion", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary)
                }
                if (loading) CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 3.dp)
            }
        }
        item {
            HeroStatus(status, connection)
        }
        item {
            SectionTitle("OVERVIEW")
            Spacer(Modifier.height(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Scanned", status?.noticesScanned?.toString() ?: "—", Modifier.weight(1f))
                    MetricCard("New", status?.newNotices?.toString() ?: "—", Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Emails", status?.emailsSent?.toString() ?: "—", Modifier.weight(1f))
                    MetricCard("Stored", status?.storedNotices?.toString() ?: "—", Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Version", status?.version ?: "—", Modifier.weight(1f))
                    MetricCard("Last run", status?.lastSuccessfulRun?.let(::formatTimeOnly) ?: "—", Modifier.weight(1f))
                }
            }
        }
        item {
            SectionTitle("QUICK ACTIONS")
            Spacer(Modifier.height(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    QuickButton("Check Now", Icons.Outlined.Refresh, loading, Modifier.weight(1f), model::checkNow)
                    QuickButton("Test Email", Icons.Outlined.Email, loading, Modifier.weight(1f), model::testEmail)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    QuickButton("Workflow", Icons.Outlined.PlayArrow, loading, Modifier.weight(1f), model::triggerBackendWorkflow)
                    QuickButton("Run Test", Icons.Outlined.Science, loading, Modifier.weight(1f), model::runBotTest)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    QuickButton("Enable Bot", Icons.Outlined.CheckCircle, loading, Modifier.weight(1f)) { model.setBotEnabled(true) }
                    QuickButton("Disable Bot", Icons.Outlined.DeleteOutline, loading, Modifier.weight(1f)) { model.setBotEnabled(false) }
                }
            }
        }
        item {
            SectionTitle("BOT STATUS")
            Spacer(Modifier.height(8.dp))
            OutlinedCard(Modifier.fillMaxWidth()) {
                StatusRow("Bot", status?.bot ?: "unknown")
                HorizontalDivider()
                StatusRow("TU website", status?.website ?: "unknown")
                HorizontalDivider()
                StatusRow("Scraper", status?.scraper ?: "unknown")
                HorizontalDivider()
                StatusRow("State", status?.state ?: "unknown")
                HorizontalDivider()
                StatusRow("Gmail", status?.gmail ?: "unknown")
                HorizontalDivider()
                StatusRow("GitHub Actions", githubState.takeUnless { it == "unknown" } ?: status?.github ?: "unknown")
            }
        }
        item {
            SectionTitle("OFFICIAL PORTALS")
            Spacer(Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { AssistChip(onClick = { openTrustedUrl(context, "https://tu.edu.np/") }, label = { Text("TU Home") }) }
                item { AssistChip(onClick = { openTrustedUrl(context, "https://exam.tu.edu.np/") }, label = { Text("Exam Office") }) }
                item { AssistChip(onClick = { openTrustedUrl(context, "https://exam.tu.edu.np/notices") }, label = { Text("Exam Notices") }) }
                item { AssistChip(onClick = { openTrustedUrl(context, "https://result.tuexam.edu.np/") }, label = { Text("Results") }) }
            }
        }
        item {
            SectionTitle("LAST NOTICE")
            Spacer(Modifier.height(8.dp))
            if (notices.isEmpty()) EmptyCard("No cached notices yet. Refresh after connecting the API.")
            else Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                notices.take(5).forEach { NoticeCard(it, model::markNoticeRead, model::toggleBookmark) }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { nav.navigate(Destination.Notices.route) }, modifier = Modifier.weight(1f)) { Text("All notices") }
                OutlinedButton(onClick = { nav.navigate(Destination.Logs.route) }, modifier = Modifier.weight(1f)) { Text("View logs") }
            }
        }
    }
}

@Composable
private fun HeroStatus(status: BotStatus?, connection: ConnectionState) {
    val state = when {
        connection != ConnectionState.CONNECTED -> StatusTone.UNKNOWN
        status?.configured != true -> StatusTone.UNKNOWN
        status?.bot.equals("disabled", ignoreCase = true) -> StatusTone.WARNING
        status?.online == true -> StatusTone.HEALTHY
        else -> StatusTone.ERROR
    }
    Card(
        colors = CardDefaults.cardColors(containerColor = when (state) {
            StatusTone.HEALTHY -> Color(0xFF0B5C47)
            StatusTone.WARNING -> Color(0xFF785800)
            StatusTone.ERROR -> Color(0xFF7D2A2A)
            StatusTone.UNKNOWN -> MaterialTheme.colorScheme.surfaceVariant
        }),
        modifier = Modifier.fillMaxWidth().animateContentSize(),
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusDot(state)
                Spacer(Modifier.width(10.dp))
                Text(
                    when (state) {
                        StatusTone.HEALTHY -> "BOT ONLINE"
                        StatusTone.WARNING -> "BOT DISABLED"
                        StatusTone.ERROR -> "BOT OFFLINE"
                        StatusTone.UNKNOWN -> "STATUS UNKNOWN"
                    },
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (state == StatusTone.UNKNOWN) MaterialTheme.colorScheme.onSurfaceVariant else Color.White,
                )
            }
            Spacer(Modifier.height(14.dp))
            Text("Last checked", color = if (state == StatusTone.UNKNOWN) MaterialTheme.colorScheme.onSurfaceVariant else Color.White.copy(alpha = .75f))
            Text(formatIso(status?.lastChecked), fontWeight = FontWeight.SemiBold, color = if (state == StatusTone.UNKNOWN) MaterialTheme.colorScheme.onSurface else Color.White)
            Spacer(Modifier.height(8.dp))
            Text("Last successful run: ${formatIso(status?.lastSuccessfulRun)}", style = MaterialTheme.typography.bodySmall, color = if (state == StatusTone.UNKNOWN) MaterialTheme.colorScheme.onSurfaceVariant else Color.White.copy(alpha = .85f))
            status?.lastFailedRun?.let {
                Text("Last failed run: ${formatIso(it)}", style = MaterialTheme.typography.bodySmall, color = if (state == StatusTone.UNKNOWN) MaterialTheme.colorScheme.error else Color(0xFFFFDAD6))
            }
            status?.lastError?.takeIf { it.isNotBlank() }?.let {
                Spacer(Modifier.height(10.dp))
                Text(it, color = if (state == StatusTone.UNKNOWN) MaterialTheme.colorScheme.error else Color(0xFFFFDAD6), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier) {
        Column(Modifier.padding(16.dp)) {
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun QuickButton(label: String, icon: ImageVector, loading: Boolean, modifier: Modifier, action: () -> Unit) {
    FilledTonalButton(onClick = action, enabled = !loading, modifier = modifier.height(52.dp)) {
        Icon(icon, null, Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Text(label)
    }
}

private enum class StatusTone { HEALTHY, WARNING, ERROR, UNKNOWN }

private fun tone(value: String): StatusTone = when (value.lowercase()) {
    "healthy", "online", "running", "reachable", "connected", "success", "enabled", "info", "accepted", "delivered" -> StatusTone.HEALTHY
    "warning", "warn", "running_action", "in_progress", "queued" -> StatusTone.WARNING
    "error", "offline", "failed", "unreachable", "disabled" -> StatusTone.ERROR
    else -> StatusTone.UNKNOWN
}

@Composable
private fun StatusRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
        StatusDot(tone(value))
        Spacer(Modifier.width(12.dp))
        Text(label, Modifier.weight(1f))
        Text(value.replaceFirstChar { it.uppercase() }, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun StatusDot(tone: StatusTone) {
    val color = when (tone) {
        StatusTone.HEALTHY -> Color(0xFF57DBA4)
        StatusTone.WARNING -> Color(0xFFFFC857)
        StatusTone.ERROR -> Color(0xFFFF6B6B)
        StatusTone.UNKNOWN -> Color(0xFF9AA9B8)
    }
    Surface(Modifier.size(10.dp), shape = CircleShape, color = color) {}
}

@Composable
private fun NoticesScreen(notices: List<Notice>, preferredFaculty: String, model: SentinelViewModel) {
    var query by rememberSaveable { mutableStateOf("") }
    var unreadOnly by rememberSaveable { mutableStateOf(false) }
    var bookmarkedOnly by rememberSaveable { mutableStateOf(false) }
    var category by rememberSaveable { mutableStateOf(preferredFaculty.takeIf { it in listOf("BSc CSIT", "BCA", "BBM", "BBS", "MBS", "Engineering", "Result", "Routine") } ?: "All") }
    val categories = listOf("All", "BSc CSIT", "BCA", "BBM", "BBS", "MBS", "Engineering", "Result", "Routine")
    val filtered = remember(notices, query, unreadOnly, bookmarkedOnly, category) {
        notices.filter {
            val title = it.title.lowercase()
            val categoryMatch = category == "All" || when (category) {
                "BSc CSIT" -> "csit" in title || "computer science" in title
                "Engineering" -> "engineering" in title || "ioe" in title
                else -> category.lowercase() in title
            }
            it.title.contains(query, ignoreCase = true) && categoryMatch && (!unreadOnly || !it.isRead) && (!bookmarkedOnly || it.bookmarked)
        }
    }
    Column(Modifier.fillMaxSize().testTag("notices_screen")) {
        ScreenHeader("Notices", "${filtered.size} of ${notices.size} cached")
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            label = { Text("Search notices") },
            leadingIcon = { Icon(Icons.Outlined.Search, null) },
            singleLine = true,
        )
        Row(Modifier.padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Switch(unreadOnly, { unreadOnly = it })
            Spacer(Modifier.width(10.dp))
            Text("Unread only")
            Spacer(Modifier.width(16.dp))
            AssistChip(onClick = { bookmarkedOnly = !bookmarkedOnly }, label = { Text(if (bookmarkedOnly) "★ Saved" else "☆ Saved") })
        }
        LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(categories) { option -> AssistChip(onClick = { category = option }, label = { Text(option) }, leadingIcon = if (category == option) ({ Icon(Icons.Outlined.CheckCircle, null, Modifier.size(16.dp)) }) else null) }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = model::markAllNoticesRead, modifier = Modifier.weight(1f)) { Text("Mark all read") }
            OutlinedButton(onClick = model::clearReadNotices, modifier = Modifier.weight(1f)) { Text("Clear read") }
        }
        if (filtered.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No matching notices") }
        else LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(filtered, key = Notice::id) { NoticeCard(it, model::markNoticeRead, model::toggleBookmark) }
        }
    }
}

private fun personalizedNotices(notices: List<Notice>, faculty: String): List<Notice> {
    if (faculty.isBlank() || faculty == "All faculties") return notices
    val terms = faculty.lowercase().split(Regex("[^a-z0-9]+" )).filter { it.length >= 3 }
    val matched = notices.filter { notice -> terms.any { it in notice.title.lowercase() } }
    return matched.ifEmpty { notices }
}

@Composable
private fun NoticeCard(notice: Notice, markRead: (String) -> Unit, toggleBookmark: (String) -> Unit) {
    val context = LocalContext.current
    OutlinedCard(
        Modifier.fillMaxWidth(),
        border = BorderStroke(if (notice.isNew && !notice.isRead) 2.dp else 1.dp, if (notice.isNew && !notice.isRead) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Icon(Icons.Outlined.Article, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(10.dp))
                Text(notice.title, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                IconButton(onClick = { toggleBookmark(notice.id) }) {
                    Icon(if (notice.bookmarked) Icons.Outlined.Star else Icons.Outlined.StarBorder, "Bookmark", tint = if (notice.bookmarked) Color(0xFFFFB300) else MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (notice.isNew && !notice.isRead) AssistChip(onClick = {}, label = { Text("NEW") })
            }
            Spacer(Modifier.height(12.dp))
            DateLine("BS", notice.bsDate ?: "Not provided")
            DateLine("AD", notice.adDate ?: "Not provided")
            Text("Notice ID: ${notice.id}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            notice.originalDate?.takeIf { notice.bsDate == null && notice.adDate == null }?.let {
                Text("Original date: $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(12.dp))
            Button(onClick = {
                markRead(notice.id)
                openTrustedUrl(context, notice.url)
            }) {
                Text("Open notice")
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Outlined.OpenInNew, null, Modifier.size(18.dp))
            }
        }
    }
}

internal fun openTrustedUrl(context: android.content.Context, url: String) {
    val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
    if (uri.scheme != "https" || uri.host.isNullOrBlank()) return
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
}

@Composable
private fun DateLine(label: String, value: String) {
    Row(Modifier.padding(bottom = 4.dp)) {
        Text("$label:", Modifier.width(42.dp), fontWeight = FontWeight.SemiBold)
        Text(value)
    }
}

@Composable
private fun NotificationsScreen(records: List<NotificationRecord>, refresh: () -> Unit, loading: Boolean) {
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Alerts", "Device alerts and email delivery history", refresh, loading)
        if (records.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No notification history cached") }
        else LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(records, key = NotificationRecord::id) { record ->
                OutlinedCard(Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
                        Icon(if (record.type == "push") Icons.Outlined.Notifications else Icons.Outlined.Email, null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(record.summary, fontWeight = FontWeight.Bold)
                            Text("${record.noticeCount} new notice${if (record.noticeCount == 1) "" else "s"}")
                            Text(formatIso(record.timestamp), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                            Text("Recipient: ${record.recipient}", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                        }
                        StatusDot(tone(record.status))
                    }
                }
            }
        }
    }
}

@Composable
private fun LogsScreen(logs: List<LogEntry>, refresh: () -> Unit, clear: () -> Unit, loading: Boolean) {
    var level by rememberSaveable { mutableStateOf("ALL") }
    val shown = remember(logs, level) { logs.filter { level == "ALL" || it.level == level } }
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Logs", "Latest 500 server events", refresh, loading)
        Row(Modifier.padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            listOf("ALL", "INFO", "WARN", "ERROR").forEach { option ->
                AssistChip(
                    onClick = { level = option },
                    label = { Text(option) },
                    leadingIcon = if (level == option) ({ Icon(Icons.Outlined.CheckCircle, null, Modifier.size(16.dp)) }) else null,
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), horizontalArrangement = Arrangement.End) {
            OutlinedButton(onClick = clear, enabled = !loading) { Icon(Icons.Outlined.DeleteOutline, null); Spacer(Modifier.width(6.dp)); Text("Clear") }
        }
        if (shown.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No $level logs cached") }
        else LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(shown, key = LogEntry::id) { entry ->
                OutlinedCard(Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                        StatusDot(tone(entry.level))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Row {
                                Text(entry.level, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                                Spacer(Modifier.weight(1f))
                                Text(formatIso(entry.timestamp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(entry.message)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(settings: AppSettings, githubState: String, loading: Boolean, model: SentinelViewModel) {
    var baseUrl by rememberSaveable { mutableStateOf(settings.baseUrl) }
    var apiKey by rememberSaveable { mutableStateOf(settings.apiKey) }
    var darkMode by rememberSaveable { mutableStateOf(settings.darkMode) }
    var apiVisible by rememberSaveable { mutableStateOf(false) }
    var pin by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(settings) {
        baseUrl = settings.baseUrl
        apiKey = settings.apiKey
        darkMode = settings.darkMode
    }

    val current = settings.copy(
        baseUrl = baseUrl,
        apiKey = apiKey,
        darkMode = darkMode,
    )

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp).testTag("settings_screen")) {
        ScreenHeader("Settings", "Secrets are encrypted with Android Keystore")
        SettingsCard("Sentinel server", Icons.Outlined.Sync) {
            SecureField("HTTPS API URL", baseUrl, { baseUrl = it }, false, true)
            SecureField("API secret", apiKey, { apiKey = it }, !apiVisible, false) { apiVisible = !apiVisible }
            Text("The API secret is exchanged for a short-lived session token. It is never included in the app source.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        SettingsCard("Backend automation", Icons.Outlined.PlayArrow) {
            Text("Gmail and GitHub credentials stay on the v3.3 backend. This app never asks for them.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.CenterVertically) { Text("Latest: ", fontWeight = FontWeight.SemiBold); StatusDot(tone(githubState)); Spacer(Modifier.width(6.dp)); Text(githubState) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = model::triggerBackendWorkflow, enabled = !loading) { Text("Run workflow") }
                OutlinedButton(onClick = model::testEmail, enabled = !loading) { Text("Test email") }
            }
        }
        SettingsCard("Security & appearance", Icons.Outlined.Lock) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.DarkMode, null)
                Spacer(Modifier.width(10.dp))
                Text("Dark mode", Modifier.weight(1f))
                Switch(darkMode, { darkMode = it })
            }
            if (!settings.appLockEnabled) {
                SecureField("New 4–8 digit PIN", pin, { pin = it.filter(Char::isDigit).take(8) }, true, false)
                OutlinedButton(onClick = { model.enablePin(pin); pin = "" }, enabled = pin.length in 4..8) {
                    Icon(Icons.Outlined.Lock, null); Spacer(Modifier.width(6.dp)); Text("Enable app lock")
                }
            } else {
                Text("PIN lock is enabled. The app locks again when restarted.")
                OutlinedButton(onClick = model::disablePin) { Icon(Icons.Outlined.LockOpen, null); Spacer(Modifier.width(6.dp)); Text("Disable app lock") }
            }
        }
        Button(onClick = { model.saveSettings(current) }, modifier = Modifier.fillMaxWidth().height(52.dp), enabled = !loading) {
            if (loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Save settings")
        }
        Spacer(Modifier.height(14.dp))
        Text(
            "TU Sentinel Pro is an independent student companion and is not affiliated with or endorsed by Tribhuvan University. The emblem is loaded from the official TU portal; university pages always open at their official HTTPS addresses.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SettingsCard(title: String, icon: ImageVector, content: @Composable ColumnScope.() -> Unit) {
    OutlinedCard(Modifier.fillMaxWidth().padding(bottom = 14.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(10.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            content()
        }
    }
}

@Composable
private fun SecureField(
    label: String,
    value: String,
    change: (String) -> Unit,
    password: Boolean,
    urlKeyboard: Boolean,
    toggleVisibility: (() -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = change,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = if (urlKeyboard) KeyboardType.Uri else if (password) KeyboardType.Password else KeyboardType.Text),
        trailingIcon = toggleVisibility?.let { toggle ->
            { IconButton(onClick = toggle) { Icon(if (password) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff, null) } }
        },
    )
}

@Composable
fun LockScreen(model: SentinelViewModel) {
    var pin by rememberSaveable { mutableStateOf("") }
    val message by model.message.collectAsStateWithLifecycle()
    Column(
        Modifier.fillMaxSize().statusBarsPadding().padding(28.dp).testTag("lock_screen"),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Surface(Modifier.size(72.dp), shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
            Box(contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Lock, null, Modifier.size(34.dp), tint = MaterialTheme.colorScheme.primary) }
        }
        Spacer(Modifier.height(20.dp))
        Text("TU Sentinel Pro", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
        Text("Enter your PIN to open the private dashboard", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = pin,
            onValueChange = { pin = it.filter(Char::isDigit).take(8) },
            label = { Text("PIN") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true,
        )
        message?.takeIf { !it.success }?.let { Text(it.text, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp)) }
        Button(onClick = { model.unlock(pin) }, modifier = Modifier.padding(top = 16.dp).fillMaxWidth(), enabled = pin.length >= 4) { Text("Unlock") }
    }
}

@Composable
private fun ScreenHeader(title: String, subtitle: String, refresh: (() -> Unit)? = null, loading: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(bottom = 18.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        refresh?.let { IconButton(onClick = it, enabled = !loading) { Icon(Icons.Outlined.Refresh, "Refresh") } }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(title, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
}

@Composable
private fun EmptyCard(message: String) {
    OutlinedCard(Modifier.fillMaxWidth()) { Text(message, Modifier.padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
}

private fun formatIso(value: String?): String {
    if (value.isNullOrBlank()) return "Not available"
    return runCatching {
        val instant = Instant.parse(value)
        val zone = ZoneId.of("Asia/Kathmandu")
        val minutes = Duration.between(instant, Instant.now()).toMinutes()
        when {
            minutes in 0..1 -> "Just now"
            minutes in 2..59 -> "$minutes minutes ago"
            instant.atZone(zone).toLocalDate() == LocalDate.now(zone) ->
                "Today at ${DateTimeFormatter.ofPattern("h:mm a").format(instant.atZone(zone))} NST"
            else -> DateTimeFormatter.ofPattern("MMM d, yyyy — h:mm a 'NST'").withZone(zone).format(instant)
        }
    }.getOrDefault(value)
}

private fun formatEpoch(value: Long): String = DateTimeFormatter.ofPattern("MMM d, h:mm a")
    .withZone(ZoneId.of("Asia/Kathmandu"))
    .format(Instant.ofEpochMilli(value))

private fun formatTimeOnly(value: String): String = runCatching {
    DateTimeFormatter.ofPattern("h:mm a 'NST'").withZone(ZoneId.of("Asia/Kathmandu")).format(Instant.parse(value))
}.getOrDefault("—")
