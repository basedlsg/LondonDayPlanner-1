require 'xcodeproj'

scheme = Xcodeproj::XCScheme.new
# Simulate the logic used in generate_project.rb
scheme.launch_action.xml_element.add_attribute('storeKitConfigurationFileReference', '12345')

scheme.save_as('.', 'Test', true)

puts File.read('Test.xcscheme')
