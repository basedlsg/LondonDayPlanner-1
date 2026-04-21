import Foundation
import Combine

/// Service to stress test the text generation capabilities
@MainActor
class StressTestService: ObservableObject {
    static let shared = StressTestService()
    
    @Published var isRunning = false
    @Published var progress: Double = 0
    @Published var logs: [String] = []
    @Published var totalRequests = 0
    @Published var successfulRequests = 0
    @Published var failedRequests = 0
    @Published var averageLatency: TimeInterval = 0
    
    private var task: Task<Void, Never>?
    private let apiClient = APIClient.shared
    
    private init() {}
    
    func startTest(iterations: Int = 10, delay: TimeInterval = 1.0) {
        guard !isRunning else { return }
        
        isRunning = true
        progress = 0
        totalRequests = 0
        successfulRequests = 0
        failedRequests = 0
        logs = []
        averageLatency = 0
        
        appendLog("🚀 Starting Stress Test: \(iterations) iterations")
        
        task = Task {
            var totalDuration: TimeInterval = 0
            
            for i in 1...iterations {
                if Task.isCancelled { break }
                
                await MainActor.run {
                    self.totalRequests += 1
                    self.progress = Double(i) / Double(iterations)
                }
                
                let startTime = Date()
                let query = "Test query \(i): Plan a day with simple activities"
                
                do {
                    appendLog("Request \(i)/\(iterations): Sending...")
                    let response = try await apiClient.createItinerary(
                        citySlug: "london", // Default to London for stress test
                        query: query,
                        date: Date()
                    )
                    let duration = Date().timeIntervalSince(startTime)
                    
                    await MainActor.run {
                        self.successfulRequests += 1
                        totalDuration += duration
                        self.averageLatency = totalDuration / Double(self.successfulRequests)
                    }
                    
                    appendLog("✅ Request \(i) Success: \(String(format: "%.2fs", duration))")
                } catch {
                    await MainActor.run {
                        self.failedRequests += 1
                    }
                    appendLog("❌ Request \(i) Failed: \(error.localizedDescription)")
                }
                
                // Wait before next request
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
            
            await MainActor.run {
                self.isRunning = false
                self.appendLog("🏁 Test Complete. Success: \(self.successfulRequests)/\(iterations)")
            }
        }
    }
    
    func stopTest() {
        task?.cancel()
        isRunning = false
        appendLog("⏹️ Test Stopped")
    }
    
    private func appendLog(_ message: String) {
        Task { @MainActor in
            let timestamp = Date().formatted(date: .omitted, time: .standard)
            self.logs.insert("[\(timestamp)] \(message)", at: 0)
        }
    }
}
