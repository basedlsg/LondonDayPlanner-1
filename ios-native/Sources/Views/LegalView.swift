import SwiftUI

enum LegalType {
    case privacy
    case terms

    var title: String {
        switch self {
        case .privacy: return "Privacy Policy"
        case .terms: return "Terms of Service"
        }
    }

    var icon: String {
        switch self {
        case .privacy: return "lock.shield.fill"
        case .terms: return "doc.text.fill"
        }
    }

    var lastUpdated: String {
        "February 1, 2026"
    }
}

struct LegalView: View {
    let type: LegalType

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.md) {
                // Header
                header
                    .padding(.top, DesignTokens.Spacing.sm)

                // Content sections
                if type == .privacy {
                    privacySections
                } else {
                    termsSections
                }

                // Footer
                footer
                    .padding(.bottom, DesignTokens.Spacing.lg)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
        }
        .background(DesignTokens.Gradients.brandBackground.ignoresSafeArea())
        .navigationTitle(type.title)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Header

    private var header: some View {
        GlassCard(variant: .frosted) {
            VStack(spacing: 12) {
                Image(systemName: type.icon)
                    .font(.system(size: 36))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [DesignTokens.Colors.brandPinkTop, DesignTokens.Colors.stitchPrimary],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text(type.title)
                    .font(.title2.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)

                Text("Last updated \(type.lastUpdated)")
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(DesignTokens.Spacing.sm)
        }
    }

    // MARK: - Footer

    private var footer: some View {
        GlassCard(variant: .light) {
            VStack(spacing: 8) {
                Text("Plan Your Perfect Day")
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text("Questions? Reach us at support@plandaily.app")
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(DesignTokens.Spacing.sm)
        }
    }

    // MARK: - Section Builder

    private func section(number: Int, title: String, content: String) -> some View {
        GlassCard(variant: .light) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Text("\(number)")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [DesignTokens.Colors.brandPinkTop, DesignTokens.Colors.brandBlueBottom],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )

                    Text(title)
                        .font(.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                }

                Text(content)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(DesignTokens.Spacing.sm)
        }
    }

    private func bulletSection(number: Int, title: String, intro: String, bullets: [String], outro: String? = nil) -> some View {
        GlassCard(variant: .light) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Text("\(number)")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [DesignTokens.Colors.brandPinkTop, DesignTokens.Colors.brandBlueBottom],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )

                    Text(title)
                        .font(.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                }

                Text(intro)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .lineSpacing(4)

                VStack(alignment: .leading, spacing: 6) {
                    ForEach(bullets, id: \.self) { bullet in
                        HStack(alignment: .top, spacing: 8) {
                            Circle()
                                .fill(DesignTokens.Colors.stitchPrimary.opacity(0.5))
                                .frame(width: 6, height: 6)
                                .padding(.top, 6)
                            Text(bullet)
                                .font(.subheadline)
                                .foregroundStyle(DesignTokens.Colors.textSecondary)
                                .lineSpacing(4)
                        }
                    }
                }
                .padding(.leading, 4)

                if let outro {
                    Text(outro)
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .lineSpacing(4)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(DesignTokens.Spacing.sm)
        }
    }

    // MARK: - Privacy Sections

    private var privacySections: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            section(
                number: 1,
                title: "Information We Collect",
                content: "We do not collect any personally identifiable information. All itinerary data, including preferences and dates, is processed locally on your device or sent anonymously to our AI service for generation purposes only. We do not store your personal activity data on our servers permanently."
            )

            section(
                number: 2,
                title: "Sign in with Apple",
                content: "If you choose to use \"Sign in with Apple\", we authenticate you using Apple's secure service. We receive only a unique identifier and, if you choose to share it, your email address and name to personalize your experience. This data is not sold to third parties."
            )

            section(
                number: 3,
                title: "Location Data",
                content: "We ask for location access solely to provide distance calculations and navigation features within the generated itinerary. This location data is not stored on our servers or shared with advertisers."
            )

            section(
                number: 4,
                title: "Third-Party Services",
                content: "We use Apple Maps for navigation and mapping services. Use of Apple Maps is subject to Apple's Privacy Policy."
            )

            section(
                number: 5,
                title: "Contact Us",
                content: "If you have any questions about our privacy policy, please contact us at support@plandaily.app."
            )
        }
    }

    // MARK: - Terms Sections

    private var termsSections: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            section(
                number: 1,
                title: "Terms",
                content: "By accessing Plan Your Perfect Day, you agree to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this app."
            )

            bulletSection(
                number: 2,
                title: "Use License",
                intro: "Permission is granted to temporarily download one copy of the materials on Plan Daily Limited's application for personal, non-commercial transitory viewing only. Under this license you may not:",
                bullets: [
                    "Modify or copy the materials",
                    "Use the materials for any commercial purpose or public display",
                    "Attempt to decompile or reverse engineer any software contained in the application",
                    "Remove any copyright or other proprietary notations from the materials",
                    "Transfer the materials to another person or mirror the materials on any other server",
                ],
                outro: "This license shall automatically terminate if you violate any of these restrictions and may be terminated by Plan Daily Limited at any time."
            )

            section(
                number: 3,
                title: "Disclaimer",
                content: "The materials on Plan Daily Limited's application are provided on an \"as is\" basis. Plan Daily Limited makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including implied warranties of merchantability, fitness for a particular purpose, or non-infringement of intellectual property."
            )

            section(
                number: 4,
                title: "Limitations",
                content: "In no event shall Plan Daily Limited or its suppliers be liable for any damages arising out of the use or inability to use the materials on Plan Daily Limited's application, even if Plan Daily Limited has been notified of the possibility of such damage."
            )

            section(
                number: 5,
                title: "Accuracy of Materials",
                content: "The materials appearing on Plan Daily Limited's application could include technical, typographical, or photographic errors. Plan Daily Limited does not warrant that any of the materials are accurate, complete, or current. Changes may be made at any time without notice."
            )

            section(
                number: 6,
                title: "Modifications",
                content: "Plan Daily Limited may revise these terms of service at any time without notice. By using this application you are agreeing to be bound by the then current version of these terms of service."
            )

            section(
                number: 7,
                title: "Governing Law",
                content: "These terms and conditions are governed by and construed in accordance with the laws of the United Kingdom and you irrevocably submit to the exclusive jurisdiction of the courts in that location."
            )
        }
    }
}
