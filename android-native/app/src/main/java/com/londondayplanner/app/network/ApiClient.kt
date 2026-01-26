package com.londondayplanner.app.network

import com.londondayplanner.app.model.Itinerary
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface ItineraryApi {
    @POST("api/{city}/itinerary")
    suspend fun createItinerary(
        @Path("city") citySlug: String,
        @Body request: GenerateItineraryRequest
    ): Itinerary

    @GET("api/cities")
    suspend fun getCities(): List<com.londondayplanner.app.model.City>
}

data class GenerateItineraryRequest(
    val query: String,
    val date: String
)

object ApiClient {
    private const val BASE_URL = "https://your-firebase-url.cloudfunctions.net/" // Update with actual URL

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val api: ItineraryApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ItineraryApi::class.java)
    }
}
