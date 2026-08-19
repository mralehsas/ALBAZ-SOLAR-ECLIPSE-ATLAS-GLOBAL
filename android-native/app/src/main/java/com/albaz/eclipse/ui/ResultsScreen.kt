package com.albaz.eclipse.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.albaz.eclipse.core.model.LocalEclipseType
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val ContactFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")

@Composable
fun ResultsScreen(state: EclipseUiState, contentPadding: PaddingValues) {
    val t = uiText(state.language)
    val result = state.result
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(
            start = 18.dp,
            end = 18.dp,
            top = contentPadding.calculateTopPadding() + 18.dp,
            bottom = contentPadding.calculateBottomPadding() + 22.dp
        ),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(t.results, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("LOCAL CIRCUMSTANCES • UTC", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
        }
        if (result == null) {
            item { Text(t.noResult, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            return@LazyColumn
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    MetricRow(t.localType, localTypeLabel(result.localType, t))
                    MetricRow(t.magnitude, "%.9f".format(result.magnitude))
                    MetricRow(t.obscuration, "%.6f %%".format(result.obscuration * 100.0))
                    MetricRow(t.sunAltitude, "%.3f°".format(result.sunAltitudeDeg))
                    MetricRow(t.sunAzimuth, "%.3f°".format(result.sunAzimuthDeg))
                    HorizontalDivider()
                    MetricRow(t.solver, result.solver)
                    MetricRow("Calendar", result.calendarSystem.name)
                }
            }
        }
        item {
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Text(t.contacts, fontWeight = FontWeight.Bold)
                    ContactRow("C1", result.c1Utc)
                    ContactRow("C2", result.c2Utc)
                    ContactRow("MAX", result.maximumUtc)
                    ContactRow("C3", result.c3Utc)
                    ContactRow("C4", result.c4Utc)
                }
            }
        }
    }
}

@Composable
private fun MetricRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ContactRow(label: String, time: LocalDateTime?) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        Text(time?.format(ContactFormat) ?: "—")
    }
}

private fun localTypeLabel(type: LocalEclipseType, t: UiText): String = when (type) {
    LocalEclipseType.TOTAL -> t.total
    LocalEclipseType.ANNULAR -> t.annular
    LocalEclipseType.PARTIAL -> t.partial
    LocalEclipseType.NONE -> t.none
}
