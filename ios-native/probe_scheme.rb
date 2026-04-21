require 'xcodeproj'
scheme = Xcodeproj::XCScheme.new
puts scheme.launch_action.methods.sort
