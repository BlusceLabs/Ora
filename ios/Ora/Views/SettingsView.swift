import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppStateManager

    var body: some View {
        NavigationStack {
            ZStack {
                Color("OraBackground").ignoresSafeArea()

                List {
                    Section {
                        HStack(spacing: 16) {
                            AvatarView(letters: "ME", color: .blue, size: 64)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("My Account")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(.white)
                                Text("Set a username")
                                    .font(.system(size: 14))
                                    .foregroundColor(Color("OraBlue"))
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    .listRowBackground(Color("OraSurface").opacity(0.6))

                    Section("Account") {
                        SettingsRow(icon: "bell.fill", title: "Notifications", color: .red)
                        SettingsRow(icon: "lock.fill", title: "Privacy & Security", color: .gray)
                        SettingsRow(icon: "gear", title: "General", color: .gray)
                    }
                    .listRowBackground(Color("OraSurface").opacity(0.6))

                    Section("Appearance") {
                        SettingsRow(icon: "paintbrush.fill", title: "Themes", color: Color("OraBlue"))
                        SettingsRow(icon: "textformat", title: "Font Size", color: .orange)
                    }
                    .listRowBackground(Color("OraSurface").opacity(0.6))

                    Section("About") {
                        SettingsRow(icon: "info.circle.fill", title: "Jamii 0.28.6 (iOS)", color: .blue)
                        SettingsRow(icon: "globe", title: "github.com/BlusceLabs/Jamii", color: .green)
                    }
                    .listRowBackground(Color("OraSurface").opacity(0.6))

                    Section {
                        Button(role: .destructive) {
                            appState.signOut()
                        } label: {
                            Text("Sign Out")
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }
                    .listRowBackground(Color("OraSurface").opacity(0.6))
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
                .frame(width: 30, height: 30)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))

            Text(title)
                .foregroundColor(.white)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Color.white.opacity(0.3))
        }
    }
}
