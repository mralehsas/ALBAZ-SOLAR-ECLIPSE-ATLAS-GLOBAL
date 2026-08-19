package com.albaz.eclipse

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.albaz.eclipse.ui.EclipseApp
import com.albaz.eclipse.ui.theme.AlbazEclipseTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AlbazEclipseTheme {
                EclipseApp()
            }
        }
    }
}
