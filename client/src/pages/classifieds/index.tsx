import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag, ShoppingBag, Gift, Briefcase, Plus, Loader2,
  Phone, CheckCircle2, Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative } from "@/lib/utils";
import type { Classified, ClassifiedCategory } from "@shared/types";

// ─── Category config ───────────────────────────────────────────────────────────

const CAT_CFG: Record<ClassifiedCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  sell:    { label: "For Sale",  icon: <Tag className="h-3.5 w-3.5" />,         color: "text-[#1B5E20]",  bg: "bg-[#1B5E20]/10" },
  buy:     { label: "Wanted",    icon: <ShoppingBag className="h-3.5 w-3.5" />, color: "text-sky-700",    bg: "bg-sky-100" },
  give:    { label: "Free",      icon: <Gift className="h-3.5 w-3.5" />,        color: "text-purple-700", bg: "bg-purple-100" },
  service: { label: "Service",   icon: <Briefcase className="h-3.5 w-3.5" />,   color: "text-[#D47A00]",  bg: "bg-[#D47A00]/10" },
};

const CATEGORIES: ClassifiedCategory[] = ["sell", "buy", "give", "service"];

function CategoryBadge({ category }: { category: ClassifiedCategory }) {
  const cfg = CAT_CFG[category];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Create Listing Modal ──────────────────────────────────────────────────────

function CreateListingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle]           = useState("");
  const [description, setDesc]      = useState("");
  const [price, setPrice]           = useState("");
  const [category, setCategory]     = useState<ClassifiedCategory>("sell");
  const [contactPhone, setContact]  = useState("");
  const [error, setError]           = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post("/api/classifieds", {
        title,
        description,
        price: category === "sell" && price ? Number(price) : undefined,
        category,
        contactPhone: contactPhone || undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classifieds"] });
      setTitle(""); setDesc(""); setPrice(""); setCategory("sell"); setContact(""); setError("");
      onClose();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Failed to create listing.");
    },
  });

  const titleHint = title.length > 0 && title.trim().length < 3 ? "At least 3 characters" : undefined;
  const descHint = description.length > 0 && description.trim().length < 10 ? "At least 10 characters" : undefined;

  function handleSubmit() {
    if (title.trim().length < 3 || description.trim().length < 10) {
      setError("Title needs at least 3 characters and description at least 10.");
      return;
    }
    setError("");
    mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tribal-heading">New Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all
                    ${category === c
                      ? "border-[#1B5E20] bg-[#1B5E20]/8 text-[#1B5E20]"
                      : "border-[#D4C9A8] bg-[#EDE7D8] text-[#6B5D45] hover:border-[#1B5E20]/40"
                    }`}
                >
                  <span className={CAT_CFG[c].color}>{CAT_CFG[c].icon}</span>
                  {CAT_CFG[c].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="e.g. Baby stroller, almost new" value={title} onChange={(e) => setTitle(e.target.value)} error={titleHint} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description *</Label>
            <Textarea
              id="desc"
              placeholder="Describe condition, size, age, etc."
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="resize-none"
              error={descHint}
            />
          </div>

          {(category === "sell") && (
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (KES)</Label>
              <Input id="price" type="number" placeholder="e.g. 3500" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="phone">Contact Phone (optional)</Label>
            <Input id="phone" placeholder="e.g. 0712 345 678" value={contactPhone} onChange={(e) => setContact(e.target.value)} />
          </div>

          {error && (
            <p className="text-sm text-[#B71C1C] bg-[#B71C1C]/8 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Listing Card ──────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  isOwner,
  isAdmin,
}: {
  listing: Classified;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: updateStatus, isPending: updatingStatus } = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/classifieds/${listing.id}`, { status }).then((r) => r.data),
    onSuccess: () => {
      setActionError("");
      qc.invalidateQueries({ queryKey: ["classifieds"] });
      qc.invalidateQueries({ queryKey: ["classifieds", "my"] });
    },
    onError: (e) => {
      setActionError(e instanceof ApiError ? e.message : "Failed to update listing.");
    },
  });

  const { mutate: deleteListing, isPending: deleting } = useMutation({
    mutationFn: () => api.delete(`/api/classifieds/${listing.id}`).then((r) => r.data),
    onSuccess: () => {
      setActionError("");
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ["classifieds"] });
      qc.invalidateQueries({ queryKey: ["classifieds", "my"] });
    },
    onError: (e) => {
      setActionError(e instanceof ApiError ? e.message : "Failed to delete listing.");
    },
  });

  const canManage = isOwner || isAdmin;

  return (
    <div className={`tribal-card p-4 ${listing.status === "sold" ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <CategoryBadge category={listing.category} />
            {listing.status === "sold" && (
              <span className="text-xs font-semibold text-[#6B5D45] bg-[#D4C9A8]/50 px-2 py-0.5 rounded-full">SOLD</span>
            )}
          </div>
          <p className="font-semibold text-sm text-[#212121] leading-snug">{listing.title}</p>
          <p className="text-xs text-[#6B5D45] mt-1 line-clamp-2">{listing.description}</p>

          {listing.price && (
            <p className="text-base font-bold text-[#D47A00] mt-1.5">
              KES {Number(listing.price).toLocaleString()}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-[#D4C9A8]">
            {listing.user && (
              <span>
                {listing.user.name}
                {listing.user.unitNumber ? ` · Unit ${listing.user.unitNumber}` : ""}
              </span>
            )}
            <span>{formatRelative(listing.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {(listing.contactPhone ?? listing.user?.phone) && (
          <a
            href={`tel:${listing.contactPhone ?? listing.user?.phone}`}
            className="flex items-center gap-1.5 text-xs text-[#1B5E20] bg-[#1B5E20]/10 hover:bg-[#1B5E20]/20 rounded-lg px-2.5 py-1.5 font-semibold transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        )}
        {canManage && isOwner && listing.status === "active" && (
          <button
            disabled={updatingStatus}
            onClick={() => updateStatus("sold")}
            className="flex items-center gap-1.5 text-xs text-[#1B5E20] bg-[#1B5E20]/10 hover:bg-[#1B5E20]/20 rounded-lg px-2.5 py-1.5 font-semibold transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Sold
          </button>
        )}
        {canManage && isOwner && listing.status === "sold" && (
          <button
            disabled={updatingStatus}
            onClick={() => updateStatus("active")}
            className="flex items-center gap-1.5 text-xs text-[#6B5D45] bg-[#EDE7D8] hover:bg-[#D4C9A8]/60 rounded-lg px-2.5 py-1.5 font-semibold transition-colors disabled:opacity-50"
          >
            Relist
          </button>
        )}
        {canManage && (
          <button
            disabled={deleting}
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-[#B71C1C] bg-[#B71C1C]/8 hover:bg-[#B71C1C]/15 rounded-lg px-2.5 py-1.5 font-semibold transition-colors disabled:opacity-50 ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>
      {actionError && (
        <p className="text-xs text-[#B71C1C] font-medium mt-2">{actionError}</p>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this listing?"
        description={`"${listing.title}" will be removed from the noticeboard. This can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => deleteListing()}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ClassifiedsPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<ClassifiedCategory | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["classifieds"],
    queryFn: () =>
      api.get<Classified[]>("/api/classifieds").then((r) => r.data),
  });

  const filtered = activeFilter === "all"
    ? (data ?? [])
    : (data ?? []).filter((c) => c.category === activeFilter);

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Noticeboard" />

      <main className="container-list pt-5 pb-6 page-content">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label mb-0">Estate Noticeboard</p>
            <p className="text-xs text-[#6B5D45] mt-0.5">Buy · Sell · Give · Services</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Post
          </Button>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {([["all", "All"] as const, ...CATEGORIES.map((c) => [c, CAT_CFG[c].label] as const)]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as ClassifiedCategory | "all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0
                ${activeFilter === key
                  ? "bg-[#1B5E20] text-white"
                  : "bg-[#EDE7D8] text-[#6B5D45] border border-[#D4C9A8] hover:border-[#1B5E20]/40"
                }`}
            >
              {key !== "all" && <span>{CAT_CFG[key as ClassifiedCategory].icon}</span>}
              {label}
            </button>
          ))}
        </div>

        {/* Listings */}
        {isLoading ? (
          <SectionLoader />
        ) : filtered.length === 0 ? (
          <div className="tribal-card p-10 text-center">
            <Tag className="h-12 w-12 text-[#D4C9A8] mx-auto mb-3" />
            <p className="font-semibold text-[#212121] mb-1">
              {activeFilter === "all" ? "No listings yet" : `No ${CAT_CFG[activeFilter as ClassifiedCategory].label} listings`}
            </p>
            <p className="text-sm text-[#6B5D45]">
              Be the first to post something — sell, give away, or offer a service to your neighbours.
            </p>
          </div>
        ) : (
          <div className="card-grid">
            {filtered.map((c) => (
              <ListingCard
                key={c.id}
                listing={c}
                isOwner={c.userId === user?.id}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      <CreateListingModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
