import Foundation
import AVFoundation
import Capacitor

// Local system speech only: no microphone, uploaded text, API key or recording.
@objc(LocalTtsPlugin)
public class LocalTtsPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "LocalTtsPlugin"
    public let jsName = "LocalTts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listVoices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    private let synthesizer = AVSpeechSynthesizer()
    private var currentUtterance: AVSpeechUtterance?
    private var interruptionObserver: NSObjectProtocol?

    override public func load() {
        DispatchQueue.main.async {
            self.synthesizer.delegate = self
            self.interruptionObserver = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] notification in
                if let type = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                   type == AVAudioSession.InterruptionType.began.rawValue { self?.stopCurrent(notify: true) }
            }
        }
    }
    deinit { if let observer = interruptionObserver { NotificationCenter.default.removeObserver(observer) } }

    private func voices() -> [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices().filter { $0.language.lowercased().hasPrefix("zh") }.sorted {
            let left = $0.language.lowercased().hasPrefix("zh-cn") ? 0 : 1
            let right = $1.language.lowercased().hasPrefix("zh-cn") ? 0 : 1
            if left != right { return left < right }
            if $0.quality.rawValue != $1.quality.rawValue { return $0.quality.rawValue > $1.quality.rawValue }
            return $0.identifier < $1.identifier
        }
    }
    @objc func getStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let available = self.voices()
            call.resolve(["ready": true, "available": !available.isEmpty,
                          "voiceName": available.first?.identifier ?? "", "engineName": "Apple AVSpeechSynthesizer",
                          "message": available.isEmpty ? "请在iOS系统设置中添加中文语音后重试" : "系统中文语音可用"])
        }
    }
    @objc func listVoices(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let items: [[String: Any]] = self.voices().map { voice in
                ["name": voice.identifier, "label": voice.name + (voice.quality == .default ? "" : "（高清）"), "locale": voice.language,
                 "likelyGender": voice.gender == .male ? "male" : voice.gender == .female ? "female" : "unknown"]
            }
            call.resolve(["voices": items])
        }
    }
    @objc func speak(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let text = (call.getString("text") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { call.reject("没有可朗读的文字"); return }
            // The continuous player sends complete <=600-codepoint segments.
            // Reject a too-long direct request, never silently cut off a book.
            guard text.count <= 32000 else { call.reject("本篇较长，请使用连续听学播放全文"); return }
            let available = self.voices()
            guard !available.isEmpty else { call.reject("系统未安装中文语音，请添加后重试"); return }
            let preferred = call.getString("voiceName") ?? ""
            let style = call.getString("style") ?? "warmNatural"
            let matchingGender: AVSpeechSynthesisVoiceGender? = style == "warmMale" ? .male : style == "softFemale" ? .female : nil
            let voice = available.first(where: { $0.identifier == preferred })
                ?? available.first(where: { matchingGender != nil && $0.gender == matchingGender! })
                ?? available[0]
            self.stopCurrent(notify: false)
            do {
                let audio = AVAudioSession.sharedInstance()
                try audio.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
                try audio.setActive(true)
                let utterance = AVSpeechUtterance(string: text)
                utterance.voice = voice
                let requestedRate = call.getDouble("rate") ?? 0.8
                guard requestedRate.isFinite else { call.reject("语速无效"); self.deactivateAudio(); return }
                utterance.rate = AVSpeechUtteranceDefaultSpeechRate * Float(max(0.6, min(1.15, requestedRate)))
                self.currentUtterance = utterance
                self.synthesizer.speak(utterance)
                call.resolve(["accepted": true, "chunks": 1, "voiceName": voice.identifier])
            } catch {
                self.currentUtterance = nil
                self.deactivateAudio()
                call.reject("系统语音暂不可用，请检查音频输出后重试")
            }
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.stopCurrent(notify: true); call.resolve() }
    }
    private func deactivateAudio() { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
    private func stopCurrent(notify: Bool) {
        let hadCurrent = currentUtterance != nil
        currentUtterance = nil
        synthesizer.stopSpeaking(at: .immediate)
        deactivateAudio()
        if hadCurrent && notify { notifyListeners("stateChange", data: ["state": "stopped"]) }
    }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        guard utterance === currentUtterance else { return }
        notifyListeners("stateChange", data: ["state": "speaking"])
    }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        guard utterance === currentUtterance else { return }
        currentUtterance = nil; deactivateAudio()
        notifyListeners("stateChange", data: ["state": "finished"])
    }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        guard utterance === currentUtterance else { return }
        currentUtterance = nil; deactivateAudio()
        notifyListeners("stateChange", data: ["state": "stopped"])
    }
}

class GuoxueBridgeViewController: CAPBridgeViewController {
    var calendarLaunchRequested=false
    func openCalendar(){
        guard let web=bridge?.webView,let url=URL(string:"capacitor://localhost/calendar/")else{calendarLaunchRequested=true;return}
        calendarLaunchRequested=false;web.load(URLRequest(url:url))
    }
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LocalTtsPlugin())
        bridge?.registerPluginInstance(LifeVaultPlugin())
        bridge?.registerPluginInstance(OfflineFilesPlugin())
        bridge?.registerPluginInstance(AppleLearningStorePlugin())
        bridge?.registerPluginInstance(LocalSkyLocationPlugin())
        bridge?.registerPluginInstance(LocalCalendarPlugin())
        if calendarLaunchRequested{openCalendar()}
    }
}
