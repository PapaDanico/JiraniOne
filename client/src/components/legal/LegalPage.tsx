import { Link } from "wouter";
import { LEGAL_SECTIONS, RIGHTS } from "./legalContent";
import { BRAND_NAME, COMPANY_NAME, LEGAL_EMAIL } from "@shared/brand";

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const sections = LEGAL_SECTIONS[type === "privacy" ? "PRIVACY" : "TERMS"];
  const title = type === "privacy" ? "Privacy Policy" : "Terms of Use";
  const desc = type === "privacy"
    ? "Designed in line with Kenya's Data Protection Act, 2019"
    : `Legal agreement for using ${BRAND_NAME}`;

  return (
    <div className="page-wrap">
      <main className="max-w-3xl mx-auto px-4 py-8 page-content">
        <Link href="/" className="text-sm text-[#1B5E20] font-semibold">
          ← Back
        </Link>

        <h1 className="font-black text-3xl text-[#212121] mt-4 mb-1">{title}</h1>
        <p className="text-xs text-[#6B5D45] mb-8">
          Effective July 17, 2026 · {desc}
        </p>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="font-bold text-base text-[#212121] mb-2">{section.title}</h2>
              <p className="text-sm text-[#212121] leading-relaxed">{section.content}</p>
            </section>
          ))}

          {type === "privacy" && (
            <section className="bg-[#1B5E20]/5 p-4 rounded-xl mt-8">
              <h2 className="font-bold text-base text-[#212121] mb-3">Your Data Protection Rights</h2>
              <div className="grid gap-3">
                {Object.values(RIGHTS).map((right, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="font-semibold text-[#1B5E20] flex-shrink-0">✓</span>
                    <div>
                      <p className="font-semibold text-sm text-[#212121]">{right.title}</p>
                      <p className="text-xs text-[#6B5D45]">{right.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="bg-[#EDE7D8] border border-[#D4C9A8] rounded-xl p-4 mt-8">
          <p className="text-xs text-[#6B5D45] text-center">
            © 2026 {COMPANY_NAME}. All rights reserved. Questions?{" "}
            <a href={`mailto:${LEGAL_EMAIL}`} className="font-semibold text-[#1B5E20] underline">
              Contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
