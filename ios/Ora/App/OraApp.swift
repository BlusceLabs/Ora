import SwiftUI

@main
struct OraApp: App {
    @StateObject private var tdlib = TDLibService.shared
    @StateObject private var appState = AppStateManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(tdlib)
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
    }
}
