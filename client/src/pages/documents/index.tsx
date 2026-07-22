import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MAX_DOCUMENT_BYTES } from "@shared/constants";
import type { EstateDocument } from "@shared/types";

function fileIcon(fileType: string | null) {
  if (fileType === "application/pdf") return "📄";
  if (fileType?.startsWith("image/")) return "🖼️";
  return "📎";
}

function UploadDocumentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("file", file!);
      return api.upload("/api/documents", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setTitle(""); setFile(null); setError("");
      onClose();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Failed to upload document.");
    },
  });

  function handleSubmit() {
    if (title.trim().length < 3) {
      setError("Title needs at least 3 characters.");
      return;
    }
    if (!file) {
      setError("Choose a PDF or image to upload.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(`File is too large (max ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))}MB).`);
      return;
    }
    setError("");
    mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="tribal-heading">Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title *</Label>
            <Input
              id="doc-title"
              placeholder="e.g. Estate Rules 2026, AGM Minutes June"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={title.length > 0 && title.trim().length < 3 ? "At least 3 characters" : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File (PDF, JPG, or PNG) *</Label>
            <input
              id="doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[#6B5D45] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#1B5E20]/10 file:text-[#1B5E20] hover:file:bg-[#1B5E20]/15 transition-colors"
            />
            <p className="text-xs text-[#6B5D45]">Max {Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))}MB</p>
          </div>
          {error && (
            <p className="text-sm text-[#B71C1C] bg-[#B71C1C]/8 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [showUpload, setShowUpload] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get<EstateDocument[]>("/api/documents").then((r) => r.data),
  });

  const { mutate: deleteDocument, isPending: deleting } = useMutation({
    mutationFn: (id: string) => api.delete(`/api/documents/${id}`).then((r) => r.data),
    onSuccess: () => {
      setActionError("");
      setConfirmDeleteId(null);
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : "Failed to delete document."),
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Documents" />
      <main className="container-list pt-5 pb-6 space-y-4 page-content">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label mb-0">Estate Documents</p>
            <p className="text-xs text-[#6B5D45] mt-0.5">Rules, minutes, and notices</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowUpload(true)} className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Upload
            </Button>
          )}
        </div>

        {actionError && (
          <p className="text-xs text-[#B71C1C] font-medium">{actionError}</p>
        )}

        {isLoading ? (
          <SectionLoader />
        ) : !documents?.length ? (
          <div className="tribal-card p-10 text-center">
            <FileText className="h-12 w-12 text-[#D4C9A8] mx-auto mb-3" />
            <p className="font-semibold text-[#212121] mb-1">No documents yet</p>
            <p className="text-sm text-[#6B5D45]">
              {isAdmin
                ? "Upload estate rules, AGM minutes, or notices for residents."
                : "Estate rules and minutes will appear here."}
            </p>
          </div>
        ) : (
          <div className="card-grid">
            {documents.map((doc) => (
              <div key={doc.id} className="tribal-card p-4 flex items-center gap-3">
                <span className="text-2xl shrink-0">{fileIcon(doc.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#212121] truncate">{doc.title}</p>
                  <p className="text-xs text-[#6B5D45]">{formatDate(doc.createdAt)}</p>
                </div>
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#1B5E20] bg-[#1B5E20]/10 hover:bg-[#1B5E20]/20 rounded-lg px-2.5 py-1.5 font-semibold transition-colors shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                {isAdmin && (
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    className="flex items-center gap-1 text-xs text-[#B71C1C] bg-[#B71C1C]/8 hover:bg-[#B71C1C]/15 rounded-lg px-2.5 py-1.5 font-semibold transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
      <UploadDocumentModal open={showUpload} onClose={() => setShowUpload(false)} />
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}
        title="Delete this document?"
        description="Residents will no longer be able to view or download it. This can't be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => confirmDeleteId && deleteDocument(confirmDeleteId)}
      />
    </div>
  );
}
