import Foundation
import PDFKit
import SwiftUI

/// Service for generating PDF documents from itineraries
@MainActor
class PDFService {
    
    /// Generate a PDF URL for an itinerary
    func generatePDF(for itinerary: Itinerary) -> URL? {
        let pdfMetaData = [
            kCGPDFContextCreator: "Plan Your Perfect Day",
            kCGPDFContextAuthor: "London Day Planner",
            kCGPDFContextTitle: itinerary.title ?? "Itinerary"
        ]
        
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]
        
        let pageWidth = 8.5 * 72.0
        let pageHeight = 11 * 72.0
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)
        
        let data = renderer.pdfData { (context) in
            context.beginPage()
            
            // Draw Content
            drawHeader(itinerary: itinerary, in: pageRect)
            drawTimeline(itinerary: itinerary, in: pageRect)
            // Add more pages if needed...
        }
        
        // Save to temporary file
        let tempFolder = FileManager.default.temporaryDirectory
        let fileName = "Itinerary-\(itinerary.id).pdf"
        let fileURL = tempFolder.appendingPathComponent(fileName)
        
        do {
            try data.write(to: fileURL)
            return fileURL
        } catch {
            print("Error saving PDF: \(error)")
            return nil
        }
    }
    
    private func drawHeader(itinerary: Itinerary, in rect: CGRect) {
        let titleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 24, weight: .bold),
            .foregroundColor: UIColor.black
        ]
        
        let title = itinerary.title ?? "Your Itinerary"
        title.draw(at: CGPoint(x: 50, y: 50), withAttributes: titleAttributes)
        
        let subtitleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 14),
            .foregroundColor: UIColor.darkGray
        ]
        
        if let date = itinerary.planDate {
            let formatter = DateFormatter()
            formatter.dateStyle = .full
            let dateStr = formatter.string(from: date)
            dateStr.draw(at: CGPoint(x: 50, y: 80), withAttributes: subtitleAttributes)
        }
    }
    
    private func drawTimeline(itinerary: Itinerary, in rect: CGRect) {
        var yOffset: CGFloat = 120
        
        for place in itinerary.places {
            let timeAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.monospacedSystemFont(ofSize: 14, weight: .bold),
                .foregroundColor: UIColor(red: 1.0, green: 0.75, blue: 0.8, alpha: 1.0) // Pinkish
            ]
            
            place.scheduledTime.draw(at: CGPoint(x: 50, y: yOffset), withAttributes: timeAttributes)
            
            let nameAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
                .foregroundColor: UIColor.black
            ]
            
            place.name.draw(at: CGPoint(x: 130, y: yOffset), withAttributes: nameAttributes)
            
            let addressAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12),
                .foregroundColor: UIColor.gray
            ]
            
            place.address.draw(at: CGPoint(x: 130, y: yOffset + 20), withAttributes: addressAttributes)
            
            yOffset += 60
            
            if yOffset > rect.height - 50 {
                // New page logic would go here
                break
            }
        }
    }
}
