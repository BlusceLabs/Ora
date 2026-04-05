import SwiftUI
import Combine

enum AuthState {
    case splash
    case phoneEntry
    case codeVerification(phoneNumber: String)
    case authenticated
}

@MainActor
final class AppStateManager: ObservableObject {
    @Published var authState: AuthState = .splash
    @Published var isLoading: Bool = false

    func requestAuth(phone: String) {
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.authState = .codeVerification(phoneNumber: phone)
            self.isLoading = false
        }
    }

    func verifyCode(_ code: String, phone: String) {
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.authState = .authenticated
            self.isLoading = false
        }
    }

    func signOut() {
        authState = .phoneEntry
    }
}
