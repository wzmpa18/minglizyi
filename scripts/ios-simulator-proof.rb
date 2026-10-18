# CI-only test target. Does not modify shipped app sources or bypass any app feature.
require 'xcodeproj'
project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |t| t.name == 'App' }
raise 'App target missing' unless app
ui = project.new_target(:ui_test_bundle, 'GuoxueStudyUITests', :ios, '17.0')
ui.add_dependency(app)
file = project.main_group.new_file('../../scripts/ios-study-screenshots.swift')
ui.source_build_phase.add_file_reference(file)
ui.build_configurations.each do |configuration|
  configuration.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.yandaoguoxue.app.StudyUITests'
  configuration.build_settings['TEST_TARGET_NAME'] = 'App'
  configuration.build_settings['SWIFT_VERSION'] = '5.0'
  configuration.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  configuration.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
end
project.root_object.attributes['TargetAttributes'] ||= {}
project.root_object.attributes['TargetAttributes'][ui.uuid] = { 'TestTargetID' => app.uuid }
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(ui)
scheme.add_test_target(ui)
scheme.set_launch_target(app)
scheme.save_as(project_path, 'GuoxueScreenshots', true)
puts 'Added isolated UI test scheme for the real Capacitor app.'
