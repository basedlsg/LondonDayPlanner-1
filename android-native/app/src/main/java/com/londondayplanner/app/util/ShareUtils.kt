package com.londondayplanner.app.util

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Environment
import android.provider.CalendarContract
import android.widget.Toast
import androidx.core.content.FileProvider
import com.londondayplanner.app.model.Itinerary
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

object ShareUtils {

    fun shareItineraryText(context: Context, itinerary: Itinerary) {
        val sb = StringBuilder()
        sb.append("My Day in ${itinerary.city.capitalize()}: ${itinerary.title}\n\n")
        itinerary.places.forEach { place ->
            sb.append("📍 ${place.time} - ${place.name}\n")
        }

        val sendIntent: Intent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, sb.toString())
            type = "text/plain"
        }

        val shareIntent = Intent.createChooser(sendIntent, "Share Itinerary")
        context.startActivity(shareIntent)
    }

    fun addToCalendar(context: Context, itinerary: Itinerary) {
        // Simplified: Adds the first event for demo purposes
        // In production, we'd batch insert or ask user to pick
        
        val place = itinerary.places.firstOrNull() ?: return
        
        val intent = Intent(Intent.ACTION_INSERT).apply {
            data = CalendarContract.Events.CONTENT_URI
            putExtra(CalendarContract.Events.TITLE, place.name)
            putExtra(CalendarContract.Events.EVENT_LOCATION, place.address)
            putExtra(CalendarContract.Events.DESCRIPTION, place.description)
            // Note: Parsing time string to millis would be needed here
        }
        
        if (intent.resolveActivity(context.packageManager) != null) {
            context.startActivity(intent)
        } else {
            Toast.makeText(context, "No Calendar app found", Toast.LENGTH_SHORT).show()
        }
    }

    fun generateAndSharePdf(context: Context, itinerary: Itinerary) {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = document.startPage(pageInfo)
        
        val canvas = page.canvas
        val paint = Paint()
        paint.color = Color.BLACK
        paint.textSize = 16f
        
        canvas.drawText(itinerary.title, 50f, 50f, paint)
        
        var y = 100f
        itinerary.places.forEach { place ->
            canvas.drawText("${place.time} - ${place.name}", 50f, y, paint)
            y += 30f
        }
        
        document.finishPage(page)
        
        val file = File(context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "Itinerary_${itinerary.id}.pdf")
        
        try {
            document.writeTo(FileOutputStream(file))
            shareFile(context, file, "application/pdf")
        } catch (e: IOException) {
            e.printStackTrace()
            Toast.makeText(context, "Error creating PDF", Toast.LENGTH_SHORT).show()
        } finally {
            document.close()
        }
    }

    private fun shareFile(context: Context, file: File, mimeType: String) {
        val uri: Uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        
        context.startActivity(Intent.createChooser(intent, "Share PDF"))
    }
}
