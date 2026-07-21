import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/shared/navigation";

// Public help page — reachable by prospects from the landing footer AND by
// signed-in users from the menu, so it renders its own lightweight header
// (TopBar returns null when logged out). Native <details> accordions keep
// it dependency-free and accessible, and the whole page is static content
// — no queries, nothing to fail on 3G.

interface Faq { q: string; a: string }
interface FaqSection { title: string; emoji: string; items: Faq[] }

const SECTIONS: FaqSection[] = [
  {
    title: "Getting Started",
    emoji: "🌍",
    items: [
      { q: "What is JiraniHub?", a: "JiraniHub (\"jirani\" is Swahili for neighbour) is your estate's digital home — one app that replaces the WhatsApp groups, paper visitor logbooks, and levy spreadsheets. Visitors, maintenance, M-PESA payments, announcements, events, voting, and an emergency button, all in one place, built for Kenyan estates." },
      { q: "How do I sign in?", a: "Use your Kenyan phone number (0722 123 456, +254722123456, and 254722123456 all work) and your password. If your estate admin registered you, they'll share a setup link or your first password out-of-band." },
      { q: "I forgot my password. What do I do?", a: "Tap \"Forgot password\" on the sign-in page. We send a 6-digit code to your phone by SMS — enter it and choose a new password. Codes expire after 15 minutes, and you can request at most 3 per day." },
      { q: "Does it work on slow internet?", a: "Yes — JiraniHub is built for 3G. Pages are small and load only what you need. If a request fails mid-way, you'll see a clear error so you know whether it went through, instead of guessing." },
      { q: "Is my data safe?", a: "Your data belongs to you and stays inside your estate — admins and gate staff only see what their job needs. We never sell data, there are no ad trackers, and visitor records are automatically anonymized after 90 days. Full details in our Privacy Policy." },
    ],
  },
  {
    title: "For Residents",
    emoji: "🏠",
    items: [
      { q: "How do I invite a visitor?", a: "Go to Visitors → New Pass. Enter your visitor's name and phone number and when you expect them. The gate gets your visitor's details instantly, and security can look them up by phone number when they arrive — no more shouting descriptions down the phone." },
      { q: "How do I report a broken pipe, faulty light, or bad road?", a: "Go to Issues (Maintenance) → Report Issue. Pick a category and priority, describe the problem, and attach up to 3 photos. You'll get a notification every time the status changes — from open, to assigned, to resolved." },
      { q: "How do I pay my service charge (levy)?", a: "Go to Payments → Pay Levy, enter the amount, and confirm. An M-PESA prompt (STK push) appears on your phone — enter your M-PESA PIN and you're done. The receipt and M-PESA reference are saved in your payment history automatically." },
      { q: "What is the SOS button?", a: "The red Emergency button alerts your estate's security team and admin instantly, with your location if you allow it. Important: it alerts your estate — for police, ambulance, or fire, always also call 999 directly." },
      { q: "How do parcels work?", a: "Register a parcel you're expecting under Parcels. When it arrives, gate staff mark it \"At Gate\" and you get a notification. Collect it and mark it collected — no more parcels lost at the gate." },
      { q: "What are Harambee, Chama, and Carpool?", a: "Harambee: estate fundraising campaigns you can donate to via M-PESA, anonymously if you prefer. Chama: neighbourhood savings groups with tracked contributions. Carpool: offer or book seats on rides your neighbours are already making — like a shared matatu, but with people you know." },
    ],
  },
  {
    title: "For Estate Admins",
    emoji: "🗝️",
    items: [
      { q: "How do I set up my estate?", a: "Your dashboard shows a Getting Started checklist: add a bookable facility (clubhouse, pool), post your first announcement, add a trusted service provider, invite residents, and upload your estate rules. Work through it and your estate is live." },
      { q: "How do I add residents?", a: "Residents → Add User. Enter their name, phone, unit, and role. Residents can also self-register and pick your estate — you'll see them appear in your user list." },
      { q: "How do announcements reach people?", a: "Post under Notices with a priority (info, warning, or urgent). Residents see it in-app on their dashboard and get notified. Urgent notices are visually flagged so they're impossible to miss." },
      { q: "How do facility bookings and approvals work?", a: "Add facilities under Bookings and choose whether each needs your approval. Residents book time slots; double-bookings are blocked automatically. Pending requests appear in your All tab for one-tap approve or reject." },
      { q: "Where do I put the estate rules and AGM minutes?", a: "Documents → Upload. PDFs and images up to 3MB. Every resident can read and download them — transparency without printing a single page." },
      { q: "How do polls and voting work?", a: "Governance → New Poll. Add your question and options, with an optional closing date. Results tally live, and each resident can vote exactly once — enforced by the system, not the honour system." },
    ],
  },
  {
    title: "For Gate & Security Staff",
    emoji: "🛡️",
    items: [
      { q: "How do I check a visitor in?", a: "Open the gate scanner and search by the visitor's phone number. If a resident pre-registered them, you'll see who they're visiting and can check them in with one tap. The resident is notified the moment their visitor is inside." },
      { q: "What if a visitor isn't pre-registered?", a: "Call the resident to confirm, then ask them to create a pass from their phone — it appears on your gate log instantly." },
      { q: "How do I log a parcel arriving?", a: "Parcels → find the expected parcel → mark it \"At Gate\". The resident gets a notification to come collect it." },
      { q: "What happens when someone presses SOS?", a: "You and the estate admin get an alert with the resident's details and location (if shared). Respond, then update the alert's status so everyone knows it's being handled." },
    ],
  },
  {
    title: "Payments & M-PESA",
    emoji: "💚",
    items: [
      { q: "How does the M-PESA prompt work?", a: "When you pay through JiraniHub, Safaricom pushes a payment request straight to your phone (STK push). You enter your M-PESA PIN on your own phone — JiraniHub never sees or stores your PIN." },
      { q: "The prompt didn't arrive or I cancelled it. Was I charged?", a: "If you didn't enter your PIN, no money moved — the payment shows as failed and you can simply try again. If your M-PESA statement shows a debit but the app shows pending, wait a few minutes: our reconciliation checks with Safaricom every 5 minutes and settles it automatically." },
      { q: "Are there extra fees?", a: "JiraniHub adds no fees. You pay exactly the levy or donation amount plus Safaricom's standard M-PESA charges, if any." },
      { q: "Where are my receipts?", a: "Payments → history. Every completed payment keeps its M-PESA reference number, so you always have proof of payment." },
    ],
  },
];

