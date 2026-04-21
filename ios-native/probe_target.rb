require 'xcodeproj'
project = Xcodeproj::Project.open('PlanYourPerfectDay.xcodeproj')
target = project.targets.find { |t| t.name == 'UITests' }
puts "Product Name: #{target.product_reference.name}"
puts "Product Path: #{target.product_reference.path}"
