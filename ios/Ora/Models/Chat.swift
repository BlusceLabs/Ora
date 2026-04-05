import Foundation

struct Chat: Identifiable, Hashable {
    let id: Int64
    var title: String
    var lastMessage: String
    var lastMessageDate: Date
    var unreadCount: Int
    var avatarLetters: String
    var avatarColor: AvatarColor
    var isPinned: Bool
    var isMuted: Bool

    enum AvatarColor: String, CaseIterable {
        case blue, green, orange, purple, red, teal

        var pair: (String, String) {
            switch self {
            case .blue:   return ("#2AABEE", "#229ED9")
            case .green:  return ("#2AEE6A", "#1DC959")
            case .orange: return ("#FFA040", "#FF8A00")
            case .purple: return ("#B57BED", "#9B59D4")
            case .red:    return ("#EE4040", "#D92929")
            case .teal:   return ("#40EEE4", "#29D9CE")
            }
        }
    }

    static let sampleData: [Chat] = [
        Chat(id: 1, title: "BlusceLabs Team", lastMessage: "New build is ready 🎉", lastMessageDate: Date(), unreadCount: 3, avatarLetters: "BL", avatarColor: .blue, isPinned: true, isMuted: false),
        Chat(id: 2, title: "Alex Johnson", lastMessage: "Can you review the PR?", lastMessageDate: Date().addingTimeInterval(-300), unreadCount: 1, avatarLetters: "AJ", avatarColor: .green, isPinned: false, isMuted: false),
        Chat(id: 3, title: "Design Reviews", lastMessage: "Updated mockups attached", lastMessageDate: Date().addingTimeInterval(-3600), unreadCount: 0, avatarLetters: "DR", avatarColor: .purple, isPinned: false, isMuted: true),
        Chat(id: 4, title: "Maria Sanchez", lastMessage: "Thanks, see you tomorrow!", lastMessageDate: Date().addingTimeInterval(-7200), unreadCount: 0, avatarLetters: "MS", avatarColor: .orange, isPinned: false, isMuted: false),
        Chat(id: 5, title: "iOS Dev", lastMessage: "Build passed on TestFlight", lastMessageDate: Date().addingTimeInterval(-86400), unreadCount: 12, avatarLetters: "ID", avatarColor: .teal, isPinned: false, isMuted: false),
        Chat(id: 6, title: "Jordan Kim", lastMessage: "Looks great!", lastMessageDate: Date().addingTimeInterval(-172800), unreadCount: 0, avatarLetters: "JK", avatarColor: .red, isPinned: false, isMuted: false),
    ]
}

struct Message: Identifiable {
    let id: Int64
    let chatId: Int64
    var text: String
    var date: Date
    var isOutgoing: Bool
    var status: MessageStatus

    enum MessageStatus {
        case sending, sent, delivered, read, failed
    }

    static func sampleMessages(for chatId: Int64) -> [Message] {
        [
            Message(id: 1, chatId: chatId, text: "Hey! How's everything going?", date: Date().addingTimeInterval(-3600), isOutgoing: false, status: .read),
            Message(id: 2, chatId: chatId, text: "Going great, thanks! Just finishing up the new Ora build.", date: Date().addingTimeInterval(-3500), isOutgoing: true, status: .read),
            Message(id: 3, chatId: chatId, text: "Nice! When will it be ready?", date: Date().addingTimeInterval(-3400), isOutgoing: false, status: .read),
            Message(id: 4, chatId: chatId, text: "Should be done by tomorrow. The arm64 APK is already out 🚀", date: Date().addingTimeInterval(-3300), isOutgoing: true, status: .read),
            Message(id: 5, chatId: chatId, text: "Awesome work 🎉", date: Date().addingTimeInterval(-3200), isOutgoing: false, status: .read),
        ]
    }
}
