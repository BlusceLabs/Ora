import SwiftUI

struct ContactsView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color("OraBackground").ignoresSafeArea()

                VStack(spacing: 24) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 56))
                        .foregroundColor(Color.white.opacity(0.15))

                    VStack(spacing: 8) {
                        Text("Contacts")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(Color.white.opacity(0.6))
                        Text("Your contacts will appear here once\nTDLib is connected.")
                            .font(.system(size: 14))
                            .foregroundColor(Color.white.opacity(0.35))
                            .multilineTextAlignment(.center)
                    }
                }
            }
            .navigationTitle("Contacts")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}
