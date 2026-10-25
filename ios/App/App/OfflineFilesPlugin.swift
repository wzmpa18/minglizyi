import Foundation
import CryptoKit
import Capacitor

/// Downloaded learning data, separate from WebKit caches and private journals.
@objc(OfflineFilesPlugin)
public class OfflineFilesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OfflineFilesPlugin"
    public let jsName = "OfflineFiles"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]
    private let io = DispatchQueue(label: "com.yandaoguoxue.offline-learning-files")
    private let maximumBytes = 8 * 1024 * 1024

    private func file(_ call: CAPPluginCall) throws -> URL {
        guard let key = call.getString("key"), !key.isEmpty, key.count <= 2000 else {
            throw NSError(domain: "OfflineFiles", code: 1)
        }
        let manager = FileManager.default
        let support = try manager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        var directory = support.appendingPathComponent("OfflineLearning", isDirectory: true)
        try manager.createDirectory(at: directory, withIntermediateDirectories: true,
                                    attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
        if try directory.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink == true {
            throw NSError(domain: "OfflineFiles", code: 2)
        }
        var values = URLResourceValues()
        values.isExcludedFromBackup = true // Re-downloadable data; retained on this device.
        try directory.setResourceValues(values)
        let name = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
        return directory.appendingPathComponent(name + ".json", isDirectory: false)
    }

    @objc func read(_ call: CAPPluginCall) {
        io.async {
            do {
                let url = try self.file(call)
                guard FileManager.default.fileExists(atPath: url.path) else {
                    call.resolve(["value": NSNull()]); return
                }
                let properties = try url.resourceValues(forKeys: [.fileSizeKey, .isSymbolicLinkKey])
                guard properties.isSymbolicLink != true, let size = properties.fileSize, size <= self.maximumBytes else {
                    throw NSError(domain: "OfflineFiles", code: 3)
                }
                let data = try Data(contentsOf: url, options: .mappedIfSafe)
                guard data.count <= self.maximumBytes, let value = String(data: data, encoding: .utf8) else {
                    throw NSError(domain: "OfflineFiles", code: 4)
                }
                call.resolve(["value": value])
            } catch { call.reject("离线学习资料未读取成功，原文件保留") }
        }
    }

    @objc func write(_ call: CAPPluginCall) {
        io.async {
            do {
                guard let value = call.getString("value") else { throw NSError(domain: "OfflineFiles", code: 5) }
                let data = Data(value.utf8)
                guard data.count <= self.maximumBytes else { throw NSError(domain: "OfflineFiles", code: 6) }
                let url = try self.file(call)
                if FileManager.default.fileExists(atPath: url.path),
                   try url.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink == true {
                    throw NSError(domain: "OfflineFiles", code: 7)
                }
                try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                call.resolve(["saved": true, "bytes": data.count])
            } catch { call.reject("离线学习资料未保存成功，原文件保留") }
        }
    }

    @objc func remove(_ call: CAPPluginCall) {
        io.async {
            do {
                let url = try self.file(call)
                if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
                call.resolve()
            } catch { call.reject("未删除离线学习资料") }
        }
    }
}
