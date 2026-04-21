import SwiftUI

extension City {
    var imageName: String {
        switch slug {
        case "london": return "city_london"
        case "nyc": return "city_nyc"
        case "boston": return "city_boston"
        case "austin": return "city_austin"
        case "paris": return "city_paris"
        default: return "city_default"
        }
    }
    
    var symbolIcon: String {
        switch slug {
        case "london": return "building.columns.fill"
        case "nyc": return "building.2.crop.circle"
        case "boston": return "sailboat.fill"
        case "austin": return "music.note"
        case "paris": return "fork.knife"
        default: return "mappin.circle.fill"
        }
    }
}
