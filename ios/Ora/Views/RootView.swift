import SwiftUI

struct RootView: View {
    @EnvironmentObject var appState: AppStateManager

    var body: some View {
        Group {
            switch appState.authState {
            case .splash:
                SplashView()
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            appState.authState = .authenticated
                        }
                    }
            case .phoneEntry:
                AuthView()
            case .codeVerification(let phone):
                CodeVerificationView(phoneNumber: phone)
            case .authenticated:
                MainTabView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authStateId)
    }

    private var authStateId: String {
        switch appState.authState {
        case .splash: return "splash"
        case .phoneEntry: return "phone"
        case .codeVerification: return "code"
        case .authenticated: return "auth"
        }
    }
}
