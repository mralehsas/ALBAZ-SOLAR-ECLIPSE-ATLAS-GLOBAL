package com.albaz.eclipse.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.albaz.eclipse.core.model.GlobalEclipseType

@Composable
fun HomeScreen(
    state: EclipseUiState,
    contentPadding: PaddingValues,
    onLanguage: (AppLanguage) -> Unit,
    onYearChange: (String) -> Unit,
    onSearchYear: () -> Unit,
    onEventSelected: (Int) -> Unit,
    onLatitude: (String) -> Unit,
    onLongitude: (String) -> Unit,
    onAltitude: (String) -> Unit,
    onMadrid: () -> Unit,
    onMosul: () -> Unit,
    onBaghdad: () -> Unit,
    onCalculate: () -> Unit,
    onOpenResults: () -> Unit
) {
    val t = uiText(state.language)
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(
            start = 18.dp,
            end = 18.dp,
            top = contentPadding.calculateTopPadding() + 14.dp,
            bottom = contentPadding.calculateBottomPadding() + 22.dp
        ),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text("ALBAZ ASTROTECH", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    Text(t.atlas, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(t.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilterChip(selected = state.language == AppLanguage.AR, onClick = { onLanguage(AppLanguage.AR) }, label = { Text("AR") })
                    FilterChip(selected = state.language == AppLanguage.EN, onClick = { onLanguage(AppLanguage.EN) }, label = { Text("EN") })
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(t.engine, fontWeight = FontWeight.Bold)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Besselian Local Core")
                        Text(t.ready, color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Bold)
                    }
                    HorizontalDivider()
                    Text(t.de440Missing, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
                    Text(t.de440Note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "${t.catalogue}: " + if (state.hasFullCatalogue) t.fullCatalogue else t.fixtureCatalogue,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        item {
            OutlinedCard(border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(t.event, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = state.yearText,
                            onValueChange = onYearChange,
                            label = { Text(t.year) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        Button(onClick = onSearchYear, modifier = Modifier.padding(top = 8.dp)) { Text(t.search) }
                    }
                    if (state.loadingCatalogue) {
                        Text("…", color = MaterialTheme.colorScheme.primary)
                    } else if (state.yearEvents.isEmpty()) {
                        Text(t.noEvents, color = MaterialTheme.colorScheme.error)
                    } else {
                        state.yearEvents.forEachIndexed { index, event ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Row {
                                    RadioButton(selected = index == state.selectedEventIndex, onClick = { onEventSelected(index) })
                                    Column(Modifier.padding(top = 8.dp)) {
                                        Text("%04d-%02d-%02d".format(event.year, event.month, event.day), fontWeight = FontWeight.SemiBold)
                                        Text(globalTypeLabel(event.globalType, t), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Text("%.5f".format(event.globalMagnitude), modifier = Modifier.padding(top = 12.dp), color = MaterialTheme.colorScheme.secondary)
                            }
                        }
                    }
                }
            }
        }

        item {
            OutlinedCard {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(t.observer, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(t.quickSites, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        OutlinedButton(onClick = onMadrid, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)) { Text("Madrid") }
                        OutlinedButton(onClick = onMosul, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)) { Text("Mosul") }
                        OutlinedButton(onClick = onBaghdad, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)) { Text("Baghdad") }
                    }
                    OutlinedTextField(value = state.latitudeText, onValueChange = onLatitude, label = { Text(t.latitude) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = state.longitudeText, onValueChange = onLongitude, label = { Text(t.longitude) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = state.altitudeText, onValueChange = onAltitude, label = { Text(t.altitude) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, modifier = Modifier.fillMaxWidth())
                }
            }
        }

        state.error?.let { error -> item { Text(error, color = MaterialTheme.colorScheme.error) } }

        item {
            Button(
                onClick = onCalculate,
                enabled = !state.calculating && state.selectedEvent != null,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (state.calculating) t.calculating else t.calculate, modifier = Modifier.padding(vertical = 5.dp))
            }
            if (state.result != null) {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = onOpenResults, modifier = Modifier.fillMaxWidth()) { Text(t.results) }
            }
        }
    }
}

private fun globalTypeLabel(type: GlobalEclipseType, t: UiText): String = when (type) {
    GlobalEclipseType.TOTAL -> t.total
    GlobalEclipseType.ANNULAR -> t.annular
    GlobalEclipseType.HYBRID -> "Hybrid"
    GlobalEclipseType.PARTIAL -> t.partial
    GlobalEclipseType.UNKNOWN -> "?"
}
