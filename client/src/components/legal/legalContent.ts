// Token-efficient legal content - centralized data structure
export const LEGAL_SECTIONS = {
  PRIVACY: [
    { title: "1. Who We Are", content: "JiraniHub Ltd., registered in Kenya. We design and operate this platform in line with the Kenya Data Protection Act (2019). Data Protection queries: privacy@jiranihub.co.ke" },
    { title: "2. Data We Collect", content: "Phone, name, estate, unit, role, visitor info, tickets, payments, location (emergency only), service logs, usage data, device info, session data." },
    { title: "3. Why We Collect It", content: "To deliver the platform: visitors, maintenance, payments, announcements, governance, bookings, emergency alerts. We never sell or share data for marketing." },
    { title: "4. Who We Share With", content: "Estate admins/security (your data only), M-PESA (Safaricom), SMS (Africa's Talking), hosting and database infrastructure (Netlify, Supabase). Law enforcement with court orders only." },
    { title: "5. How Long We Keep It", content: "Active accounts: while active + 30 days. Payments: 7 years (tax law). Audit logs: 2 years. Visitor records: anonymized after 90 days. Error logs: 90 days." },
    { title: "6. Your Rights", content: "Access (GET /api/users/me/data), Correct (profile), Erase (POST /api/users/me/erase), Export (JSON), Complain (ODPC). All requests answered within 30 days." },
    { title: "7. Security", content: "HTTPS/TLS encryption, bcrypt hashing (12 rounds), SQL injection prevention (Drizzle ORM), XSS protection (CSP), CSRF tokens, rate limiting (200/15min), M-PESA IP allowlist." },
    { title: "8. Cookies", content: "Session cookie (30 days, HTTP-only). Analytics optional (disable in Preferences). No third-party tracking." },
    { title: "9. Data Breaches", content: "Notification within 24 hours via email, SMS, in-app. Reported to Kenya DPA and authorities if required by law." },
    { title: "10. International Transfers", content: "Data is stored with our infrastructure providers (Supabase, in the EU). We only use processors that meet Kenya DPA 2019 requirements for data leaving Kenya." },
    { title: "11. Contact Us", content: "Privacy: privacy@jiranihub.co.ke | Support: support@jiranihub.co.ke | Kenya DPA: complaints@odpc.go.ke" },
  ],
  TERMS: [
    { title: "1. Acceptance of Terms", content: "By using JiraniHub, you agree to these Terms of Use. If you disagree, do not use the platform." },
    { title: "2. User Accounts", content: "You are responsible for your login credentials. Keep passwords confidential. You are liable for all activities under your account. Report unauthorized access immediately to support@jiranihub.co.ke" },
    { title: "3. User Conduct", content: "You agree not to: use profanity or harassment, post false/misleading info, attempt to hack/disrupt, spam, phish, or violate anyone's rights. Violations result in account suspension." },
    { title: "4. Intellectual Property", content: "JiraniHub owns all platform software, logos, and content. You own content you create (visitors, tickets, etc.). You grant JiraniHub license to host and process your data." },
    { title: "5. Service Availability", content: "We aim for 99% uptime but make no guarantees. Services may be interrupted for maintenance. We're not liable for unavailability or data loss from technical failures." },
    { title: "6. Payment Terms", content: "M-PESA payments are processed by Safaricom. We charge no transaction fees. Payment disputes handled per M-PESA terms. Refunds processed within 5 business days." },
    { title: "7. Limitation of Liability", content: "JiraniHub is provided AS IS. We are not liable for indirect, incidental, or consequential damages. Our total liability is capped at the amount you paid (if any)." },
    { title: "8. Indemnification", content: "You indemnify JiraniHub against claims arising from your use, content, or violations of these terms or laws." },
    { title: "9. Disclaimer of Warranties", content: "We disclaim all warranties (merchantability, fitness, non-infringement). Third-party integrations (M-PESA, SMS) are governed by their own terms." },
    { title: "10. Termination", content: "We may suspend accounts for violations. You may delete your account anytime. Termination does not relieve liability for past breaches." },
    { title: "11. Governing Law", content: "These terms are governed by Kenyan law. Any legal action must be brought in Kenyan courts." },
    { title: "12. Dispute Resolution", content: "Disputes first resolved via negotiation (30 days). If unresolved, arbitration in Kenya per Arbitration Act. No class actions." },
    { title: "13. Changes to Terms", content: "We may update terms anytime. Continued use implies acceptance. We notify users of material changes 30 days in advance." },
    { title: "14. Contact", content: "Questions about these terms? Email legal@jiranihub.co.ke" },
  ],
};

export const RIGHTS = {
  access: { title: "Right to Access", desc: "Request a copy of all your data. Visit Settings → Download My Data or email privacy@jiranihub.co.ke" },
  correct: { title: "Right to Correct", desc: "Fix inaccurate info in your profile settings anytime." },
  erase: { title: "Right to Erase", desc: "Delete your account. Visit Settings → Delete Account. Some data retained per law (7-year payment records)." },
  port: { title: "Right to Data Portability", desc: "Export your data as JSON/CSV. Visit Settings → Export My Data." },
  object: { title: "Right to Object", desc: "Opt-out of analytics/marketing. Visit Preferences → uncheck 'Analytics'." },
  restrict: { title: "Right to Restrict", desc: "Request processing limitation during disputes." },
};
