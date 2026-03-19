// swift-tools-version:6.2
import PackageDescription

let package = Package(
    name: "PlanYourPerfectDay",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v26),
        .macOS(.v10_15)
    ],
    products: [
        .executable(
            name: "PlanYourPerfectDay",
            targets: ["PlanYourPerfectDay"]
        ),
    ],
    dependencies: [
        // Networking
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.9.0"),
        // Image loading
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "7.12.0"),
    ],
    targets: [
        .executableTarget(
            name: "PlanYourPerfectDay",
            dependencies: ["Alamofire", "Kingfisher"],
            path: "Sources",
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "PlanYourPerfectDayTests",
            dependencies: ["PlanYourPerfectDay"],
            path: "Tests",
            resources: [
            ]
        ),
    ]
)
