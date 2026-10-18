import Foundation
import UIKit
import CoreLocation
import Capacitor

// One user-requested foreground fix; no background updates, storage or network.
@objc(LocalSkyLocationPlugin)
public class LocalSkyLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "LocalSkyLocationPlugin"
    public let jsName = "LocalSkyLocation"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "getCurrentPosition", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "startCompass", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "stopCompass", returnType: CAPPluginReturnPromise)]
    private var manager: CLLocationManager?
    private var pending: CAPPluginCall?
    private var timeout: Timer?
    private var requested = false

    private var headingManager: CLLocationManager?
    private var headingPauseObserver: NSObjectProtocol?
    public override func load() {
        headingPauseObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.headingManager?.stopUpdatingHeading()
            self?.notifyListeners("headingStopped", data: [:])
        }
    }
    @objc func startCompass(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard CLLocationManager.headingAvailable() else { call.reject("设备无可用方向传感器，请使用手动模式。"); return }
            self.headingManager?.stopUpdatingHeading()
            let m = CLLocationManager(); m.delegate = self; m.headingFilter = 1
            switch UIDevice.current.orientation {
            case .landscapeLeft: m.headingOrientation = .landscapeLeft
            case .landscapeRight: m.headingOrientation = .landscapeRight
            case .portraitUpsideDown: m.headingOrientation = .portraitUpsideDown
            default: m.headingOrientation = .portrait
            }
            self.headingManager = m; m.startUpdatingHeading(); call.resolve()
        }
    }
    @objc func stopCompass(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.headingManager?.stopUpdatingHeading(); self.headingManager?.delegate = nil; self.headingManager = nil; call.resolve() }
    }
    public func locationManager(_ manager: CLLocationManager, didUpdateHeading heading: CLHeading) {
        guard heading.headingAccuracy >= 0 else { return }
        notifyListeners("heading", data: ["heading": heading.magneticHeading, "accuracy": heading.headingAccuracy, "needsCalibration": heading.headingAccuracy > 20, "screenUp": true, "landscape": UIDevice.current.orientation.isLandscape])
    }
    deinit { if let observer = headingPauseObserver { NotificationCenter.default.removeObserver(observer) } }

    @objc func getCurrentPosition(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pending == nil else { call.reject("定位正在进行，请稍候。"); return }
            guard CLLocationManager.locationServicesEnabled() else { call.reject("系统定位服务已关闭，可以手动选择城市或填写经纬度。"); return }
            let manager = CLLocationManager()
            self.manager = manager; manager.delegate = self
            manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
            self.pending = call
            self.timeout = Timer.scheduledTimer(withTimeInterval: 30, repeats: false) { [weak self] _ in self?.fail("定位超时，请在开阔处重试，或手动选择地点。") }
            self.authorizeOrLocate()
        }
    }
    private func authorizeOrLocate() {
        guard pending != nil, let manager = manager else { return }
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            if !requested { requested = true; manager.requestLocation() }
        case .denied, .restricted: fail("未获得定位权限。可以在系统设置中允许定位，或手动选择城市。")
        @unknown default: fail("系统定位状态不可用，请手动选择地点。")
        }
    }
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) { authorizeOrLocate() }
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last, location.horizontalAccuracy >= 0, abs(location.timestamp.timeIntervalSinceNow) <= 300 else { fail("未取得有效的新位置，请重试。"); return }
        let call = pending; clear()
        call?.resolve(["latitude": location.coordinate.latitude, "longitude": location.coordinate.longitude, "accuracy": location.horizontalAccuracy])
    }
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) { fail("暂时无法取得位置，请检查定位权限或手动选择地点。") }
    private func fail(_ message: String) { let call = pending; clear(); call?.reject(message) }
    private func clear() { timeout?.invalidate(); timeout = nil; manager?.stopUpdatingLocation(); manager?.delegate = nil; manager = nil; pending = nil; requested = false }
}
