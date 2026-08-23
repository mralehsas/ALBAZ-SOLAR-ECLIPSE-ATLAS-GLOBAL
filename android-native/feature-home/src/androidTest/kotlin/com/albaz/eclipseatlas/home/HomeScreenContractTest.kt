package com.albaz.eclipseatlas.home

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import org.junit.Rule
import org.junit.Test

class HomeScreenContractTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun homeExposesLanguageAndCalculateControls() {
        composeRule.setContent {
            HomeScreen(
                state = HomeUiState(),
                labels = HomeLabels.english(),
                isArabic = false,
                onLanguageChange = {},
                onYearChange = {},
                onMonthChange = {},
                onDayChange = {},
                onLatitudeChange = {},
                onLongitudeChange = {},
                onElevationChange = {},
                onCalculate = {},
            )
        }

        composeRule.onNodeWithTag("home.language.ar").fetchSemanticsNode()
        composeRule.onNodeWithTag("home.language.en").fetchSemanticsNode()
        composeRule.onNodeWithTag("home.date.year").fetchSemanticsNode()
        composeRule.onNodeWithTag("home.location.latitude").fetchSemanticsNode()
        composeRule.onNodeWithTag("home.calculate").fetchSemanticsNode()
    }
}
