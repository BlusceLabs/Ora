import SwiftUI

struct ChatView: View {
    let chat: Chat
    @StateObject private var vm: ChatViewModel
    @State private var messageText: String = ""
    @State private var scrollProxy: ScrollViewProxy?
    @FocusState private var isInputFocused: Bool

    init(chat: Chat) {
        self.chat = chat
        _vm = StateObject(wrappedValue: ChatViewModel(chatId: chat.id))
    }

    var body: some View {
        ZStack {
            Color("OraBackground").ignoresSafeArea()

            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 4) {
                            ForEach(vm.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                    }
                    .onAppear {
                        if let last = vm.messages.last {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }

                Divider()
                    .background(Color.white.opacity(0.1))

                HStack(spacing: 10) {
                    Button {
                        // Attachment
                    } label: {
                        Image(systemName: "paperclip")
                            .font(.system(size: 22))
                            .foregroundColor(Color.white.opacity(0.5))
                    }

                    TextField("Message", text: $messageText, axis: .vertical)
                        .lineLimit(1...5)
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color("OraSurface"))
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .focused($isInputFocused)

                    Button {
                        sendMessage()
                    } label: {
                        Image(systemName: messageText.isEmpty ? "mic.fill" : "paperplane.fill")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 38, height: 38)
                            .background(Color("OraBlue"))
                            .clipShape(Circle())
                    }
                    .animation(.spring(response: 0.25), value: messageText.isEmpty)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color("OraBackground"))
            }
        }
        .navigationTitle(chat.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(chat.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    Text("online")
                        .font(.system(size: 12))
                        .foregroundColor(Color("OraBlue"))
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                AvatarView(letters: chat.avatarLetters, color: chat.avatarColor, size: 34)
            }
        }
    }

    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        vm.send(text: messageText)
        messageText = ""
    }
}

struct MessageBubble: View {
    let message: Message

    var body: some View {
        HStack {
            if message.isOutgoing { Spacer(minLength: 60) }

            VStack(alignment: message.isOutgoing ? .trailing : .leading, spacing: 4) {
                Text(message.text)
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(message.isOutgoing ? Color("OraBlue") : Color("OraSurface"))
                    .clipShape(BubbleShape(isOutgoing: message.isOutgoing))

                HStack(spacing: 4) {
                    Text(formatTime(message.date))
                        .font(.system(size: 11))
                        .foregroundColor(Color.white.opacity(0.4))

                    if message.isOutgoing {
                        Image(systemName: statusIcon(message.status))
                            .font(.system(size: 11))
                            .foregroundColor(message.status == .read ? Color("OraBlue") : Color.white.opacity(0.4))
                    }
                }
            }

            if !message.isOutgoing { Spacer(minLength: 60) }
        }
    }

    private func formatTime(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }

    private func statusIcon(_ status: Message.MessageStatus) -> String {
        switch status {
        case .sending: return "clock"
        case .sent: return "checkmark"
        case .delivered: return "checkmark.circle"
        case .read: return "checkmark.circle.fill"
        case .failed: return "exclamationmark.circle"
        }
    }
}

struct BubbleShape: Shape {
    let isOutgoing: Bool

    func path(in rect: CGRect) -> Path {
        let r: CGFloat = 16
        let tailR: CGFloat = 4
        var path = Path()

        if isOutgoing {
            path.addRoundedRect(in: CGRect(x: rect.minX, y: rect.minY,
                                           width: rect.width - tailR, height: rect.height),
                                cornerSize: CGSize(width: r, height: r))
        } else {
            path.addRoundedRect(in: CGRect(x: rect.minX + tailR, y: rect.minY,
                                           width: rect.width - tailR, height: rect.height),
                                cornerSize: CGSize(width: r, height: r))
        }
        return path
    }
}

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    private let chatId: Int64

    init(chatId: Int64) {
        self.chatId = chatId
        TDLibService.shared.loadMessages(chatId: chatId) { [weak self] messages in
            self?.messages = messages
        }
    }

    func send(text: String) {
        let msg = Message(
            id: Int64(Date().timeIntervalSince1970 * 1000),
            chatId: chatId,
            text: text,
            date: Date(),
            isOutgoing: true,
            status: .sending
        )
        messages.append(msg)
        TDLibService.shared.sendMessage(chatId: chatId, text: text)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in
            if let idx = self?.messages.firstIndex(where: { $0.id == msg.id }) {
                self?.messages[idx] = Message(id: msg.id, chatId: msg.chatId, text: msg.text,
                                              date: msg.date, isOutgoing: true, status: .delivered)
            }
        }
    }
}
