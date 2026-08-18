@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.sudyp.tunoticesentinel.ui

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Terminal
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.sudyp.tunoticesentinel.data.Notice
import com.sudyp.tunoticesentinel.data.local.DownloadEntity
import com.sudyp.tunoticesentinel.data.local.ResultEntity
import com.sudyp.tunoticesentinel.security.AppSettings
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private const val RESULT_URL = "https://result.tuexam.edu.np/"

private fun isTrustedResultUri(uri: Uri): Boolean {
    val host = uri.host?.lowercase().orEmpty()
    return uri.scheme == "https" && (host == "tuexam.edu.np" || host.endsWith(".tuexam.edu.np"))
}

@Composable
fun ResultsScreen(settings: AppSettings, results: List<ResultEntity>, model: SentinelViewModel) {
    var page by rememberSaveable { mutableStateOf("portal") }
    var symbol by rememberSaveable { mutableStateOf(settings.symbolNumber) }
    var dob by rememberSaveable { mutableStateOf(settings.dateOfBirth) }
    var webView by remember { mutableStateOf<WebView?>(null) }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AssistChip(onClick = { page = "portal" }, label = { Text("TU Result Portal") })
            AssistChip(onClick = { page = "archive" }, label = { Text("My Archive (${results.size})") })
        }
        if (page == "portal") {
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(symbol, { symbol = it }, Modifier.weight(1f), label = { Text("Symbol number") }, singleLine = true)
                    OutlinedTextField(dob, { dob = it }, Modifier.weight(1f), label = { Text("DOB") }, singleLine = true)
                }
                Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { model.saveSettings(settings.copy(symbolNumber = symbol, dateOfBirth = dob)) }) { Text("Save privately") }
                    Button(onClick = { autofillResultPortal(webView, symbol, dob) }) { Text("Autofill") }
                }
                ResultWebView(Modifier.weight(1f), model) { webView = it }
            }
        } else ResultArchive(results, settings.symbolNumber, model)
    }
}

private fun autofillResultPortal(webView: WebView?, symbol: String, dob: String) {
    val safeSymbol = JSONObject.quote(symbol)
    val safeDob = JSONObject.quote(dob)
    webView?.evaluateJavascript(
        """(function(){
          const inputs=[...document.querySelectorAll('input')];
          const symbol=inputs.find(i=>/symbol|roll/i.test((i.name||'')+' '+(i.id||'')+' '+(i.placeholder||'')));
          const dob=inputs.find(i=>/dob|birth|date/i.test((i.name||'')+' '+(i.id||'')+' '+(i.placeholder||'')));
          const set=(e,v)=>{if(!e)return;e.focus();e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
          set(symbol,$safeSymbol); set(dob,$safeDob);
        })();""".trimIndent(),
        null,
    )
}

@Composable
private fun ResultWebView(modifier: Modifier, model: SentinelViewModel, ready: (WebView) -> Unit) {
    val context = LocalContext.current
    var current by remember { mutableStateOf<WebView?>(null) }
    BackHandler(enabled = current?.canGoBack() == true) { current?.goBack() }
    AndroidView(
        modifier = modifier.fillMaxWidth(),
        factory = {
            WebView(it).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.loadsImagesAutomatically = true
                settings.builtInZoomControls = true
                settings.displayZoomControls = false
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                settings.safeBrowsingEnabled = true
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, false)
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        val uri = request.url
                        if (isTrustedResultUri(uri)) return false
                        if (uri.scheme == "https") runCatching {
                            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                        }
                        return true
                    }
                }
                webChromeClient = WebChromeClient()
                setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
                    val downloadUri = Uri.parse(url)
                    if (!isTrustedResultUri(downloadUri)) return@setDownloadListener
                    val filename = URLUtil.guessFileName(url, contentDisposition, mimeType)
                    val request = DownloadManager.Request(downloadUri)
                        .setMimeType(mimeType)
                        .addRequestHeader("User-Agent", userAgent)
                        .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url).orEmpty())
                        .setTitle(filename)
                        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
                    runCatching {
                        (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                        model.recordDownload(filename, url)
                    }
                }
                loadUrl(RESULT_URL)
                current = this
                ready(this)
            }
        },
        update = { current = it; ready(it) },
    )
    DisposableEffect(Unit) { onDispose { current?.stopLoading() } }
}

