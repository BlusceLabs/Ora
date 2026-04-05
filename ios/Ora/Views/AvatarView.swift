import SwiftUI

struct AvatarView: View {
    let letters: String
    let color: Chat.AvatarColor
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .fill(LinearGradient(
                    colors: gradientColors,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))

            Text(letters)
                .font(.system(size: size * 0.35, weight: .semibold))
                .foregroundColor(.white)
        }
        .frame(width: size, height: size)
    }

    private var gradientColors: [Color] {
        switch color {
        case .blue:   return [Color(hex: "#2AABEE"), Color(hex: "#229ED9")]
        case .green:  return [Color(hex: "#2AEE6A"), Color(hex: "#1DC959")]
        case .orange: return [Color(hex: "#FFA040"), Color(hex: "#FF8A00")]
        case .purple: return [Color(hex: "#B57BED"), Color(hex: "#9B59D4")]
        case .red:    return [Color(hex: "#EE4040"), Color(hex: "#D92929")]
        case .teal:   return [Color(hex: "#40EEE4"), Color(hex: "#29D9CE")]
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
