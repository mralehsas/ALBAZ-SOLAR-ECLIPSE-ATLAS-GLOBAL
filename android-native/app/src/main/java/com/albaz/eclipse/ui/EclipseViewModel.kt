package com.albaz.eclipse.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.albaz.eclipse.core.BesselianLocalEngine
import com.albaz.eclipse.core.catalog.JsWrappedBesselianCatalog
import com.albaz.eclipse.core.model.BesselianElements
import com.albaz.eclipse.core.model.LocalCircumstances
import com.albaz.eclipse.core.model.Observer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class EclipseUiState(
    val language: AppLanguage = AppLanguage.AR,
    val yearText: String = "2026",
    val allEvents: List<BesselianElements> = emptyList(),
    val yearEvents: List<BesselianElements> = emptyList(),
    val selectedEventIndex: Int = 0,
    val latitudeText: String = "40.4168",
    val longitudeText: String = "-3.7038",
    val altitudeText: String = "667",
    val observerLabel: String = "Madrid",
    val loadingCatalogue: Boolean = true,
    val calculating: Boolean = false,
    val result: LocalCircumstances? = null,
    val error: String? = null
) {
    val selectedEvent: BesselianElements? get() = yearEvents.getOrNull(selectedEventIndex)
    val hasFullCatalogue: Boolean get() = allEvents.size > 1000
}

class EclipseViewModel(application: Application) : AndroidViewModel(application) {
    private val _state = MutableStateFlow(EclipseUiState())
    val state: StateFlow<EclipseUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch { loadCatalogueAndYear(2026) }
    }

    fun setLanguage(language: AppLanguage) = _state.update { it.copy(language = language) }
    fun setYearText(value: String) = _state.update { it.copy(yearText = value.take(4), error = null) }
    fun setLatitude(value: String) = _state.update { it.copy(latitudeText = value, error = null) }
    fun setLongitude(value: String) = _state.update { it.copy(longitudeText = value, error = null) }
    fun setAltitude(value: String) = _state.update { it.copy(altitudeText = value, error = null) }
    fun selectEvent(index: Int) = _state.update { it.copy(selectedEventIndex = index, result = null, error = null) }

    fun useMadrid() = setObserver("Madrid", "40.4168", "-3.7038", "667")
    fun useMosul() = setObserver("Mosul", "36.333333", "43.133333", "223")
    fun useBaghdad() = setObserver("Baghdad", "33.3152", "44.3661", "34")

    private fun setObserver(label: String, lat: String, lon: String, alt: String) {
        _state.update {
            it.copy(observerLabel = label, latitudeText = lat, longitudeText = lon, altitudeText = alt, result = null, error = null)
        }
    }

    fun searchYear() {
        val year = _state.value.yearText.toIntOrNull()
        if (year == null || year !in 1550..2650) {
            _state.update { it.copy(error = "Year must be 1550–2650") }
            return
        }
        viewModelScope.launch { loadYear(year) }
    }

    fun calculate() {
        val snapshot = _state.value
        val event = snapshot.selectedEvent ?: run {
            _state.update { it.copy(error = "No eclipse event selected") }
            return
        }
        val lat = snapshot.latitudeText.toDoubleOrNull()
        val lon = snapshot.longitudeText.toDoubleOrNull()
        val alt = snapshot.altitudeText.toDoubleOrNull() ?: 0.0
        if (lat == null || lon == null || lat !in -90.0..90.0 || lon !in -180.0..180.0) {
            _state.update { it.copy(error = "Invalid observer coordinates") }
            return
        }

        _state.update { it.copy(calculating = true, error = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.Default) {
                    BesselianLocalEngine.solve(event, Observer(lat, lon, alt, snapshot.observerLabel))
                }
            }.onSuccess { result ->
                _state.update { it.copy(calculating = false, result = result) }
            }.onFailure { failure ->
                _state.update { it.copy(calculating = false, error = failure.message ?: "Calculation failed") }
            }
        }
    }

    private suspend fun loadCatalogueAndYear(year: Int) {
        _state.update { it.copy(loadingCatalogue = true, error = null) }
        runCatching {
            withContext(Dispatchers.IO) {
                val source = getApplication<Application>().assets.open("besselian_data.js").bufferedReader().use { it.readText() }
                JsWrappedBesselianCatalog.parse(source)
            }
        }.onSuccess { events ->
            _state.update {
                it.copy(
                    allEvents = events,
                    yearEvents = events.filter { event -> event.year == year },
                    selectedEventIndex = 0,
                    loadingCatalogue = false,
                    result = null
                )
            }
        }.onFailure { failure ->
            _state.update { it.copy(loadingCatalogue = false, error = failure.message ?: "Catalogue load failed") }
        }
    }

    private suspend fun loadYear(year: Int) {
        val events = _state.value.allEvents
        if (events.isEmpty()) {
            loadCatalogueAndYear(year)
            return
        }
        _state.update {
            it.copy(
                yearText = year.toString(),
                yearEvents = events.filter { event -> event.year == year },
                selectedEventIndex = 0,
                result = null,
                error = null
            )
        }
    }
}
