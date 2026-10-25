# CI-only test target. Does not modify shipped app sources or bypass any app feature.
require 'xcodeproj'
require 'base64'
# CI-only failure injection. No fixture content, identity bypass, or production
# source change: block services and image fetch; allow bundled UI routes.
fault=File.read('scripts/ios-learning-network-fault.js')
tts_path='ios/App/App/LocalTtsPlugin.swift'
tts=File.read(tts_path)
raise 'Offline failure-injection anchor missing' unless tts.scan('override func capacitorDidLoad() {').length==1
tts=tts.sub('import Foundation',"import Foundation\nimport WebKit\nimport CryptoKit")
tts=tts.sub('override func capacitorDidLoad() {', <<~SWIFT)
override func capacitorDidLoad() {
    if ProcessInfo.processInfo.arguments.contains("--qa-learning-offline") {
        let proof=GuoxueOfflineFaultProof()
        proof.save(["nativeLaunchArgumentObserved":true],key:"qa-offline-installation-proof")
        bridge?.webView?.configuration.userContentController.add(proof,name:"qaOfflineNetworkProof")
        let blocked=String(data:Data(base64Encoded:"#{Base64.strict_encode64(fault)}")!,encoding:.utf8)!
        bridge?.webView?.configuration.userContentController.addUserScript(WKUserScript(source:blocked,injectionTime:.atDocumentStart,forMainFrameOnly:false))
        bridge?.webView?.evaluateJavaScript(blocked,completionHandler:nil)
        DispatchQueue.main.asyncAfter(deadline:.now()+3) { [weak self] in
            self?.bridge?.webView?.evaluateJavaScript("JSON.stringify({active:!!window.__qaLearningOffline,handler:!!window.webkit?.messageHandlers?.qaOfflineNetworkProof,protocol:location.protocol})") { value,error in
                proof.save(["actualJavaScriptState":value as? String ?? "absent","evaluationFailed":error != nil],key:"qa-offline-js-state")
            }
        }
    }
SWIFT
tts += <<~SWIFT

// CI-only collection of the actual fetch/XHR fault results. Does not supply app data.
final class GuoxueOfflineFaultProof: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let result=message.body as? [String:Any] else{return}
        save(result,key:"qa-offline-network-proof")
    }
    func save(_ result:[String:Any],key:String) {
        guard let bytes=try? JSONSerialization.data(withJSONObject:result) else{return}
        do {
            let root=try FileManager.default.url(for:.applicationSupportDirectory,in:.userDomainMask,appropriateFor:nil,create:true).appendingPathComponent("OfflineLearning",isDirectory:true)
            try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true)
            let name=SHA256.hash(data:Data(key.utf8)).map{String(format:"%02x",$0)}.joined()+".json"
            try bytes.write(to:root.appendingPathComponent(name),options:.atomic)
        } catch { NSLog("QA offline fault evidence was not saved") }
    }
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
