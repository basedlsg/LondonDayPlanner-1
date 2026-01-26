package com.londondayplanner.app.model

import kotlinx.serialization.Serializable

@Serializable
data class City(
    val id: String,
    val name: String,
    val country: String,
    val slug: String,
    val center: Location,
    val image: String? = null
)

@Serializable
data class Location(
    val lat: Double,
    val lng: Double
)
