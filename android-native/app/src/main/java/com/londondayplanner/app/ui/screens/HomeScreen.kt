package com.londondayplanner.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.londondayplanner.app.ui.components.GlassButton
import com.londondayplanner.app.ui.components.GlassCard
import com.londondayplanner.app.ui.components.LiquidBackground

@Composable
fun HomeScreen(
    onPlanDay: (String) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        LiquidBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Plan Your\nPerfect Day",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                lineHeight = 44.sp
            )

            Spacer(modifier = Modifier.height(48.dp))

            GlassCard {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Where do you want to go?",
                        color = Color.White.copy(alpha = 0.8f),
                        style = MaterialTheme.typography.labelLarge
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Simple city selector placeholder
                    Text(
                        text = "London (Selected)",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            GlassCard {
                TextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { 
                        Text("e.g., Coffee in Shoreditch, then Tate Modern", color = Color.Gray) 
                    },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    ),
                    modifier = Modifier.fillMaxWidth().height(120.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            GlassButton(
                text = "Plan My Day",
                onClick = {
                    isLoading = true
                    onPlanDay(query)
                    // In real app, launch coroutine and reset loading on result
                },
                isLoading = isLoading,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
