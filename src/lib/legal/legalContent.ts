export type LegalSection = {
    id: string;
    title: string;
    body?: string[];
    bullets?: string[];
    table?: {
        headers: string[];
        rows: string[][];
    };
};

export type LegalPageContent = {
    slug: string;
    title: string;
    description: string;
    lastUpdated: string;
    sections: LegalSection[];
};

export const LEGAL_SUPPORT_EMAIL = "support@shotcutcrew.com";
export const LEGAL_TERMS_VERSION = "v2.0";
export const LEGAL_LAST_UPDATED = "May 2026";

export const legalPages = {
    terms: {
        slug: "terms",
        title: "Terms of Service",
        description: "Platform terms for clients, creative providers, studios, and equipment providers using ShotcutCrew.",
        lastUpdated: LEGAL_LAST_UPDATED,
        sections: [
            {
                id: "introduction",
                title: "Introduction",
                body: [
                    "Please read these Terms of Service carefully before using ShotcutCrew. By accessing or using the platform, you agree to be bound by these terms. If you do not agree, you must not use the platform.",
                    "ShotcutCrew is an AI-enabled creative production marketplace and operating platform operated by Parichay Production Pvt Ltd, Bilaspur, Chhattisgarh. The platform connects clients with verified creative providers, production studios, post-production teams, and equipment providers across India.",
                ],
            },
            {
                id: "definitions",
                title: "Definitions",
                bullets: [
                    "Platform means the ShotcutCrew website, application, and related services operated by Parichay Production Pvt Ltd.",
                    "Client means an individual or entity using ShotcutCrew to search for, book, or hire creative services or equipment.",
                    "Provider means a creative provider, studio, production team, post-production professional, or equipment provider listed on the platform.",
                    "Creative Provider means photographers, videographers, editors, DOPs, production crew, studios, and post-production artists.",
                    "Equipment Provider means camera rental houses, lighting vendors, drone vendors, livestream equipment providers, and production gear suppliers.",
                    "Booking means a confirmed or submitted request facilitated through the platform.",
                    "Parichay Shoot Assurance means optional coordinator support for selected shoots.",
                ],
            },
            {
                id: "eligibility",
                title: "Eligibility",
                bullets: [
                    "You must be at least 18 years old to create an account or use ShotcutCrew.",
                    "You must have legal capacity to enter into binding agreements.",
                    "All account, booking, provider, KYC, and payment information you provide must be accurate and current.",
                    "You must not use the platform for unlawful, fraudulent, abusive, or misleading activity.",
                ],
            },
            {
                id: "accounts",
                title: "Account Registration",
                bullets: [
                    "Users must register an account to access core booking, provider, and marketplace features.",
                    "You are responsible for maintaining the confidentiality of your login credentials.",
                    "You must notify ShotcutCrew at support@shotcutcrew.com of unauthorized account access.",
                    "ShotcutCrew may suspend or terminate accounts that violate these terms, platform policies, or applicable law.",
                ],
            },
            {
                id: "provider-listing",
                title: "Provider Verification And Listing",
                bullets: [
                    "Creative providers, studios, and equipment providers may be required to complete verification before receiving booking or rental requests.",
                    "Verification may include identity checks, portfolio review, service capability assessment, equipment capability review, and agreement to applicable provider terms.",
                    "Providers must accurately represent skills, experience, equipment, portfolio, pricing, service locations, and availability.",
                    "False portfolio claims, misleading inventory, or inaccurate service representations may result in delisting, suspension, or further action.",
                ],
            },
            {
                id: "booking-process",
                title: "Booking Process",
                bullets: [
                    "Quick Booking supports fast creator discovery and booking for simpler shoots.",
                    "Custom Project Builder supports RFQ-style planning for larger or custom productions.",
                    "Equipment Rental supports gear, delivery, pickup, operator, and availability-based workflows.",
                    "AI Script Analysis acts as a production planning assistant and does not itself create a confirmed booking.",
                    "Clients must provide accurate shoot details, location, schedule, requirements, and budget information.",
                    "Providers operate as independent businesses and are responsible for confirming their availability and capability.",
                ],
            },
            {
                id: "payments",
                title: "Payments And Platform Fees",
                body: [
                    "Payments must be made through ShotcutCrew’s designated payment methods. Off-platform payments with contacts discovered through ShotcutCrew are prohibited and may void platform support, payment tracking, Shoot Assurance, and dispute assistance.",
                    "ShotcutCrew may collect payments and temporarily hold funds in an internal platform-controlled payment workflow until delivery, refund review, dispute handling, fraud checks, or payout settlement is complete. This payment workflow should not be understood as a regulated banking escrow unless separately enabled by an authorized payment provider.",
                ],
                bullets: [
                    "Client service fee may range from 3% to 5% depending on booking value.",
                    "Quick Booking may require full upfront payment.",
                    "Custom Projects may support advance payments and milestone-based settlement.",
                    "Equipment Rentals may require rental advance, security deposit, delivery fee, operator fee, late-return charges, or damage recovery.",
                    "Provider payout is calculated after platform commission, applicable deductions, dispute holds, and tax or compliance review.",
                    "All payments are server-side verified before booking confirmation where payment verification is required.",
                ],
            },
            {
                id: "taxes",
                title: "GST And Taxes",
                bullets: [
                    "All amounts are quoted in Indian Rupees unless otherwise stated.",
                    "GST or applicable taxes may be charged additionally where legally required.",
                    "Providers are responsible for their own GST, tax, accounting, and invoice compliance unless ShotcutCrew explicitly invoices or remits on their behalf.",
                    "ShotcutCrew may collect and remit applicable platform taxes and service fees where legally required.",
                ],
            },
            {
                id: "refunds",
                title: "Cancellations And Refunds",
                body: [
                    "Refund eligibility depends on booking type, cancellation timing, provider status, work already performed, payment method, and dispute review. The dedicated Refund & Cancellation Policy forms part of these Terms.",
                ],
                table: {
                    headers: ["Client Cancellation Timing", "General Refund Reference"],
                    rows: [
                        ["More than 7 days before shoot", "100% refund minus platform processing fee of Rs 50 to Rs 200"],
                        ["3 to 7 days before shoot", "50% refund"],
                        ["1 to 2 days before shoot", "25% refund"],
                        ["Less than 24 hours or no-show", "No refund"],
                    ],
                },
            },
            {
                id: "disputes",
                title: "Dispute Handling",
                body: [
                    "Disputes should be reported to ShotcutCrew within 48 hours of delivery, scheduled shoot, rental return, or the relevant incident. ShotcutCrew may assist in mediation and dispute handling between clients and providers.",
                    "ShotcutCrew may temporarily hold payouts, request evidence, review communication, inspect proof of work, issue adjustments where appropriate, and support a practical resolution. Legal disputes remain subject to Indian law and the courts of Bilaspur, Chhattisgarh, India.",
                ],
            },
            {
                id: "ai",
                title: "AI-Assisted Features",
                body: [
                    "ShotcutCrew may use AI systems including Gemini, OpenAI, OpenRouter, and internal automation systems for script analysis, production planning, recommendations, matching, budget guidance, scheduling suggestions, and workflow automation.",
                    "AI outputs may contain inaccuracies and should be independently reviewed. AI recommendations do not replace professional production, legal, financial, tax, safety, or compliance judgment.",
                ],
            },
            {
                id: "ip",
                title: "Intellectual Property",
                bullets: [
                    "ShotcutCrew brand assets, UI, software, and platform design are the intellectual property of Parichay Production Pvt Ltd.",
                    "Providers retain ownership of creative work unless otherwise agreed with the client in writing.",
                    "Clients receive usage rights for delivered content according to the booking scope or written agreement.",
                    "Portfolio content uploaded by providers must be owned, licensed, or authorized for use by the provider.",
                ],
            },
            {
                id: "conduct",
                title: "Prohibited Conduct",
                bullets: [
                    "Circumventing the platform for off-platform transactions with contacts discovered through ShotcutCrew.",
                    "Posting false reviews, fake portfolios, misleading inventory, or fraudulent service claims.",
                    "Harassment, threats, intimidation, discrimination, or unsafe production behavior.",
                    "Hacking, scraping, reverse engineering, disrupting, or abusing platform systems.",
                    "Misrepresenting identity, credentials, licenses, equipment ownership, or legal permissions.",
                ],
            },
            {
                id: "liability",
                title: "Limitation Of Liability",
                body: [
                    "To the maximum extent permitted by Indian law, ShotcutCrew is a technology marketplace and is not liable for the quality, safety, legality, or accuracy of services or equipment supplied by independent providers.",
                    "ShotcutCrew is not liable for indirect, incidental, special, or consequential damages. The platform’s total liability to any user shall not exceed the amount paid by that user to ShotcutCrew in the three months preceding the claim.",
                ],
            },
            {
                id: "law",
                title: "Governing Law And Contact",
                body: [
                    "These Terms are governed by the laws of India. Courts in Bilaspur, Chhattisgarh, India will have jurisdiction, subject to applicable law.",
                    `For questions, contact ${LEGAL_SUPPORT_EMAIL}.`,
                ],
            },
        ],
    },
    privacy: {
        slug: "privacy",
        title: "Privacy Policy",
        description: "How ShotcutCrew collects, uses, shares, protects, and retains data for marketplace operations.",
        lastUpdated: LEGAL_LAST_UPDATED,
        sections: [
            {
                id: "overview",
                title: "Overview",
                body: [
                    "ShotcutCrew is committed to protecting user privacy. This Privacy Policy explains how Parichay Production Pvt Ltd collects, uses, shares, and protects information when clients, providers, studios, equipment vendors, coordinators, and admins use the platform.",
                    "ShotcutCrew does not sell personal data.",
                ],
            },
            {
                id: "information",
                title: "Information We Collect",
                bullets: [
                    "Name, email address, phone number, WhatsApp number, city, state, profile photo, and account role.",
                    "Provider KYC, portfolio, skills, service descriptions, pricing, availability, equipment, inventory, and business profile details.",
                    "Booking data, shoot requirements, scripts, project briefs, locations, schedules, rental dates, communication, disputes, proof uploads, and workflow updates.",
                    "Payment information processed by third-party gateways; ShotcutCrew does not store full card details.",
                    "IP address, browser, device identifiers, operating system, usage analytics, cookies, and approximate location data when permitted.",
                ],
            },
            {
                id: "use",
                title: "How We Use Information",
                bullets: [
                    "Create accounts, manage profiles, verify providers, and operate marketplace features.",
                    "Facilitate bookings, rental requests, provider matching, payment tracking, payout workflows, disputes, and notifications.",
                    "Operate AI Script Analysis, production planning, matching, recommendations, budget guidance, scheduling suggestions, and workflow automation.",
                    "Improve platform reliability, security, fraud prevention, analytics, and customer support.",
                    "Send booking confirmations, receipts, reminders, service notifications, and optional marketing communications.",
                    "Comply with legal, tax, accounting, security, and regulatory obligations under Indian law.",
                ],
            },
            {
                id: "ai-processing",
                title: "AI Processing",
                body: [
                    "ShotcutCrew may use Gemini, OpenAI, OpenRouter, and internal automation systems to process scripts, briefs, booking requirements, portfolio signals, service tags, and workflow data for recommendations, planning, matching, and operational automation.",
                    "Users should avoid submitting confidential third-party material unless they have permission to do so. AI-generated outputs may contain inaccuracies and should be reviewed independently.",
                ],
            },
            {
                id: "sharing",
                title: "Sharing Of Information",
                bullets: [
                    "With clients and providers as necessary to facilitate bookings, rental requests, communication, delivery, and dispute handling.",
                    "With payment processors such as Razorpay or equivalent providers to process transactions.",
                    "With cloud, analytics, storage, communication, AI, and automation service providers who help operate the platform.",
                    "With legal authorities, auditors, advisors, or investors where required by law, due diligence, or confidentiality obligations.",
                    "ShotcutCrew does not sell personal data.",
                ],
            },
            {
                id: "retention",
                title: "Data Retention",
                bullets: [
                    "Account data is retained while the account is active and for a reasonable period after closure.",
                    "Transaction and booking records may be retained for up to 7 years for Indian tax and accounting compliance.",
                    "KYC records may be retained for compliance and trust-safety requirements, then securely deleted when no longer needed.",
                    "Users may request deletion, subject to legal retention obligations and unresolved payments, disputes, or fraud checks.",
                ],
            },
            {
                id: "rights",
                title: "User Rights",
                bullets: [
                    "Request access to personal data held by ShotcutCrew.",
                    "Request correction of inaccurate or incomplete data.",
                    "Request deletion where legally permitted.",
                    "Withdraw optional marketing consent.",
                    "Contact support@shotcutcrew.com for privacy requests.",
                ],
            },
            {
                id: "security",
                title: "Data Security",
                bullets: [
                    "ShotcutCrew uses HTTPS, access controls, server-side payment verification, and security practices appropriate for a modern SaaS marketplace.",
                    "Payment transactions are processed through encrypted third-party payment systems.",
                    "Sensitive operational data is limited to authorized team members where needed for support, compliance, verification, or dispute handling.",
                ],
            },
            {
                id: "cookies",
                title: "Cookies And Third-Party Links",
                body: [
                    "ShotcutCrew may use essential, analytics, and preference cookies. Users can control cookies through browser settings, although disabling certain cookies may affect platform functionality.",
                    "The platform may link to third-party websites. ShotcutCrew is not responsible for third-party privacy practices.",
                ],
            },
            {
                id: "contact",
                title: "Privacy Contact",
                body: [
                    `Data Controller: Parichay Production Pvt Ltd, Bilaspur, Chhattisgarh, India. Contact: ${LEGAL_SUPPORT_EMAIL}.`,
                ],
            },
        ],
    },
    refund: {
        slug: "refund-policy",
        title: "Refund & Cancellation Policy",
        description: "Cancellation, refund, dispute, and equipment rental deduction rules for ShotcutCrew bookings.",
        lastUpdated: LEGAL_LAST_UPDATED,
        sections: [
            {
                id: "overview",
                title: "Overview",
                body: [
                    "This policy is based on ShotcutCrew’s business operations document and applies to marketplace bookings, custom projects, and equipment rental requests. Refunds depend on timing, provider status, completed work, rental logistics, payment method, and dispute review.",
                ],
            },
            {
                id: "client-cancellations",
                title: "Client Cancellations",
                table: {
                    headers: ["Cancellation Timing", "Refund Policy"],
                    rows: [
                        ["More than 7 days before shoot", "100% refund minus platform processing fee of Rs 50 to Rs 200"],
                        ["3 to 7 days before shoot", "50% refund"],
                        ["1 to 2 days before shoot", "25% refund"],
                        ["Less than 24 hours or no-show", "No refund"],
                    ],
                },
            },
            {
                id: "quick-booking",
                title: "Quick Booking",
                bullets: [
                    "Quick Booking is designed for fast creator discovery and may require full upfront payment.",
                    "Refunds follow the cancellation timing table unless a provider cancellation, verified failure, or dispute review changes the outcome.",
                    "If a selected provider rejects or cannot perform the booking, ShotcutCrew may help the client choose another provider or review refund options.",
                ],
            },
            {
                id: "custom-projects",
                title: "Custom Projects",
                bullets: [
                    "Custom Projects may use advance payments and milestone-based settlement.",
                    "Work already completed, pre-production planning, purchased materials, confirmed crew allocation, and delivery progress may reduce refundable amounts.",
                    "Refunds for custom projects may be reviewed case by case because scope, crew, equipment, and milestone commitments vary.",
                ],
            },
            {
                id: "equipment-rentals",
                title: "Equipment Rentals",
                bullets: [
                    "Equipment rentals may include rental advance, security deposit, delivery fee, operator fee, logistics fee, and late-return or damage charges.",
                    "Security deposits may be adjusted for verified damage, missing items, late return, cleaning, repair, transport, or downtime caused by misuse.",
                    "Delivery or pickup costs already incurred may be non-refundable.",
                    "Drone, livestream, lighting, and specialty gear may require operator support or compliance checks before use.",
                ],
            },
            {
                id: "provider-cancellations",
                title: "Provider Cancellations",
                bullets: [
                    "Clients are eligible for refund review or replacement assistance if a provider cancels.",
                    "Creative providers who cancel within 48 hours of a confirmed booking may face platform penalties.",
                    "Repeated cancellations may lead to reduced visibility, payout holds, or account suspension.",
                ],
            },
            {
                id: "refund-review",
                title: "Refund Review And Timing",
                bullets: [
                    "Refund requests may require evidence, communication review, payment verification, delivery proof, equipment inspection, or dispute review.",
                    "Approved refunds are generally processed within 7 to 10 business days, subject to payment gateway and banking timelines.",
                    "ShotcutCrew may temporarily hold payments during fraud prevention, dispute handling, refund review, or compliance checks.",
                ],
            },
            {
                id: "disputes",
                title: "Disputes",
                body: [
                    "ShotcutCrew may assist in mediation and dispute handling between clients and providers. The platform may request evidence and may withhold, adjust, or release payments based on review of the booking, delivery, rental return, and communication records.",
                ],
            },
        ],
    },
    creatorAgreement: {
        slug: "creator-agreement",
        title: "Creator / Provider Agreement",
        description: "Standards for creative providers, studios, equipment vendors, and production professionals on ShotcutCrew.",
        lastUpdated: LEGAL_LAST_UPDATED,
        sections: [
            {
                id: "overview",
                title: "Overview",
                body: [
                    "This agreement applies to creative providers, production studios, post-production professionals, equipment vendors, and production support teams using ShotcutCrew. Providers operate as independent businesses and are not employees of ShotcutCrew unless explicitly agreed in writing.",
                ],
            },
            {
                id: "obligations",
                title: "Provider Obligations",
                bullets: [
                    "Maintain accurate profile, portfolio, skills, equipment, pricing, city, service area, availability, and business information.",
                    "Respond to booking, RFQ, and rental inquiries within expected timelines.",
                    "Arrive or deliver equipment on time, prepared, and professionally.",
                    "Deliver agreed work, files, equipment, or services within confirmed scope and timeline.",
                    "Communicate respectfully with clients, coordinators, and ShotcutCrew team members.",
                ],
            },
            {
                id: "quality",
                title: "Quality Standards",
                bullets: [
                    "Delivered work must meet the quality, format, timeline, and scope agreed at booking.",
                    "Providers must have ownership, license, or legal authorization for portfolio work and equipment used.",
                    "Equipment must be maintained, functional, safe, and accurately represented.",
                    "Post-production work must be delivered in the formats and timelines agreed with the client.",
                ],
            },
            {
                id: "conduct",
                title: "Marketplace Conduct",
                bullets: [
                    "No fake reviews, misleading portfolios, false inventory, inflated claims, harassment, or off-platform payment circumvention.",
                    "Providers must respect intellectual property, client confidentiality, production safety, and platform payment integrity.",
                    "Unsafe production practices, fraudulent conduct, or repeated cancellations may lead to suspension or delisting.",
                ],
            },
            {
                id: "commission",
                title: "Commission, Subscription, And Payouts",
                bullets: [
                    "ShotcutCrew may deduct platform commission from completed bookings or rentals.",
                    "Subscription plans, if offered, are visibility/tool plans and are separate from marketplace trust tiers.",
                    "Payouts may be withheld during disputes, refund review, fraud checks, compliance checks, or incomplete delivery.",
                    "Providers are responsible for GST, income tax, and business compliance unless ShotcutCrew explicitly handles an item.",
                ],
            },
            {
                id: "tiers",
                title: "Ratings And Marketplace Tiers",
                body: [
                    "Marketplace ranking may consider completed projects, review score, response time, cancellation rate, dispute history, profile completeness, subscription plan, and verification level. Reviews may be removed only in cases of verified abuse or policy violation.",
                ],
            },
        ],
    },
    equipmentRentalTerms: {
        slug: "equipment-rental-terms",
        title: "Equipment Rental Terms",
        description: "Rental marketplace terms for clients and equipment providers using ShotcutCrew.",
        lastUpdated: LEGAL_LAST_UPDATED,
        sections: [
            {
                id: "overview",
                title: "Overview",
                body: [
                    "ShotcutCrew supports equipment rental requests for cameras, lights, drones, audio gear, livestream equipment, and production tools. Equipment providers operate separately from creative providers and are responsible for inventory accuracy, maintenance, and lawful operation.",
                ],
            },
            {
                id: "financials",
                title: "Rental Financial Components",
                bullets: [
                    "Rental advance may be required before confirmation.",
                    "Security deposit may be required and may be adjusted for damage, missing items, late return, repair, cleaning, transport, or downtime.",
                    "Operator fee, logistics fee, delivery fee, pickup fee, late-return penalty, and damage recovery may apply.",
                    "Final pricing should be confirmed by the provider before the client treats the rental as finalized.",
                ],
            },
            {
                id: "provider-obligations",
                title: "Equipment Provider Obligations",
                bullets: [
                    "Maintain accurate inventory, quantity, condition, model, brand, availability, and pricing information.",
                    "Provide equipment in safe working condition and disclose known issues before handover.",
                    "Maintain legal certifications, licenses, insurance, or operating permissions where required.",
                    "Provide operator support only through qualified personnel when operator service is accepted.",
                    "Inspect equipment before pickup/delivery and after return.",
                ],
            },
            {
                id: "client-obligations",
                title: "Client Obligations",
                bullets: [
                    "Use equipment lawfully, safely, and only for the agreed rental period and purpose.",
                    "Return equipment on time and in the same condition, except normal wear.",
                    "Report loss, theft, damage, malfunction, or safety issues immediately.",
                    "Do not sub-rent, modify, tamper with, or misuse equipment.",
                    "Comply with location permissions, drone rules, venue rules, public safety requirements, and applicable law.",
                ],
            },
            {
                id: "delivery",
                title: "Delivery, Pickup, And Inspection",
                bullets: [
                    "Delivery and pickup availability depends on provider capability, location, schedule, and logistics.",
                    "Clients and providers should verify item count, condition, accessories, batteries, storage media, cables, stands, cases, and operator requirements at handover.",
                    "Inspection records, photos, messages, and proof uploads may be used in dispute or damage review.",
                ],
            },
            {
                id: "drone",
                title: "Drone And Operator Compliance",
                body: [
                    "Drone usage must comply with applicable Indian laws, local permissions, safety restrictions, venue rules, and operator requirements. Drone operators and providers are responsible for lawful operation and required permissions unless otherwise agreed in writing.",
                ],
            },
        ],
    },
    communityGuidelines: {
        slug: "community-guidelines",
        title: "Community Guidelines",
        description: "Trust, safety, communication, and marketplace conduct rules for ShotcutCrew users.",
        lastUpdated: LEGAL_LAST_UPDATED,
        sections: [
            {
                id: "respect",
                title: "Respectful Communication",
                bullets: [
                    "Communicate professionally and respectfully with clients, providers, coordinators, and ShotcutCrew team members.",
                    "Harassment, threats, intimidation, discrimination, abusive language, or unsafe conduct is not allowed.",
                ],
            },
            {
                id: "truth",
                title: "Authenticity And Honest Representation",
                bullets: [
                    "Do not upload fake portfolios, misleading inventory, false credentials, or manipulated reviews.",
                    "Providers must represent their actual skill, capacity, equipment, availability, and service areas accurately.",
                    "Clients must provide accurate requirements, budgets, dates, locations, and usage expectations.",
                ],
            },
            {
                id: "payments",
                title: "Payment Integrity",
                bullets: [
                    "Do not bypass ShotcutCrew payments after discovering contacts through the platform.",
                    "Do not request or pressure users into off-platform cash, UPI, or bank transfers outside approved workflows.",
                    "Report suspected fraud, fake profiles, suspicious payment behavior, or unsafe activity.",
                ],
            },
            {
                id: "safety",
                title: "Safe Production Practices",
                bullets: [
                    "Follow safe shoot practices, venue rules, drone restrictions, electrical safety, crowd safety, and equipment handling standards.",
                    "Equipment providers and operators must maintain gear responsibly and disclose risks or limitations.",
                    "Creators must respect client property, privacy, brand guidelines, and intellectual property.",
                ],
            },
            {
                id: "reviews",
                title: "Reviews And Marketplace Fairness",
                bullets: [
                    "Reviews must be honest and based on real experiences.",
                    "Fake reviews, review manipulation, retaliation, or defamatory claims are prohibited.",
                    "ShotcutCrew may remove reviews that violate platform guidelines.",
                ],
            },
        ],
    },
    aiDisclaimer: {
        slug: "ai-disclaimer",
        title: "AI Disclaimer",
        description: "Important information about ShotcutCrew AI-assisted script analysis, planning, matching, and workflow automation.",
        lastUpdated: LEGAL_LAST_UPDATED,
        sections: [
            {
                id: "overview",
                title: "AI-Assisted Platform Features",
                body: [
                    "ShotcutCrew may use AI systems including Gemini, OpenAI, OpenRouter, and internal automation systems to assist with script analysis, production planning, provider matching, budget guidance, scheduling suggestions, workflow automation, and operational recommendations.",
                ],
            },
            {
                id: "limitations",
                title: "AI Limitations",
                bullets: [
                    "AI-generated recommendations may contain inaccuracies, omissions, or incomplete assumptions.",
                    "AI outputs are informational and should not replace professional production judgment.",
                    "AI outputs are not legal, tax, financial, safety, insurance, or regulatory advice.",
                    "Final crew, equipment, budget, permissions, logistics, and safety decisions should be reviewed by qualified professionals.",
                ],
            },
            {
                id: "user-content",
                title: "Scripts, Briefs, And User Content",
                bullets: [
                    "Users should submit only scripts, briefs, references, or materials they are authorized to use.",
                    "AI may process submitted content to generate planning recommendations, matching tags, and workflow suggestions.",
                    "Avoid submitting highly confidential third-party material unless you have permission and understand the risks.",
                ],
            },
            {
                id: "human-review",
                title: "Human Review Recommended",
                body: [
                    "ShotcutCrew encourages clients and providers to review AI outputs independently before relying on them for production, budgeting, scheduling, or compliance decisions.",
                ],
            },
        ],
    },
} satisfies Record<string, LegalPageContent>;

export type LegalPageKey = keyof typeof legalPages;

export const legalFooterLinks = [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/refund-policy", label: "Refund Policy" },
    { href: "/creator-agreement", label: "Creator Agreement" },
    { href: "/equipment-rental-terms", label: "Equipment Rental Terms" },
    { href: "/community-guidelines", label: "Community Guidelines" },
    { href: "/ai-disclaimer", label: "AI Disclaimer" },
];
