import SwiftUI

struct SplashView: View {
    @State private var scale: CGFloat = 0.7
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            Color("OraBackground")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                ZStack {
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [Color("OraBlueLight"), Color("OraBlue")],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 110, height: 110)
                        .shadow(color: Color("OraBlue").opacity(0.4), radius: 20, y: 8)

                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 52, weight: .medium))
                        .foregroundColor(.white)
                        .offset(x: 3, y: -3)
                }

                VStack(spacing: 6) {
                    Text("Ora")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Text("by BlusceLabs")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Color.white.opacity(0.5))
                }
            }
            .scaleEffect(scale)
            .opacity(opacity)
            .onAppear {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.75)) {
                    scale = 1.0
                    opacity = 1.0
                }
            }
        }
    }
}
