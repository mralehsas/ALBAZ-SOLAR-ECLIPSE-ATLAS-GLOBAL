package com.albaz.eclipseatlas.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun HomeScreen(
    state: HomeUiState,
    labels: HomeLabels,
    isArabic: Boolean,
    onLanguageChange: () -> Unit,
    onYearChange: (String) -> Unit,
    onMonthChange: (String) -> Unit,
    onDayChange: (String) -> Unit,
    onLatitudeChange: (String) -> Unit,
    onLongitudeChange: (String) -> Unit,
    onElevationChange: (String) -> Unit,
    onCalculate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
    ) { contentPadding ->
        Column(
            modifier = Modifier
                .padding(contentPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = labels.appTitle,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = labels.appSubtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = labels.scientificCore,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                LanguageButton(
                    text = labels.arabic,
                    selected = isArabic,
                    onClick = { if (!isArabic) onLanguageChange() },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("home.language.ar"),
                )
                LanguageButton(
                    text = labels.english,
                    selected = !isArabic,
                    onClick = { if (isArabic) onLanguageChange() },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("home.language.en"),
                )
            }

            InputCard(title = labels.dateSection) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = state.year,
                        onValueChange = onYearChange,
                        label = { Text(labels.year) },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1.25f)
                            .testTag("home.date.year"),
                    )
                    OutlinedTextField(
                        value = state.month,
                        onValueChange = onMonthChange,
                        label = { Text(labels.month) },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home.date.month"),
                    )
                    OutlinedTextField(
                        value = state.day,
                        onValueChange = onDayChange,
                        label = { Text(labels.day) },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home.date.day"),
                    )
                }
            }

            InputCard(title = labels.locationSection) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = state.latitude,
                        onValueChange = onLatitudeChange,
                        label = { Text(labels.latitude) },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home.location.latitude"),
                    )
                    OutlinedTextField(
                        value = state.longitude,
                        onValueChange = onLongitudeChange,
                        label = { Text(labels.longitude) },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home.location.longitude"),
                    )
                }
                OutlinedTextField(
                    value = state.elevation,
                    onValueChange = onElevationChange,
                    label = { Text("${labels.elevation} (${labels.meters})") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("home.location.elevation"),
                )
            }

            if (!state.isInputValid) {
                Text(
                    text = labels.invalidInput,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            state.error?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Button(
                onClick = onCalculate,
                enabled = state.isInputValid && !state.calculating,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .testTag("home.calculate"),
            ) {
                if (state.calculating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                    )
                    Spacer(Modifier.size(10.dp))
                    Text(labels.calculating)
                } else {
                    Text(
                        text = labels.calculate,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            HorizontalDivider()
            Text(
                text = labels.rangeNote,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun InputCard(
    title: String,
    content: @Composable Column.() -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            content()
        }
    }
}

@Composable
private fun LanguageButton(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (selected) {
        Button(onClick = onClick, modifier = modifier) {
            Text(text)
        }
    } else {
        OutlinedButton(onClick = onClick, modifier = modifier) {
            Text(text)
        }
    }
}

data class HomeLabels(
    val appTitle: String,
    val appSubtitle: String,
    val scientificCore: String,
    val dateSection: String,
    val locationSection: String,
    val year: String,
    val month: String,
    val day: String,
    val latitude: String,
    val longitude: String,
    val elevation: String,
    val meters: String,
    val calculate: String,
    val calculating: String,
    val arabic: String,
    val english: String,
    val invalidInput: String,
    val rangeNote: String,
) {
    companion object {
        fun english(): HomeLabels = HomeLabels(
            appTitle = "ALBAZ Solar Eclipse Atlas",
            appSubtitle = "Native Scientific Edition",
            scientificCore = "Besselian / WGS84 • Offline scientific core",
            dateSection = "Eclipse date",
            locationSection = "Observer location",
            year = "Year",
            month = "Month",
            day = "Day",
            latitude = "Latitude",
            longitude = "Longitude",
            elevation = "Elevation",
            meters = "m",
            calculate = "Calculate eclipse",
            calculating = "Calculating…",
            arabic = "العربية",
            english = "English",
            invalidInput = "Check the date and observer coordinates.",
            rangeNote = "Audited eclipse catalog: 1550–2650",
        )

        fun arabic(): HomeLabels = HomeLabels(
            appTitle = "أطلس الباز للكسوف الشمسي",
            appSubtitle = "النسخة العلمية الأصلية لأندرويد",
            scientificCore = "Besselian / WGS84 • نواة علمية تعمل دون إنترنت",
            dateSection = "تاريخ الكسوف",
            locationSection = "موقع الراصد",
            year = "السنة",
            month = "الشهر",
            day = "اليوم",
            latitude = "خط العرض",
            longitude = "خط الطول",
            elevation = "الارتفاع",
            meters = "م",
            calculate = "احسب الكسوف",
            calculating = "جارٍ الحساب…",
            arabic = "العربية",
            english = "English",
            invalidInput = "تحقق من التاريخ وإحداثيات موقع الراصد.",
            rangeNote = "نطاق كتالوج الكسوف المدقق: 1550–2650",
        )
    }
}