@Composable
private fun ResultArchive(results: List<ResultEntity>, defaultSymbol: String, model: SentinelViewModel) {
    var program by rememberSaveable { mutableStateOf("") }
    var semester by rememberSaveable { mutableStateOf("") }
    var symbol by rememberSaveable { mutableStateOf(defaultSymbol) }
    var result by rememberSaveable { mutableStateOf("") }
    var grade by rememberSaveable { mutableStateOf("") }
    var notes by rememberSaveable { mutableStateOf("") }
    val gradeValues = results.mapNotNull { it.grade.toDoubleOrNull() }
    val cgpa = gradeValues.takeIf { it.isNotEmpty() }?.average()
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Personal Result Archive", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Stored only on this device. Average GPA: ${cgpa?.let { "%.2f".format(it) } ?: "—"}")
        }
        item {
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(program, { program = it }, Modifier.fillMaxWidth(), label = { Text("Program") })
                    OutlinedTextField(semester, { semester = it }, Modifier.fillMaxWidth(), label = { Text("Semester/year") })
                    OutlinedTextField(symbol, { symbol = it }, Modifier.fillMaxWidth(), label = { Text("Symbol number") })
                    OutlinedTextField(result, { result = it }, Modifier.fillMaxWidth(), label = { Text("Result") })
                    OutlinedTextField(grade, { grade = it }, Modifier.fillMaxWidth(), label = { Text("GPA/grade") })
                    OutlinedTextField(notes, { notes = it }, Modifier.fillMaxWidth(), label = { Text("Notes") })
                    Button(onClick = {
                        model.saveResult(program, semester, symbol, result, grade, notes)
                        result = ""; grade = ""; notes = ""
                    }) { Icon(Icons.Outlined.Save, null); Spacer(Modifier.width(6.dp)); Text("Save result") }
                }
            }
        }
        items(results, key = ResultEntity::id) { entry ->
            OutlinedCard(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f)) {
                        Text("${entry.program} • ${entry.semester}", fontWeight = FontWeight.Bold)
                        Text("${entry.result}${entry.grade.takeIf { it.isNotBlank() }?.let { " • $it" }.orEmpty()}")
                        Text("Symbol: ${entry.symbolNumber}", style = MaterialTheme.typography.bodySmall)
                        if (entry.notes.isNotBlank()) Text(entry.notes, style = MaterialTheme.typography.bodySmall)
                        Text(formatLocalTime(entry.savedAt), style = MaterialTheme.typography.labelSmall)
                    }
                    IconButton(onClick = { model.deleteResult(entry.id) }) { Icon(Icons.Outlined.DeleteOutline, "Delete") }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(
    settings: AppSettings,
    bookmarks: List<Notice>,
    downloads: List<DownloadEntity>,
    resultsCount: Int,
    readCount: Int,
    model: SentinelViewModel,
    openSettings: () -> Unit,
    openLogs: () -> Unit,
) {
    var name by rememberSaveable { mutableStateOf(settings.profileName) }
    var faculty by rememberSaveable { mutableStateOf(settings.faculty) }
    var batch by rememberSaveable { mutableStateOf(settings.batch) }
    var backgroundAlerts by rememberSaveable { mutableStateOf(settings.backgroundAlerts) }
    LaunchedEffect(settings) {
        name = settings.profileName; faculty = settings.faculty; batch = settings.batch; backgroundAlerts = settings.backgroundAlerts
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text("Profile Dashboard", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("All personal information remains on this device.")
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProfileMetric("Results", resultsCount.toString(), Modifier.weight(1f))
                ProfileMetric("Bookmarks", bookmarks.size.toString(), Modifier.weight(1f))
                ProfileMetric("Read", readCount.toString(), Modifier.weight(1f))
            }
        }
        item {
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("Name") })
                    OutlinedTextField(faculty, { faculty = it }, Modifier.fillMaxWidth(), label = { Text("Faculty/program filter") })
                    OutlinedTextField(batch, { batch = it }, Modifier.fillMaxWidth(), label = { Text("Batch/year") })
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Background notice alerts", Modifier.weight(1f))
                        Switch(backgroundAlerts, { backgroundAlerts = it })
                    }
                    Button(onClick = { model.saveSettings(settings.copy(profileName = name, faculty = faculty, batch = batch, backgroundAlerts = backgroundAlerts)) }) { Text("Save profile") }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(openSettings, Modifier.weight(1f)) { Icon(Icons.Outlined.Settings, null); Spacer(Modifier.width(5.dp)); Text("Settings") }
                OutlinedButton(openLogs, Modifier.weight(1f)) { Icon(Icons.Outlined.Terminal, null); Spacer(Modifier.width(5.dp)); Text("Logs") }
            }
        }
        item { Text("Bookmarked notices (${bookmarks.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        if (bookmarks.isEmpty()) item { Text("No bookmarked notices yet.") }
        items(bookmarks.take(10), key = Notice::id) { notice ->
            val context = LocalContext.current
            OutlinedCard(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(notice.title, Modifier.weight(1f), maxLines = 2)
                    IconButton(onClick = { openTrustedUrl(context, notice.url) }) { Icon(Icons.Outlined.OpenInNew, "Open") }
                }
            }
        }
        item { Text("Download history (${downloads.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        items(downloads.take(20), key = DownloadEntity::id) { download ->
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Download, null)
                Spacer(Modifier.width(10.dp))
                Column { Text(download.title); Text(formatLocalTime(download.downloadedAt), style = MaterialTheme.typography.labelSmall) }
            }
        }
    }
}

@Composable
private fun ProfileMetric(label: String, value: String, modifier: Modifier) {
    Card(modifier) { Column(Modifier.padding(12.dp)) { Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text(label, style = MaterialTheme.typography.labelSmall) } }
}

private fun formatLocalTime(epoch: Long): String = DateTimeFormatter.ofPattern("MMM d, yyyy • h:mm a 'NST'")
    .withZone(ZoneId.of("Asia/Kathmandu"))
    .format(Instant.ofEpochMilli(epoch))

private fun openTrustedUrl(context: Context, url: String) {
    val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
    if (uri.scheme != "https" && uri.scheme != "http") return
    context.startActivity(Intent(Intent.ACTION_VIEW, uri))
}
