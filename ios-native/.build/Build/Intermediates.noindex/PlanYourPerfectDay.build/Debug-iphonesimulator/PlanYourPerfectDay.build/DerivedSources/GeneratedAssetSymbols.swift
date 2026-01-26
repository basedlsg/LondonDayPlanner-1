import Foundation
#if canImport(DeveloperToolsSupport)
import DeveloperToolsSupport
#endif

#if SWIFT_PACKAGE
private let resourceBundle = Foundation.Bundle.module
#else
private class ResourceBundleClass {}
private let resourceBundle = Foundation.Bundle(for: ResourceBundleClass.self)
#endif

// MARK: - Color Symbols -

@available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, *)
extension DeveloperToolsSupport.ColorResource {

}

// MARK: - Image Symbols -

@available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, *)
extension DeveloperToolsSupport.ImageResource {

    /// The "city_austin" asset catalog image resource.
    static let cityAustin = DeveloperToolsSupport.ImageResource(name: "city_austin", bundle: resourceBundle)

    /// The "city_boston" asset catalog image resource.
    static let cityBoston = DeveloperToolsSupport.ImageResource(name: "city_boston", bundle: resourceBundle)

    /// The "city_london" asset catalog image resource.
    static let cityLondon = DeveloperToolsSupport.ImageResource(name: "city_london", bundle: resourceBundle)

    /// The "city_nyc" asset catalog image resource.
    static let cityNyc = DeveloperToolsSupport.ImageResource(name: "city_nyc", bundle: resourceBundle)

}

