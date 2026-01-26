import Foundation
import EventKit
import SwiftUI

/// Service for exporting itineraries to the iOS Calendar
@MainActor
class CalendarService: ObservableObject {
    @Published var permissionStatus: EKAuthorizationStatus = .notDetermined
    @Published var error: Error?
    
    private let eventStore = EKEventStore()
    
    init() {
        checkPermission()
    }
    
    func checkPermission() {
        permissionStatus = EKEventStore.authorizationStatus(for: .event)
    }
    
    func requestPermission() async -> Bool {
        do {
            let granted = try await eventStore.requestAccess(to: .event)
            permissionStatus = EKEventStore.authorizationStatus(for: .event)
            return granted
        } catch {
            self.error = error
            return false
        }
    }
    
    /// Export an entire itinerary to the calendar
    func exportItinerary(_ itinerary: Itinerary) async throws -> Int {
        guard permissionStatus == .authorized else {
            let granted = await requestPermission()
            guard granted else { throw CalendarError.accessDenied }
            return 0
        }
        
        guard let date = itinerary.planDate else {
            throw CalendarError.invalidDate
        }
        
        var eventsCreated = 0
        
        // Loop through places and create events
        for place in itinerary.places {
            let event = EKEvent(eventStore: eventStore)
            event.title = place.name
            event.location = place.address
            
            // Parse time string "10:00 AM" to Date
            if let startDate = combineDateAndTime(date: date, timeString: place.scheduledTime) {
                event.startDate = startDate
                event.endDate = startDate.addingTimeInterval(TimeInterval((place.duration ?? 60) * 60))
            } else {
                continue
            }
            
            event.calendar = eventStore.defaultCalendarForNewEvents
            
            // Add notes
            var notes = place.activityDescription ?? ""
            if let rating = place.rating {
                notes += "\nRating: \(rating) stars"
            }
            event.notes = notes
            
            // Add URL if available (could be place URL or app deep link)
            // event.url = URL(string: "...") 
            
            do {
                try eventStore.save(event, span: .thisEvent)
                eventsCreated += 1
            } catch {
                print("Failed to save event: \(error)")
            }
        }
        
        return eventsCreated
    }
    
    // Helper to parse "10:00 AM" or "10:00" + Date -> Full Date
    private func combineDateAndTime(date: Date, timeString: String) -> Date? {
        let formats = ["h:mm a", "HH:mm", "h:mm", "HH:mm:ss"]
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        
        var timeDate: Date?
        
        for format in formats {
            formatter.dateFormat = format
            if let parsed = formatter.date(from: timeString) {
                timeDate = parsed
                break
            }
        }
        
        guard let validTimeDate = timeDate else {
            print("Failed to parse time string: \(timeString)")
            return nil
        }
        
        let calendar = Calendar.current
        let timeComponents = calendar.dateComponents([.hour, .minute], from: validTimeDate)
        
        return calendar.date(bySettingHour: timeComponents.hour ?? 0,
                             minute: timeComponents.minute ?? 0,
                             second: 0,
                             of: date)
    }
}

enum CalendarError: LocalizedError {
    case accessDenied
    case invalidDate
    case saveFailed
    
    var errorDescription: String? {
        switch self {
        case .accessDenied: return "Calendar access was denied."
        case .invalidDate: return "Invalid itinerary date."
        case .saveFailed: return "Failed to save events."
        }
    }
}
