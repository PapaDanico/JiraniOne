// Centralized legal content, written in plain language a resident can
// actually read on a phone. Every factual claim here must match what the
// code does (retention schedules mirror server/src/cron.ts; sub-processors
// mirror the real infrastructure) — if the practice changes, change this
// file in the same PR.
export const LEGAL_SECTIONS = {
  PRIVACY: [
    { title: "1. Who We Are", content: "JiraniHub Ltd. is a Kenyan company. We build the platform your estate uses to manage visitors, maintenance, payments, and community life. We handle your personal data in line with Kenya's Data Protection Act, 2019. Questions: privacy@jiranihub.co.ke" },
    { title: "2. What We Collect", content: "Your phone number, name, estate and house/unit number, and role (resident, admin, security, or vendor). The records you create: visitor passes, maintenance tickets, payments and M-PESA references, RSVPs, votes, bookings, and messages. Your location only when you press the emergency (SOS) button — never in the background. Basic device and session data to keep your account secure." },
    { title: "3. Why We Collect It", content: "Only to run the platform: letting your visitors in, fixing what's broken, collecting the levy, and keeping your estate informed and safe. We never sell your data. We never share it for advertising. There are no third-party trackers in this app." },
    { title: "4. Who Can See Your Data", content: "Your estate's admin and security staff see only what they need for their job, and only for your estate — never other estates. Safaricom processes M-PESA payments. Africa's Talking delivers SMS. Netlify and Supabase host our platform and database. Law enforcement gets access only with a valid Kenyan court order." },
    { title: "5. How Long We Keep It", content: "Your account: while it's active, plus 30 days after you delete it. Payment records: 7 years (Kenyan tax law requires this). Audit logs: 2 years. Visitor records: name and phone number are automatically anonymized after 90 days. Error logs: 90 days." },
    { title: "6. Your Rights", content: "Under the Data Protection Act you can: see all data we hold on you (Settings → Download My Data), correct it, delete your account (Settings → Delete Account), export it, and object to processing. We answer every request within 30 days. If you're not satisfied, you can complain to the Office of the Data Protection Commissioner (ODPC) at complaints@odpc.go.ke." },
    { title: "7. How We Protect It", content: "Everything travels over HTTPS. Passwords are hashed with bcrypt — we cannot read them. Access is role-based and estate-scoped. Sensitive actions are recorded in an audit trail. Payment callbacks are restricted to Safaricom's servers. Login attempts are rate-limited." },
    { title: "8. Cookies", content: "One session cookie, HTTP-only, valid 30 days, used purely to keep you signed in. No advertising cookies, no third-party tracking of any kind." },
    { title: "9. If Something Goes Wrong", content: "If a data breach puts your rights at risk, we notify the Data Commissioner within 72 hours as the Act requires, and we tell you promptly by SMS, in-app notice, or both — including what happened and what we're doing about it." },
    { title: "10. Where Your Data Lives", content: "Our database is hosted with Supabase in the European Union, on infrastructure that meets the Data Protection Act's requirements for transfers outside Kenya. We only use processors that meet that bar." },
    { title: "11. Contact Us", content: "Privacy questions: privacy@jiranihub.co.ke · General support: support@jiranihub.co.ke · Data Commissioner (ODPC): complaints@odpc.go.ke" },
  ],
  TERMS: [
    { title: "1. The Agreement", content: "These terms are a contract between you and JiraniHub Ltd. By creating an account or using the platform, you accept them. If your estate's management company signed you up, these terms still govern your own use." },
    { title: "2. Your Account", content: "Your account is yours alone. Keep your password private, and tell us immediately at support@jiranihub.co.ke if you think someone else has used it. You're responsible for activity done under your login. One account per person; use your real name and phone number so your neighbours and gate staff know who they're dealing with." },
    { title: "3. Community Conduct", content: "JiraniHub is your estate's shared space. Don't harass neighbours, post false information, impersonate others, spam the noticeboard, or attempt to break or probe the platform's security. Estate admins can remove content and suspend accounts that break these rules; serious violations may be reported to authorities." },
    { title: "4. Payments & M-PESA", content: "Payments are processed by Safaricom through M-PESA. JiraniHub adds no fees on top of what Safaricom charges. Levy amounts, due dates, and what they cover are set by your estate management — payment disputes about amounts should go to them first. Failed or duplicated M-PESA transactions are handled under Safaricom's own M-PESA terms; we'll help you trace any transaction with its M-PESA reference." },
    { title: "5. Your Content, Our Platform", content: "You own what you post — tickets, listings, notices, photos. You give JiraniHub permission to store and display that content so the platform can work. We own the platform itself: the software, design, and the JiraniHub name and logo." },
    { title: "6. Service Availability", content: "We aim to keep JiraniHub available around the clock, but we can't promise zero downtime — networks fail, and we sometimes need maintenance windows. For anything life-threatening, always use the emergency numbers directly (Police 999, Ambulance 999) — the SOS button alerts your estate, it does not call government emergency services." },
    { title: "7. Our Liability", content: "JiraniHub is provided as-is. To the extent Kenyan law allows, we're not liable for indirect losses — a missed visitor, a delayed notice, a facility double-booking. Nothing in these terms limits liability that cannot be limited under Kenyan law." },
    { title: "8. Ending Your Account", content: "You can delete your account anytime in Settings. We can suspend or terminate accounts that violate these terms, with notice where reasonable. Ending the account doesn't erase obligations that already arose (like payment records we must keep for tax law)." },
    { title: "9. Governing Law & Disputes", content: "These terms are governed by the laws of Kenya. If we have a dispute, let's talk first — most things resolve with a conversation (30 days of good-faith negotiation). If that fails, disputes go to arbitration in Nairobi under the Arbitration Act, 1995." },
    { title: "10. Changes to These Terms", content: "If we change these terms in a way that matters, we'll tell you in-app at least 30 days before the change takes effect. Continuing to use JiraniHub after that means you accept the new terms." },
    { title: "11. Contact", content: "Questions about these terms: legal@jiranihub.co.ke" },
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
