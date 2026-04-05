import SwiftUI

struct ChatListView: View {
    @StateObject private var vm = ChatListViewModel()
    @State private var searchText: String = ""
    @State private var selectedChat: Chat?

    var filteredChats: [Chat] {
        if searchText.isEmpty { return vm.chats }
        return vm.chats.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color("OraBackground").ignoresSafeArea()

                List {
                    ForEach(filteredChats) { chat in
                        NavigationLink(destination: ChatView(chat: chat)) {
                            ChatRowView(chat: chat)
                        }
                        .listRowBackground(Color("OraSurface").opacity(0.5))
                        .listRowSeparatorTint(Color.white.opacity(0.08))
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .searchable(text: $searchText, prompt: "Search")
            }
            .navigationTitle("Chats")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // New chat
                    } label: {
                        Image(systemName: "square.and.pencil")
                            .foregroundColor(Color("OraBlue"))
                    }
                }
            }
        }
    }
}

struct ChatRowView: View {
    let chat: Chat

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(letters: chat.avatarLetters, color: chat.avatarColor, size: 52)
                .overlay(alignment: .bottomTrailing) {
                    if chat.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 9))
                            .foregroundColor(.white)
                            .padding(3)
                            .background(Color("OraBlue"))
                            .clipShape(Circle())
                            .offset(x: 2, y: 2)
                    }
                }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(chat.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Spacer()

                    Text(formatDate(chat.lastMessageDate))
                        .font(.system(size: 12))
                        .foregroundColor(chat.unreadCount > 0 ? Color("OraBlue") : Color.white.opacity(0.4))
                }

                HStack {
                    if chat.isMuted {
                        Image(systemName: "bell.slash.fill")
                            .font(.system(size: 11))
                            .foregroundColor(Color.white.opacity(0.4))
                    }
                    Text(chat.lastMessage)
                        .font(.system(size: 14))
                        .foregroundColor(Color.white.opacity(0.55))
                        .lineLimit(1)

                    Spacer()

                    if chat.unreadCount > 0 {
                        Text("\(chat.unreadCount)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(chat.isMuted ? Color.white.opacity(0.25) : Color("OraBlue"))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 6)
    }

    func formatDate(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(date) {
            let f = DateFormatter()
            f.dateFormat = "HH:mm"
            return f.string(from: date)
        } else if cal.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let f = DateFormatter()
            f.dateFormat = "MMM d"
            return f.string(from: date)
        }
    }
}

@MainActor
final class ChatListViewModel: ObservableObject {
    @Published var chats: [Chat] = []

    init() {
        TDLibService.shared.loadChats { [weak self] chats in
            self?.chats = chats
        }
    }
}
