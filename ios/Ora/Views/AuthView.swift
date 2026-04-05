import SwiftUI

struct AuthView: View {
    @EnvironmentObject var appState: AppStateManager
    @State private var phoneNumber: String = ""
    @State private var countryCode: String = "+1"

    var body: some View {
        NavigationStack {
            ZStack {
                Color("OraBackground").ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer()

                    VStack(spacing: 32) {
                        VStack(spacing: 16) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 22, style: .continuous)
                                    .fill(LinearGradient(
                                        colors: [Color("OraBlueLight"), Color("OraBlue")],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                    .frame(width: 80, height: 80)
                                    .shadow(color: Color("OraBlue").opacity(0.35), radius: 16, y: 6)
                                Image(systemName: "paperplane.fill")
                                    .font(.system(size: 38, weight: .medium))
                                    .foregroundColor(.white)
                                    .offset(x: 2, y: -2)
                            }

                            VStack(spacing: 8) {
                                Text("Sign in to Jamii")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Enter your phone number to continue")
                                    .font(.system(size: 15))
                                    .foregroundColor(Color.white.opacity(0.55))
                                    .multilineTextAlignment(.center)
                            }
                        }

                        VStack(spacing: 16) {
                            HStack(spacing: 0) {
                                Button(countryCode) {}
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .frame(height: 52)
                                    .background(Color("OraSurface"))
                                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                                Spacer().frame(width: 8)

                                TextField("Phone number", text: $phoneNumber)
                                    .keyboardType(.phonePad)
                                    .font(.system(size: 16))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .frame(height: 52)
                                    .background(Color("OraSurface"))
                                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }

                            Button {
                                appState.requestAuth(phone: countryCode + phoneNumber)
                            } label: {
                                HStack {
                                    if appState.isLoading {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Text("Continue")
                                            .font(.system(size: 17, weight: .semibold))
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(phoneNumber.isEmpty
                                    ? Color("OraBlue").opacity(0.4)
                                    : Color("OraBlue"))
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                            .disabled(phoneNumber.isEmpty || appState.isLoading)
                        }

                        Text("We will send you a verification code.\nCarrier rates may apply.")
                            .font(.system(size: 13))
                            .foregroundColor(Color.white.opacity(0.4))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 28)

                    Spacer()
                }
            }
        }
    }
}

struct CodeVerificationView: View {
    @EnvironmentObject var appState: AppStateManager
    let phoneNumber: String
    @State private var code: String = ""

    var body: some View {
        ZStack {
            Color("OraBackground").ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 16) {
                    Image(systemName: "message.badge.filled.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(Color("OraBlue"), Color("OraBlueLight").opacity(0.3))

                    VStack(spacing: 8) {
                        Text("Enter Code")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.white)
                        Text("Sent to \(phoneNumber)")
                            .font(.system(size: 15))
                            .foregroundColor(Color.white.opacity(0.55))
                    }
                }

                TextField("- - - - - -", text: $code)
                    .keyboardType(.numberPad)
                    .font(.system(size: 32, weight: .semibold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color("OraSurface"))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .padding(.horizontal, 28)

                Button {
                    appState.verifyCode(code, phone: phoneNumber)
                } label: {
                    Text("Verify")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(code.count >= 5 ? Color("OraBlue") : Color("OraBlue").opacity(0.4))
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .disabled(code.count < 5)
                .padding(.horizontal, 28)

                Button("Use a different number") {
                    appState.authState = .phoneEntry
                }
                .font(.system(size: 15))
                .foregroundColor(Color("OraBlue"))

                Spacer()
            }
        }
    }
}
