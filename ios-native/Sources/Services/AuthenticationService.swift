import Foundation
import AuthenticationServices

@MainActor
class AuthenticationService: NSObject, ObservableObject {
    static let shared = AuthenticationService()

    @Published var isAuthenticated = false
    @Published var userId: String?
    @Published var email: String?
    @Published var fullName: PersonNameComponents?

    private let userIdKey = "apple_user_id"
    private let emailKey = "user_email"
    private let givenNameKey = "user_given_name"

    override private init() {
        super.init()
        checkExistingAuthState()
    }

    func signInWithApple() {
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    private func checkExistingAuthState() {
        guard let savedUserId = UserDefaults.standard.string(forKey: userIdKey) else {
            return
        }

        // Restore cached profile data immediately so UI doesn't flash
        self.userId = savedUserId
        self.email = UserDefaults.standard.string(forKey: emailKey)
        if let givenName = UserDefaults.standard.string(forKey: givenNameKey) {
            var name = PersonNameComponents()
            name.givenName = givenName
            self.fullName = name
        }
        self.isAuthenticated = true

        // Verify credential is still valid with Apple
        let provider = ASAuthorizationAppleIDProvider()
        provider.getCredentialState(forUserID: savedUserId) { [weak self] state, _ in
            Task { @MainActor in
                guard let self else { return }
                if state != .authorized {
                    // Credential revoked or not found — sign out
                    self.signOut()
                }
            }
        }
    }
}

extension AuthenticationService: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
            self.userId = appleIDCredential.user
            self.isAuthenticated = true

            // Persist userId (always available)
            UserDefaults.standard.set(appleIDCredential.user, forKey: userIdKey)

            // Email/Name only return on FIRST sign in — save if present
            if let email = appleIDCredential.email {
                self.email = email
                UserDefaults.standard.set(email, forKey: emailKey)
            } else {
                self.email = UserDefaults.standard.string(forKey: emailKey)
            }

            if let givenName = appleIDCredential.fullName?.givenName {
                self.fullName = appleIDCredential.fullName
                UserDefaults.standard.set(givenName, forKey: givenNameKey)
            } else if let savedName = UserDefaults.standard.string(forKey: givenNameKey) {
                var name = PersonNameComponents()
                name.givenName = savedName
                self.fullName = name
            }

            print("Successfully signed in user: \(appleIDCredential.user)")
        }
    }

    func signOut() {
        self.isAuthenticated = false
        self.userId = nil
        self.email = nil
        self.fullName = nil

        UserDefaults.standard.removeObject(forKey: userIdKey)
        UserDefaults.standard.removeObject(forKey: emailKey)
        UserDefaults.standard.removeObject(forKey: givenNameKey)
    }
}

extension AuthenticationService: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
}
