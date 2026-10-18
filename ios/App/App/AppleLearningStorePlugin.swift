import Foundation
import StoreKit
import Capacitor

@objc(AppleLearningStorePlugin)
public class AppleLearningStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleLearningStorePlugin"
    public let jsName = "AppleLearningStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transactions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
    ]
    private static let productIDs: Set<String> = Set([
        "membership.monthly.v1", "membership.quarterly.v1", "membership.yearly.v1", "membership.lifetime.v1",
        "ai.credits10.v1", "ai.credits50.v1", "ai.credits100.v1", "ai.credits500.v1"
    ].map { "com.yandaoguoxue.app." + $0 })
    private var updatesTask: Task<Void, Never>?

    public override func load() {
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard !Task.isCancelled else { break }
                guard case .verified(let transaction) = result,
                      Self.productIDs.contains(transaction.productID) else { continue }
                // Never finish here. The server must verify and commit delivery first.
                self?.notifyListeners("transactionUpdate", data: ["transactionId": String(transaction.id)], retainUntilConsumed: true)
            }
        }
    }
    deinit { updatesTask?.cancel() }

    @objc func products(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: Self.productIDs)
                call.resolve(["products": products.map { p in ["productId": p.id, "name": p.displayName, "description": p.description, "displayPrice": p.displayPrice] }])
            } catch { call.reject("无法读取App Store价格，请检查网络后重试") }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("productId"), Self.productIDs.contains(id),
              let tokenString = call.getString("appAccountToken"), let token = UUID(uuidString: tokenString) else {
            call.reject("购买账号或商品无效"); return
        }
        Task { @MainActor in
            do {
                guard AppStore.canMakePayments else { call.reject("设备已限制App内购买，请检查屏幕使用时间设置"); return }
                guard let product = try await Product.products(for: [id]).first else { call.reject("该商品暂不可购买，请稍后重试"); return }
                switch try await product.purchase(options: [.appAccountToken(token)]) {
                case .success(let result):
                    guard case .verified(let tx) = result else { call.reject("苹果交易尚未通过设备验证，请恢复购买重试"); return }
                    call.resolve(["status": "verified", "transactionId": String(tx.id), "signedTransaction": result.jwsRepresentation])
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled: call.resolve(["status": "cancelled"])
                @unknown default: call.reject("苹果购买尚未完成，请稍后恢复购买")
                }
            } catch { call.reject("苹果购买未完成，请检查网络或稍后恢复购买") }
        }
    }
    @objc func transactions(_ call: CAPPluginCall) { collect(call, synchronize: false) }
    @objc func restore(_ call: CAPPluginCall) { collect(call, synchronize: true) }
    private func collect(_ call: CAPPluginCall, synchronize: Bool) {
        Task {
            do {
                if synchronize { try await AppStore.sync() }
                var rows = [[String: String]]()
                // .all retains EVERY non-renewing renewal, not just the latest.
                // Finished consumables are included through the Info.plist key;
                // the server deduplicates and never replenishes consumed credits.
                for await result in Transaction.all {
                    guard case .verified(let tx) = result, Self.productIDs.contains(tx.productID) else { continue }
                    rows.append(["transactionId": String(tx.id), "signedTransaction": result.jwsRepresentation])
                }
                call.resolve(["transactions": rows])
            } catch { call.reject("恢复购买未完成，请检查网络后重试") }
        }
    }
    @objc func finish(_ call: CAPPluginCall) {
        guard let idString = call.getString("transactionId"), let id = UInt64(idString) else { call.reject("交易编号无效"); return }
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let tx) = result, tx.id == id, Self.productIDs.contains(tx.productID) {
                    await tx.finish(); call.resolve(); return
                }
            }
            // A notification or prior retry may already have completed it.
            call.resolve()
        }
    }
}
