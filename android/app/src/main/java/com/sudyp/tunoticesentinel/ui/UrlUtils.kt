package com.sudyp.tunoticesentinel.ui

import android.content.Context
import android.content.Intent
import android.net.Uri

internal fun openTrustedUrl(context: Context, url: String) {
    val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
    if (uri.scheme != "https" || uri.host.isNullOrBlank()) return
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
}
