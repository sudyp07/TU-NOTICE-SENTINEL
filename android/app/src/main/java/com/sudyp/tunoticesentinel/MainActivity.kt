package com.sudyp.tunoticesentinel

import android.os.Bundle
import android.Manifest
import android.content.pm.PackageManager
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sudyp.tunoticesentinel.ui.LockScreen
import com.sudyp.tunoticesentinel.ui.SentinelApp
import com.sudyp.tunoticesentinel.ui.SentinelViewModel
import com.sudyp.tunoticesentinel.ui.theme.SentinelTheme

class MainActivity : ComponentActivity() {
    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }
    private val storagePermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        if (android.os.Build.VERSION.SDK_INT <= 28 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
        ) storagePermission.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        setContent {
            val model: SentinelViewModel = viewModel()
            val settings by model.settings.collectAsStateWithLifecycle()
            val locked by model.locked.collectAsStateWithLifecycle()
            SentinelTheme(settings.darkMode) {
                if (locked) LockScreen(model) else SentinelApp(model)
            }
        }
    }
}
