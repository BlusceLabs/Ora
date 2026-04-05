import Foundation
import Combine

// TDLib service wrapper for Jamii
// To enable real connectivity:
//   1. Add TDLib.xcframework to the Xcode project (download from https://core.telegram.org/tdlib)
//   2. Set your API_ID and API_HASH from https://core.telegram.org/api/obtaining_api_id
//   3. Uncomment the TDLib import and replace stub calls below
//
// import TDLib

final class TDLibService: ObservableObject {
    static let shared = TDLibService()

    // Replace with your actual credentials from https://core.telegram.org/api/obtaining_api_id
    private let apiId: Int32 = 0
    private let apiHash: String = ""

    private init() {
        configure()
    }

    private func configure() {
        // TODO: Initialize TDLib client here
        // Example:
        //   let client = TdClientId(...)
        //   sendQuery(.setTdlibParameters(...))
    }

    func sendMessage(chatId: Int64, text: String) {
        // TODO: Implement via TDLib
    }

    func loadChats(completion: @escaping ([Chat]) -> Void) {
        // Returns sample data until TDLib is connected
        completion(Chat.sampleData)
    }

    func loadMessages(chatId: Int64, completion: @escaping ([Message]) -> Void) {
        completion(Message.sampleMessages(for: chatId))
    }
}
