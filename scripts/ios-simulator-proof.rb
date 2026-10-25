# CI-only test target. Does not modify shipped app sources or bypass any app feature.
require 'xcodeproj'
# CI-only failure injection. No fixture content, identity bypass, or production
# source change: the second launch rejects fetch/XHR while native files remain.
tts_path='ios/App/App/LocalTtsPlugin.swift'
tts=File.read(tts_path)
raise 'Offline failure-injection anchor missing' unless tts.scan('override func capacitorDidLoad() {').length==1
tts=tts.sub('import Foundation',"import Foundation\nimport WebKit")
tts=tts.sub('override func capacitorDidLoad() {', <<~SWIFT)
override func capacitorDidLoad() {
    if ProcessInfo.processInfo.arguments.contains("--qa-learning-offline") {
        let blocked="window.fetch=function(){return Promise.reject(new TypeError('QA offline network block'));};XMLHttpRequest.prototype.send=function(){throw new Error('QA offline network block');};let attempts=0;const proof=setInterval(async function(){attempts++;try{let f=false,x=false;try{await window.fetch('/api/health');}catch(e){f=true;}try{const q=new XMLHttpRequest();q.open('GET','https://yandaoguoxue.yandao.vip/api/health');q.send();}catch(e){x=true;}if(f&&x&&window.Capacitor&&window.Capacitor.nativePromise){await window.Capacitor.nativePromise('OfflineFiles','write',{key:'qa-offline-network-proof',value:JSON.stringify({fetchBlocked:f,xhrBlocked:x})});clearInterval(proof);}}catch(e){}if(attempts>60)clearInterval(proof);},250);"
        bridge?.webView?.configuration.userContentController.addUserScript(WKUserScript(source:blocked,injectionTime:.atDocumentStart,forMainFrameOnly:false))
        bridge?.webView?.evaluateJavaScript(blocked,completionHandler:nil)
    }
SWIFT
File.write(tts_path,tts)
project_path = 'ios/App/App.xcodeproj'
project_file = File.join(project_path, 'project.pbxproj')
File.binwrite(project_file, File.binread(project_file).delete_prefix("\xEF\xBB\xBF".b))
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |t| t.name == 'App' }
raise 'App target missing' unless app
ui = project.new_target(:ui_test_bundle, 'GuoxueStudyUITests', :ios, '17.0')
ui.add_dependency(app)
file = project.main_group.new_file('../../scripts/ios-study-screenshots.swift')
ui.source_build_phase.add_file_reference(file)
ui.build_configurations.each do |configuration|
  configuration.build_settings['PRODUCT_NAME'] = 'GuoxueStudyUITests'
  configuration.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.yandaoguoxue.app.StudyUITests'
  configuration.build_settings['TEST_TARGET_NAME'] = 'App'
  configuration.build_settings['SWIFT_VERSION'] = '5.0'
  configuration.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  configuration.build_settings['CODE_SIGNING_ALLOWED'] = 'YES'
  configuration.build_settings['CODE_SIGN_IDENTITY'] = '-'
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
