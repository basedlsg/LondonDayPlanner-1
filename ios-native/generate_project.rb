require 'xcodeproj'

# Define project name and path
project_name = "PlanYourPerfectDay"
project_path = "#{project_name}.xcodeproj"

# Create a new project
project = Xcodeproj::Project.new(project_path)

# Add targets
target = project.new_target(:application, project_name, :ios)
target.deployment_target = '17.0' 

# Set project-level deployment target
project.build_configurations.each do |config|
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
    config.build_settings['SWIFT_VERSION'] = '5.0'
end

target.build_configurations.each do |config|
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.carlos.PlanYourPerfectDay'
    config.build_settings['INFOPLIST_FILE'] = 'Info.plist'
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
    config.build_settings['SWIFT_VERSION'] = '5.0'
    config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'LondonDayPlanner.entitlements'
    config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
    config.build_settings['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
end

# Helper to add packages
def add_package(project, target, url, version, product_name)
  pkg_ref = project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
  pkg_ref.repositoryURL = url
  pkg_ref.requirement = { 'kind' => 'upToNextMajorVersion', 'minimumVersion' => version }
  project.root_object.package_references << pkg_ref
  
  prod_dep = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
  prod_dep.package = pkg_ref
  prod_dep.product_name = product_name
  target.package_product_dependencies << prod_dep
end

# Add Dependencies
add_package(project, target, 'https://github.com/Alamofire/Alamofire.git', '5.9.0', 'Alamofire')
add_package(project, target, 'https://github.com/onevcat/Kingfisher.git', '7.12.0', 'Kingfisher')

# Add source files
group = project.main_group.new_group('Sources')
Dir.glob('Sources/**/*.swift').each do |file|
    file_ref = group.new_reference(file)
    target.add_file_references([file_ref])
end

# Add Resources (Properly recursive and variety of types)
resources_group = project.main_group.new_group('Resources')

# Recursively find all resources excluding the .xcassets which we handle as a bundle
# And handle .lproj folders for localization
Dir.glob('Sources/Resources/**/*').each do |path|
  next if File.directory?(path) && !path.end_with?('.xcassets') && !path.include?('.lproj')
  
  # For specialized bundles like .xcassets, just add the folder itself
  if path.end_with?('.xcassets')
      file_ref = resources_group.new_reference(path)
      target.add_resources([file_ref])
  elsif path.include?('.lproj')
      # Localization files need careful handling. 
      # Simplest way for xcodeproj gem to handle localized strings:
      # We add them as file references and xcode usually detects the grouping.
      file_ref = resources_group.new_reference(path)
      target.add_resources([file_ref])
  elsif path.end_with?('.ttf') || path.end_with?('.png')
      file_ref = resources_group.new_reference(path)
      target.add_resources([file_ref])
  end
end

# Add Entitlements file
entitlements_ref = project.main_group.new_reference('LondonDayPlanner.entitlements')

# Add Info.plist
info_plist_ref = project.main_group.new_reference('Info.plist')




# Save the project
project.save
puts "Generated #{project_path} with ALL Resources"

# Create Scheme with StoreKit Configuration
storekit_ref = project.main_group.new_reference('PlanYourPerfectDay.storekit')
# We need to save the project again to ensure the storekit_ref has a valid UUID if that matters, 
# but mostly we need it in the project file. 
# Re-saving project to include the new reference
project.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)


# Set the StoreKit Configuration (Simulate StoreKit)
# Using XML element manipulation since the property setter is not available in this version of Xcodeproj
scheme.launch_action.xml_element.add_attribute('storeKitConfigurationFileReference', storekit_ref.uuid)

# Save the scheme as a Shared scheme
scheme.save_as(project_path, project_name, true)
puts "Generated Scheme '#{project_name}' with StoreKit Configuration enabled"
