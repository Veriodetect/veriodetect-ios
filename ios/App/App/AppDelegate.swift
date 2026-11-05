import UIKit
import Capacitor
import StoreKit

@objc(VerioCreditsPlugin)
public class VerioCreditsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VerioCreditsPlugin"
    public let jsName = "VerioCredits"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unfinished", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]
    private let productID = "com.veriodetect.app.xcredits1020"
    private var updates: Task<Void, Never>?
    public override func load() {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                if case .verified(let transaction) = result, transaction.productID == self.productID {
                    self.notifyListeners("transactionUpdated", data: ["transactionId": String(transaction.id), "signedTransaction": result.jwsRepresentation])
                }
            }
        }
    }
    deinit { updates?.cancel() }
    @objc func products(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: [productID])
                call.resolve(["products": products.map { ["id": $0.id, "name": $0.displayName, "price": $0.displayPrice] }])
            } catch { call.reject("App Store products are unavailable. Please try again later.") }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let value = call.getString("accountId"), let account = UUID(uuidString: value) else {
            call.reject("Approved access is required before purchasing credits."); return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productID]).first else {
                    call.reject("This credit pack is not currently available."); return
                }
                let result = try await product.purchase(options: [.appAccountToken(account)])
                switch result {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else { call.reject("Apple could not verify this purchase."); return }
                    // Finish only after the server confirms durable, idempotent credit delivery.
                    call.resolve(["status": "purchased", "transactionId": String(transaction.id), "signedTransaction": verification.jwsRepresentation])
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled: call.resolve(["status": "cancelled"])
                @unknown default: call.reject("Unexpected App Store purchase state.")
                }
            } catch { call.reject("Purchase could not be completed. Pending purchases can be retried safely.") }
        }
    }
    @objc func unfinished(_ call: CAPPluginCall) {
        Task {
            var pending: [[String: String]] = []
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result, transaction.productID == productID {
                    pending.append(["transactionId": String(transaction.id), "signedTransaction": result.jwsRepresentation])
                }
                if pending.count >= 100 { break }
            }
            call.resolve(["transactions": pending])
        }
    }
    @objc func finish(_ call: CAPPluginCall) {
        guard let id = call.getString("transactionId") else { call.reject("Missing transaction."); return }
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result, String(transaction.id) == id, transaction.productID == productID {
                    await transaction.finish(); call.resolve(); return
                }
            }
            call.resolve() // Already finished: retry is harmless.
        }
    }
}

@objc(VerioBridgeViewController)
class VerioBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(VerioCreditsPlugin())
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
