import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="page-wrap">
      <main className="max-w-2xl mx-auto px-4 py-8 page-content">
        <Link href="/" className="text-sm text-[#1B5E20] font-semibold">
          ← Back
        </Link>

        <h1 className="font-black text-3xl text-[#212121] mt-4 mb-2">Terms of Service</h1>
        <p className="text-xs text-[#6B5D45] mb-6">
          Effective {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="space-y-5 text-sm text-[#212121] leading-relaxed">
          <section>
            <h2 className="font-bold text-base mb-1">1. Account use</h2>
            <p>
              You may register a JiraniHub account if you are a resident, admin, security
              officer, or vendor at a participating Kenyan estate. One account per
              person. Don't share your sign-in details.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">2. Payments</h2>
            <p>
              Estate levies, fundraising, and chama contributions are paid via M-PESA
              STK Push to the estate's registered shortcode. JiraniHub doesn't take
              custody of funds — money moves directly between you and the estate's
              Safaricom till. Refunds are at the discretion of your estate admin.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">3. Acceptable use</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Don't impersonate another resident, admin, or vendor.</li>
              <li>Don't register fake visitors or send spam SMS.</li>
              <li>Don't post content that is unlawful, harassing, or discriminatory.</li>
              <li>Don't try to break or scrape the platform.</li>
            </ul>
            <p className="mt-2">
              We may suspend or close accounts that breach these rules. SMS sent through
              JiraniHub is rate-limited to protect the platform's SMS budget.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">4. Estate admin authority</h2>
            <p>
              Your estate's admin can change your role, your unit assignment, or
              deactivate your account. JiraniHub does not arbitrate disputes between
              residents and their estate management — that's a matter for your residents'
              association under Kenyan law.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">5. Service availability</h2>
            <p>
              JiraniHub is offered "as is". We aim for high availability but offer no
              guaranteed uptime SLA on the starter tier. Critical operations (panic
              button, payments) should be tested by your estate before relying on them
              in real emergencies.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">6. Liability</h2>
            <p>
              To the maximum extent permitted by Kenyan law, JiraniHub Ltd. is not
              liable for indirect or consequential losses arising from use of the
              platform, including but not limited to loss of M-PESA funds caused by
              user error, missed maintenance issues, or unanswered emergency alerts.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-1">7. Governing law</h2>
            <p>
              These terms are governed by the laws of Kenya. Disputes are resolved in
              the courts of Nairobi.
            </p>
          </section>
        </div>

        <p className="text-xs text-[#6B5D45] mt-8">
          See also our{" "}
          <Link href="/privacy" className="text-[#1B5E20] font-semibold underline">
            Privacy Policy
          </Link>.
        </p>
      </main>
    </div>
  );
}
