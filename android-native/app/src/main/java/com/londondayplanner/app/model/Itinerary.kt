package com.londondayplanner.app.model

import kotlinx.serialization.Serializable

@Serializable
data class Itinerary(
    val id: String,
    val title: String,
    val city: String,
    val date: String,
    val places: List<ScheduledPlace>
)

@Serializable
data class ScheduledPlace(
    val id: String,
    val name: String,
    val description: String,
    val address: String,
    val time: String,
    val durationMinutes: Int,
    val coordinates: Location,
    val rating: Double? = null,
    val type: String? = null
)
