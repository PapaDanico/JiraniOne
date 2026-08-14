import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { PageFooter } from "@/components/shared/page-footer";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface ErrorLogEntry {
  id: string;
  message: string;
  stack: string | null;
  path: string | null;
  method: string | null;
  userId: string | null;
  estateId: string | null;
  createdAt: string;
}

// Platform-owner-only view (server enforces via requirePlatformOwner —
// this page has no nav entry, reached by direct URL). Not a per-estate
// admin feature: errors and their stack traces aren't scoped to one
// estate, and a regular "admin" role shouldn't see internals for estates
// that aren't theirs.
export default function ErrorLogsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading, isError, error } = useQuery<ErrorLogEntry[]>({
    queryKey: ["system", "error-logs"],
    queryFn: () => api.get<ErrorLogEntry[]>("/api/system/error-logs").then((r) => r.data),
    staleTime: 30 * 1000,
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Error Logs" />
      <main className="container-list pt-5 pb-6 page-content">
        <p className="text-sm text-tribal-earth mb-4">
          Last 200 unhandled server errors, most recent first. Pruned after 30 days.
        </p>

        {isLoading ? (
          <SectionLoader />
        ) : isError ? (
          <div className="tribal-card p-8 text-center">
            <p className="text-sm text-brand-red font-medium">
              {(error as { status?: number })?.status === 403
                ? "This view is restricted to the JiraniOne platform owner. Estate admins don't have access — server errors aren't scoped to a single estate."
                : "Failed to load error logs — the request didn't complete. Try again."}
            </p>
          </div>
        ) : !logs?.length ? (
          <div className="tribal-card p-10 text-center">
            <AlertTriangle className="h-8 w-8 text-tribal-border mx-auto mb-2" />
            <p className="text-tribal-earth text-sm font-medium">No errors logged. Clean run.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => {
              const expanded = expandedId === l.id;
              return (
                <div key={l.id} className="tribal-card p-4">
                  <button
                    onClick={() => setExpandedId(expanded ? null : l.id)}
                    className="w-full text-left flex items-start gap-3"
                  >
                    <AlertTriangle className="h-4 w-4 text-brand-red shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-tribal-charcoal break-words">{l.message}</p>
                      <p className="text-xs text-tribal-earth mt-1">
                        {l.method && <span className="font-mono">{l.method}</span>}
                        {l.path && <span className="font-mono"> {l.path}</span>}
                        {" · "}
                        {formatDateTime(l.createdAt)}
                      </p>
                    </div>
                    {l.stack && (expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />)}
                  </button>
                  {expanded && l.stack && (
                    <pre className="mt-3 pt-3 border-t border-tribal-border text-xs text-tribal-earth overflow-x-auto whitespace-pre-wrap break-words">
                      {l.stack}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <PageFooter />
      <BottomNav />
    </div>
  );
}
