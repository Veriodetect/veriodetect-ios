import UIKit
import Capacitor
import StoreKit
import AuthenticationServices
import Security

@objc(VerioCreditsPlugin)
public class VerioCreditsPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "VerioCreditsPlugin"
    public let jsName = "VerioCredits"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "environment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestSandboxRefund", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unfinished", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "session", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSession", returnType: CAPPluginReturnPromise)
    ]
    private let productID = "com.veriodetect.app.xcredits1020"
    private var creditsMode: String? {
        Bundle.main.object(forInfoDictionaryKey: "VerioCreditsEnvironment") as? String
    }
    private func purchaseEnvironment() async throws -> AppStore.Environment? {
        guard case .verified(let transaction) = try await AppTransaction.shared else { return nil }
        switch (creditsMode, transaction.environment) {
        case ("Sandbox", .sandbox), ("AppStore", .sandbox): return .sandbox
        case ("AppStore", .production): return .production
        default: return nil
        }
    }
    @objc func environment(_ call: CAPPluginCall) {
        Task {
            switch try? await purchaseEnvironment() {
            case .some(.sandbox): call.resolve(["environment": "Sandbox"])
            case .some(.production): call.resolve(["environment": "Production"])
            default: call.reject("Apple could not verify this installation.")
            }
        }
    }
    private var updates: Task<Void, Never>?
    private var signInCall: CAPPluginCall?
    private var signInState: String?
    private let sessionService = "com.veriodetect.app.live-x.session"
    @objc func signIn(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), nonce.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
              let state = call.getString("challengeId"), UUID(uuidString: state) != nil else { call.reject("Invalid sign-in challenge."); return }
        DispatchQueue.main.async {
            guard self.signInCall == nil else { call.reject("Sign-in is already in progress."); return }
            self.signInCall = call; self.signInState = state
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email]; request.nonce = nonce; request.state = state
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self; controller.presentationContextProvider = self; controller.performRequests()
        }
    }
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { signInCall = nil; signInState = nil }
        guard let call = signInCall, let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              credential.state == signInState,
              let token = credential.identityToken, let code = credential.authorizationCode,
              let tokenString = String(data: token, encoding: .utf8), let codeString = String(data: code, encoding: .utf8) else {
            signInCall?.reject("Apple sign-in could not be verified."); return
        }
        call.resolve(["status": "signedIn", "identityToken": tokenString, "authorizationCode": codeString])
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        if (error as? ASAuthorizationError)?.code == .canceled { signInCall?.resolve(["status": "cancelled"]) }
        else { signInCall?.reject("Apple sign-in could not be completed.") }
        signInCall = nil; signInState = nil
    }
    private func sessionQuery() -> [String: Any] {
        return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: sessionService, kSecAttrAccount as String: "live-x"]
    }
    @objc func session(_ call: CAPPluginCall) {
        var query = sessionQuery(); query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?; let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { call.resolve(["session": ""]); return }
        guard status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) else { call.reject("Secure sign-in storage is unavailable."); return }
        call.resolve(["session": value])
    }
    @objc func saveSession(_ call: CAPPluginCall) {
        guard let value = call.getString("session"), value.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { call.reject("Invalid session."); return }
        var query = sessionQuery(); let data = Data(value.utf8)
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            query[kSecValueData as String] = data; query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { call.reject("Could not save sign-in securely."); return }
        } else if status != errSecSuccess { call.reject("Could not save sign-in securely."); return }
        call.resolve()
    }
    @objc func clearSession(_ call: CAPPluginCall) {
        let status = SecItemDelete(sessionQuery() as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { call.reject("Could not clear sign-in securely."); return }
        call.resolve()
    }
    public override func load() {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                if case .verified(let transaction) = result, transaction.productID == self.productID,
                   let environment = try? await self.purchaseEnvironment(), transaction.environment == environment {
                    self.notifyListeners("transactionUpdated", data: ["transactionId": String(transaction.id), "signedTransaction": result.jwsRepresentation])
                }
            }
        }
    }
    deinit { updates?.cancel() }
    @objc func products(_ call: CAPPluginCall) {
        guard creditsMode != nil else { call.resolve(["products": []]); return }
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
                guard let environment = try await purchaseEnvironment() else {
                    call.reject("Credit purchases are unavailable in this installation.")
                    return
                }
                guard let product = try await Product.products(for: [productID]).first else {
                    call.reject("This credit pack is not currently available."); return
                }
                let result = try await product.purchase(options: [.appAccountToken(account)])
                switch result {
                case .success(let verification):
                    guard case .verified(let transaction) = verification,
                          transaction.environment == environment else { call.reject("Apple could not verify this purchase."); return }
                    // Finish only after the server confirms durable, idempotent credit delivery.
                    call.resolve(["status": "purchased", "transactionId": String(transaction.id), "signedTransaction": verification.jwsRepresentation])
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled: call.resolve(["status": "cancelled"])
                @unknown default: call.reject("Unexpected App Store purchase state.")
                }
            } catch { call.reject("Purchase could not be completed. Pending purchases can be retried safely.") }
        }
    }
    @objc func requestSandboxRefund(_ call: CAPPluginCall) {
        guard Bundle.main.object(forInfoDictionaryKey: "SKIncludeConsumableInAppPurchaseHistory") as? Bool == true,
              let value = call.getString("accountId"), let account = UUID(uuidString: value) else {
            call.reject("Sandbox refund testing is unavailable.")
            return
        }
        Task { @MainActor in
            do {
                guard case .verified(let appTransaction) = try await AppTransaction.shared,
                      appTransaction.environment == .sandbox,
                      let scene = self.bridge?.viewController?.view.window?.windowScene else {
                    call.reject("Open the TestFlight app to request a sandbox refund.")
                    return
                }
                var latestPurchase: Transaction?
                for await result in Transaction.all {
                    guard case .verified(let transaction) = result,
                          transaction.environment == .sandbox,
                          transaction.productID == productID,
                          transaction.appAccountToken == account,
                          transaction.revocationDate == nil else { continue }
                    if let previous = latestPurchase, previous.purchaseDate >= transaction.purchaseDate { continue }
                    latestPurchase = transaction
                }
                guard let purchase = latestPurchase else {
                    call.reject("No eligible sandbox purchase was found for this account.")
                    return
                }
                let status = try await Transaction.beginRefundRequest(for: purchase.id, in: scene)
                call.resolve(["submitted": status == .success])
            } catch {
                call.reject("Apple could not open the sandbox refund request.")
            }
        }
    }
    @objc func unfinished(_ call: CAPPluginCall) {
        Task {
            guard let environment = try? await purchaseEnvironment() else { call.resolve(["transactions": []]); return }
            var pending: [[String: String]] = []
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result, transaction.productID == productID,
                   transaction.environment == environment {
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
            guard let environment = try? await purchaseEnvironment() else { call.reject("Apple could not verify this installation."); return }
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result, String(transaction.id) == id, transaction.productID == productID,
                   transaction.environment == environment {
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
