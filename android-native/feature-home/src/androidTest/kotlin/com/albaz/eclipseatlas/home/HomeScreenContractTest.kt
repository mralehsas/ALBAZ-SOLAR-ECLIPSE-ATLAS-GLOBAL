package com.albaz.eclipseatlas.home

import androidx.compose.ui.test.assertExists
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

        composeRule.onNodeWithTag("home.language.ar").assertExists()
        composeRule.onNodeWithTag("home.language.en").assertExists()
        composeRule.onNodeWithTag("home.date.year").assertExists()
        composeRule.onNodeWithTag("home.location.latitude").assertExists()
        composeRule.onNodeWithTag("home.calculate").assertExists()
    }
}