export default function FaqPage() {
  const { user } = useAuth();

  return (
    <div className="page-wrap min-h-screen" data-bottomnav={user ? "true" : undefined}>
      {/* Deliberately narrower than .container-list — this is a single
          prose column (accordions, not cards), and comfortable reading
          line-length tops out well before the 5xl width the card-feed
          pages use. */}
      <main className="max-w-lg mx-auto px-4 md:max-w-2xl py-8 page-content">
        <Link href={user ? `/dashboard/${user.role}` : "/"} className="text-sm text-[#1B5E20] font-semibold">
          ← Back
        </Link>

        <h1 className="font-black text-3xl text-[#212121] mt-4 mb-1">Help & FAQ</h1>
        <p className="text-sm text-[#6B5D45] mb-8">
          Everything you need to run life on JiraniHub — <span className="italic">karibu, jirani</span>.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-bold text-base text-[#212121] mb-3 flex items-center gap-2">
                <span aria-hidden="true">{section.emoji}</span> {section.title}
              </h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <details
                    key={item.q}
                    className="group bg-white rounded-xl border border-[#E8E3D8] overflow-hidden"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#212121] flex items-start justify-between gap-2 hover:bg-[#F8F7F5] transition-colors min-h-[44px]">
                      <span>{item.q}</span>
                      <span className="text-[#1B5E20] shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
                    </summary>
                    <p className="px-4 pb-4 text-sm text-[#6B5D45] leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="bg-[#EDE7D8] border border-[#D4C9A8] rounded-xl p-4 mt-10">
          <p className="text-xs text-[#6B5D45] text-center">
            Still stuck? Email{" "}
            <a href="mailto:support@jiranihub.co.ke" className="font-semibold text-[#1B5E20] underline">
              support@jiranihub.co.ke
            </a>{" "}
            — a human replies.
          </p>
        </div>
      </main>
      {user && <BottomNav />}
    </div>
  );
}
