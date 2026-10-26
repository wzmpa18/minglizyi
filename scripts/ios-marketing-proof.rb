# Isolated simulator-only setup; never used by the IPA build workflow.
load File.join(__dir__, 'ios-simulator-proof.rb')
project_path='ios/App/App.xcodeproj'
project=Xcodeproj::Project.open(project_path)
ui=project.targets.find{|target|target.name=='GuoxueStudyUITests'}
file=project.main_group.new_file('../../scripts/ios-marketing-screenshots.swift')
ui.source_build_phase.add_file_reference(file)
project.save

file='ios/App/App/LocalTtsPlugin.swift'
source=File.read(file)
anchor='override func capacitorDidLoad() {'
raise 'Native lifecycle anchor is not unique' unless source.scan(anchor).length==1
source=source.sub(anchor, <<~SWIFT)
override func capacitorDidLoad() {
    // A normal API session, not a simulated user or membership. App UI/assets
    // remain the pinned release. The password never enters the app or XCTest.
    if ProcessInfo.processInfo.arguments.contains("--qa-marketing-auth"),
       let encoded=ProcessInfo.processInfo.environment["GUOXUE_QA_SESSION_B64"],
       let bytes=Data(base64Encoded:encoded),
       let values=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:String],
       Set(values.keys).isSubset(of:Set(["yandao_user_token","yandao_user_profile","yandao_token_expiry","yandao_refresh_token","yandao_refresh_expiry","yandao_membership_status"])) {
        let script="""
        (()=>{if(location.protocol!=='capacitor:'||location.hostname!=='localhost')return;
        const entries=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('\\(encoded)'),c=>c.charCodeAt(0))));
        for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);
        window.dispatchEvent(new Event('yandao-auth-change'));})();
        """
        bridge?.webView?.configuration.userContentController.addUserScript(WKUserScript(source:script,injectionTime:.atDocumentStart,forMainFrameOnly:true))
        bridge?.webView?.evaluateJavaScript(script,completionHandler:nil)
    }
SWIFT
File.write(file,source)
puts 'Added simulator-only normal-session bootstrap and actual marketing UI tests; no product web sources changed.'
