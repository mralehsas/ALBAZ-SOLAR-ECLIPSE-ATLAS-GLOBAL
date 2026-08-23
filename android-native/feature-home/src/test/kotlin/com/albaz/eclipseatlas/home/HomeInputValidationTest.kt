package com.albaz.eclipseatlas.home

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class HomeInputValidationTest {
    @Test
    fun `latitude outside physical range is rejected`() {
        val state = HomeUiState(latitude = "91", longitude = "44.4")
        assertFalse(state.isInputValid)
    }

    @Test
    fun `Baghdad style coordinate input is valid`() {
        val state = HomeUiState(
            latitude = "33.3152",
            longitude = "44.3661",
            elevation = "34",
        )
        assertTrue(state.isInputValid)
    }

    @Test
    fun `dates outside audited catalog range are rejected`() {
        assertFalse(HomeUiState(year = "1549").isInputValid)
        assertFalse(HomeUiState(year = "2651").isInputValid)
    }

    @Test
    fun `non numeric coordinate input is rejected without throwing`() {
        val state = HomeUiState(latitude = "north", longitude = "44.3661")
        assertFalse(state.isInputValid)
    }
}
