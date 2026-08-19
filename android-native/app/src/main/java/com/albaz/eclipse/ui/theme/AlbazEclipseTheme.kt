package com.albaz.eclipse.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val EclipseDark = darkColorScheme(
    primary = Color(0xFF5BE4F4),
    onPrimary = Color(0xFF001F25),
    secondary = Color(0xFFFFC56B),
    tertiary = Color(0xFF77D6A5),
    background = Color(0xFF02070B),
    onBackground = Color(0xFFF1F7FA),
    surface = Color(0xFF07131A),
    onSurface = Color(0xFFEAF3F7),
    surfaceVariant = Color(0xFF0D202A),
    onSurfaceVariant = Color(0xFFB7C9D1),
    outline = Color(0xFF2A5261),
    error = Color(0xFFFF7B82)
)

@Composable
fun AlbazEclipseTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = EclipseDark, content = content)
}
