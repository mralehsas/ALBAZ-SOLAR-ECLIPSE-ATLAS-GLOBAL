package com.albaz.eclipse.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Calculate
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

enum class NativeScreen { HOME, RESULTS }

@Composable
fun EclipseApp(viewModel: EclipseViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var screen by remember { mutableStateOf(NativeScreen.HOME) }
    val text = uiText(state.language)
    val direction = if (state.language == AppLanguage.AR) LayoutDirection.Rtl else LayoutDirection.Ltr

    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        Scaffold(
            bottomBar = {
                NavigationBar {
                    NavigationBarItem(
                        selected = screen == NativeScreen.HOME,
                        onClick = { screen = NativeScreen.HOME },
                        icon = { Icon(Icons.Outlined.Calculate, contentDescription = null) },
                        label = { Text(text.home) }
                    )
                    NavigationBarItem(
                        selected = screen == NativeScreen.RESULTS,
                        onClick = { screen = NativeScreen.RESULTS },
                        icon = { Icon(Icons.Outlined.Insights, contentDescription = null) },
                        label = { Text(text.results) }
                    )
                }
            }
        ) { padding ->
            Box(Modifier.fillMaxSize()) {
                when (screen) {
                    NativeScreen.HOME -> HomeScreen(
                        state = state,
                        contentPadding = padding,
                        onLanguage = viewModel::setLanguage,
                        onYearChange = viewModel::setYearText,
                        onSearchYear = viewModel::searchYear,
                        onEventSelected = viewModel::selectEvent,
                        onLatitude = viewModel::setLatitude,
                        onLongitude = viewModel::setLongitude,
                        onAltitude = viewModel::setAltitude,
                        onMadrid = viewModel::useMadrid,
                        onMosul = viewModel::useMosul,
                        onBaghdad = viewModel::useBaghdad,
                        onCalculate = viewModel::calculate,
                        onOpenResults = { screen = NativeScreen.RESULTS }
                    )
                    NativeScreen.RESULTS -> ResultsScreen(state = state, contentPadding = padding)
                }
            }
        }
    }
}
