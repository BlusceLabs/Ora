import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Tab = .chats

    enum Tab: String, CaseIterable {
        case chats, contacts, settings

        var title: String {
            switch self {
            case .chats: return "Chats"
            case .contacts: return "Contacts"
            case .settings: return "Settings"
            }
        }

        var icon: String {
            switch self {
            case .chats: return "bubble.left.and.bubble.right.fill"
            case .contacts: return "person.2.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ChatListView()
                .tabItem {
                    Label("Chats", systemImage: "bubble.left.and.bubble.right.fill")
                }
                .tag(Tab.chats)

            ContactsView()
                .tabItem {
                    Label("Contacts", systemImage: "person.2.fill")
                }
                .tag(Tab.contacts)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(Tab.settings)
        }
        .tint(Color("OraBlue"))
        .preferredColorScheme(.dark)
    }
}
