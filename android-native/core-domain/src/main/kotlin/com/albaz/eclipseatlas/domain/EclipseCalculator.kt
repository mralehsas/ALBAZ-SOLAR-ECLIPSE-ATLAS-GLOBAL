package com.albaz.eclipseatlas.domain

fun interface EclipseCalculator {
    suspend fun calculate(
        event: EclipseEvent,
        observer: ObserverLocation,
    ): LocalEclipseResult
}
