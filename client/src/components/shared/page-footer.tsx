import { Link } from "wouter";

// Privacy/Terms/FAQ/Support already live in the nav drawer (☰), but that's
// one tap deep — this puts them at zero taps on every functional page,
// matching how the public landing page already treats them.
export function PageFooter() {
  return (
    <footer className="mt-2 pt-4 pb-2 border-t border-tribal-border-soft flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      <Link href="/faq" className="text-xs text-tribal-earth hover:text-brand-green transition-colors">
        Help &amp; FAQ
      </Link>
      <Link href="/privacy" className="text-xs text-tribal-earth hover:text-brand-green transition-colors">
        Privacy Policy
      </Link>
      <Link href="/terms" className="text-xs text-tribal-earth hover:text-brand-green transition-colors">
        Terms of Service
      </Link>
      <a
        href="mailto:support@jiranihub.co.ke"
        className="text-xs text-tribal-earth hover:text-brand-green transition-colors"
      >
        Support
      </a>
    </footer>
  );
}
