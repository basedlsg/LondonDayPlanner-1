require 'xcodeproj'
scheme = Xcodeproj::XCScheme.new
puts scheme.test_action.methods.sort
