# QA Prompts: Multi-City & Enhanced Itineraries

This document provides a set of QA prompts to test the new multi-city and enhanced itinerary features.

## Test Cases

### 1. City Selection

-   **Objective**: Verify that the city selection dropdown works correctly and that the selected city is used in the itinerary generation.
-   **Steps**:
    1.  Select "London" from the city dropdown.
    2.  Enter the prompt: "A day in London visiting the Tower of London and Buckingham Palace."
    3.  Verify that the generated itinerary is for London and includes the specified landmarks.

### 2. Comprehensive Itineraries

-   **Objective**: Verify that the AI can generate a comprehensive, multi-step itinerary for a full day.
-   **Steps**:
    1.  Select "Paris" from the city dropdown.
    2.  Enter the prompt: "A romantic day in Paris for two, starting with breakfast, visiting the Louvre, having a picnic lunch by the Eiffel Tower, and ending with a fancy dinner."
    3.  Verify that the generated itinerary includes multiple steps for breakfast, the Louvre, lunch, and dinner.
    4.  Verify that the venues are appropriate for a romantic day and have high ratings.

### 3. Vague Requests

-   **Objective**: Verify that the AI can handle vague requests and generate a reasonable itinerary.
-   **Steps**:
    1.  Select "Tokyo" from the city dropdown.
    2.  Enter the prompt: "A fun day in Tokyo."
    3.  Verify that the generated itinerary includes a variety of popular and highly-rated attractions in Tokyo.

### 4. Specific Venue Preferences

-   **Objective**: Verify that the AI can handle specific venue preferences.
-   **Steps**:
    1.  Select "New York" from the city dropdown.
    2.  Enter the prompt: "A day in New York with a visit to a quiet cafe with Wi-Fi in the morning and a lively restaurant with outdoor seating for dinner."
    3.  Verify that the generated itinerary includes a cafe and a restaurant that match the specified preferences.