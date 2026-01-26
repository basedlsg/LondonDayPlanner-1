#import <Foundation/Foundation.h>

#if __has_attribute(swift_private)
#define AC_SWIFT_PRIVATE __attribute__((swift_private))
#else
#define AC_SWIFT_PRIVATE
#endif

/// The "city_austin" asset catalog image resource.
static NSString * const ACImageNameCityAustin AC_SWIFT_PRIVATE = @"city_austin";

/// The "city_boston" asset catalog image resource.
static NSString * const ACImageNameCityBoston AC_SWIFT_PRIVATE = @"city_boston";

/// The "city_london" asset catalog image resource.
static NSString * const ACImageNameCityLondon AC_SWIFT_PRIVATE = @"city_london";

/// The "city_nyc" asset catalog image resource.
static NSString * const ACImageNameCityNyc AC_SWIFT_PRIVATE = @"city_nyc";

#undef AC_SWIFT_PRIVATE
