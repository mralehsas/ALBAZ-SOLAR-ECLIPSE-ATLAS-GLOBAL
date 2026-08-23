package com.albaz.eclipseatlas.domain

import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class DomainContractsTest {
    @Test
    fun `observer accepts valid WGS84 coordinates`() {
        assertDoesNotThrow {
            ObserverLocation(latitudeDeg = 33.3152, longitudeEastDeg = 44.3661, elevationMeters = 34.0)
        }
    }

    @Test
    fun `observer rejects impossible latitude`() {
        assertThrows(IllegalArgumentException::class.java) {
            ObserverLocation(latitudeDeg = 91.0, longitudeEastDeg = 44.3661)
        }
    }

    @Test
    fun `observer rejects impossible longitude`() {
        assertThrows(IllegalArgumentException::class.java) {
            ObserverLocation(latitudeDeg = 33.3152, longitudeEastDeg = 181.0)
        }
    }
}
