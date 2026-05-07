import { Link } from "wouter";

export default function PrivacyPage() {
  return (
    <div className="page-wrap">
      <main className="max-w-2xl mx-auto px-4 py-8 page-content">
        <Link href="/" className="text-sm text-[#1B5E20] font-semibold">
          ← Back
        </Link>

        <h1 className="font-black text-3xl text-[#212121] mt-4 mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#6B5D45] mb-6">
          Effective {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
          {" · "}
          JiraniHub complies with the Kenya Data Protection Act, 2019.
        </p>

        <div className="space-y-5 text-sm text-[#212121] leading-relaxed">
          <section>
            <h2 className="font-bold text-base mb-1">1. Who we are</h2>
            <p>
              JiraniHub is operated by JiraniHub Ltd., a Kenyan company registered with the
              Office of the Data Protection Commissioner (ODPC). All data we hold about
              you is processed in line with the Kenya Data Protection Act, 2019.
            </p>
            <p className="mt-2">
              Our Data Protection Officer can be reached at{" "}
              <a href="mailto:dpo@jiranihub.co.ke" className="text-[#1B5E20] font-semibold underline">
                dpo@jiranihub.co.ke
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">2. What we collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Your phone number, name, estate, unit and role.</li>
              <li>Visitors you pre-register: their name, phone, and visit purpose.</li>
              <li>Maintenance tickets, announcements, payments, polls and bookings you create.</li>
              <li>Approximate location ONLY when you press the emergency button.</li>
              <li>Service logs (IP address, user agent, request times) for security and debugging.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">3. Why we collect it</h2>
            <p>
              To deliver the JiraniHub service to you and to your estate community: visitor
              passes, maintenance, M-PESA payments, governance polls, and emergency
              response. We never sell your data.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">4. Who we share it with</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Your estate admin and security staff (within your assigned estate only).</li>
              <li>Safaricom Daraja, for M-PESA STK Push transactions you initiate.</li>
              <li>Africa's Talking, for SMS we send on your behalf (e.g. visitor passes, OTPs).</li>
              <li>Neon (Postgres hosting) and Render (application hosting) for storage and processing.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">5. How long we keep it</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Account records: while your account is active, plus 30 days after closure.</li>
              <li>Visitor records: anonymized after 90 days (we keep the visit happened, but not who came).</li>
              <li>Payment records: 7 years (Kenya tax law requirement).</li>
              <li>Audit logs (admin actions): 2 years.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">6. Your rights</h2>
            <p>
              Under the Kenya DPA you have the right to access, correct, port, or erase your
              data, and to lodge a complaint with ODPC.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong>Export:</strong> sign in and visit{" "}
                <code className="bg-[#EDE7D8] px-1 rounded">GET /api/users/me/data</code> for a JSON
                copy of your account record.
              </li>
              <li>
                <strong>Erase:</strong> sign in and POST to{" "}
                <code className="bg-[#EDE7D8] px-1 rounded">/api/users/me/erase</code>; we
                anonymize your account in place and end every session.
              </li>
              <li>
                <strong>Complaint:</strong> ODPC,{" "}
                <a href="https://www.odpc.go.ke" className="text-[#1B5E20] underline" target="_blank" rel="noreferrer">
                  www.odpc.go.ke
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">7. Security</h2>
            <p>
              Passwords are hashed with bcrypt (cost 12). M-PESA callbacks are restricted
              to Safaricom egress IPs and processed inside transactions. We do not store
              M-PESA PINs or full card numbers (we never see them).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">8. Changes</h2>
            <p>
              We will notify you in-app and by SMS if we change this policy in any
              substantial way.
            </p>
          </section>
        </div>

        <p className="text-xs text-[#6B5D45] mt-8">
          See also our{" "}
          <Link href="/terms" className="text-[#1B5E20] font-semibold underline">
            Terms of Service
          </Link>.
        </p>
      </main>
    </div>
  );
}
