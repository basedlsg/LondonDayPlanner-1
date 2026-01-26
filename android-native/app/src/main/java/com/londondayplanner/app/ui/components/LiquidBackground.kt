package com.londondayplanner.app.ui.components

import android.os.Build
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas

@Composable
fun LiquidBackground(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize()) {
        // Dark base
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawRect(color = Color(0xFF0F0F1A))
        }

        // Blobs
        Canvas(modifier = Modifier.fillMaxSize()) {
            // Pink blob
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFFFFC0CB).copy(alpha = 0.3f),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.2f, size.height * 0.2f),
                    radius = size.width * 0.8f
                )
            )

            // Blue blob
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFFADD8E6).copy(alpha = 0.3f),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.8f, size.height * 0.8f),
                    radius = size.width * 0.8f
                )
            )
        }
    }
}
