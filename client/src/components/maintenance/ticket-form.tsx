import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTicketSchema, type CreateTicketInput } from "@shared/validators";
import { MAX_TICKET_PHOTOS, MAX_TICKET_PHOTO_BYTES } from "@shared/constants";
import { api, ApiError } from "@/lib/api";
import { saveDraft, MAINTENANCE_DRAFTS_STORE } from "@/lib/offlineDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Wrench, X } from "lucide-react";

const CATEGORIES = [
  { value: "plumbing",    label: "🔧 Plumbing / Water"  },
  { value: "electrical",  label: "⚡ Electrical"         },
  { value: "roads",       label: "🛣️ Roads / Pathways"  },
  { value: "landscaping", label: "🌿 Landscaping"        },
  { value: "security",    label: "🔒 Security"           },
  { value: "cleaning",    label: "🧹 Cleaning"           },
  { value: "other",       label: "📋 Other"              },
];

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "text-[#6B5D45]" },
  { value: "medium", label: "Medium", color: "text-amber-700" },
  { value: "high",   label: "High",   color: "text-[#D47A00]" },
  { value: "urgent", label: "Urgent", color: "text-[#B71C1C]" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TicketForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [photoLimitWarning, setPhotoLimitWarning] = useState(false);
  const [photoSizeWarning, setPhotoSizeWarning] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Thumbnail previews so a resident can confirm they attached the right
  // photo before submitting, instead of just a "2 photos selected" count.
  // Object URLs are revoked whenever the selection changes or the form
  // unmounts, so we don't leak blob URLs across repeated opens.
  useEffect(() => {
    const urls = photos ? Array.from(photos).map((f) => URL.createObjectURL(f)) : [];
    setPreviewUrls(urls);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [photos]);

  const removePhoto = (index: number) => {
    if (!photos) return;
    const dt = new DataTransfer();
    Array.from(photos).forEach((f, i) => { if (i !== index) dt.items.add(f); });
    setPhotos(dt.files.length > 0 ? dt.files : null);
    setPhotoLimitWarning(false);
  };

  // The server caps uploads at MAX_TICKET_PHOTOS/MAX_TICKET_PHOTO_BYTES and
  // rejects the whole request if either is exceeded — filter/truncate
  // client-side so a resident attaching a normal 3-8MB phone-camera photo
  // gets an immediate, specific warning instead of a failed submission
  // after the fact.
  const handlePhotoChange = (files: FileList | null) => {
    if (!files) {
      setPhotoLimitWarning(false);
      setPhotoSizeWarning(false);
      setPhotos(files);
      return;
    }

    const withinSize = Array.from(files).filter((f) => f.size <= MAX_TICKET_PHOTO_BYTES);
    setPhotoSizeWarning(withinSize.length < files.length);

    const kept = withinSize.slice(0, MAX_TICKET_PHOTOS);
    setPhotoLimitWarning(withinSize.length > MAX_TICKET_PHOTOS);

    const dt = new DataTransfer();
    kept.forEach((f) => dt.items.add(f));
    setPhotos(dt.files);
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { priority: "medium" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateTicketInput & { clientDraftId: string }) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("priority", data.priority);
      // Sent on the FIRST attempt, not just offline retries — the dedup
      // case this exists for is precisely "online submit timed out but the
      // server actually processed it", and the later offline flush can
      // only be recognized as a retry if the server saw this same id the
      // first time.
      formData.append("clientDraftId", data.clientDraftId);
      if (photos) Array.from(photos).forEach((f) => formData.append("photos", f));
      return api.upload("/api/maintenance", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", "my"] });
      reset();
      setPhotos(null); setPhotoLimitWarning(false); setPhotoSizeWarning(false);
      onClose();
    },
    onError: async (err: unknown, data) => {
      // An ApiError means the server was reached and rejected the request
      // (validation, auth, etc.) — that's a real error to show. Anything
      // else (fetch itself throwing) means the request never left the
      // device, which on a 3G/offline connection is the expected case this
      // app is meant to handle gracefully: save the draft locally instead
      // of losing the resident's report.
      if (err instanceof ApiError) {
        setServerError(err.message);
        return;
      }
      try {
        await saveDraft(MAINTENANCE_DRAFTS_STORE, {
          // Reuse the SAME id the failed online attempt sent — if that
          // request actually landed server-side (timeout after processing),
          // the flush retry with this id is recognized as a duplicate
          // instead of creating a second ticket. A fresh UUID here defeated
          // the whole dedup mechanism.
          id: data.clientDraftId,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          photos: photos ? Array.from(photos) : [],
          createdAt: Date.now(),
        });
        setSavedOffline(true);
        window.dispatchEvent(new Event("offline-drafts-changed"));
        reset();
        setPhotos(null); setPhotoLimitWarning(false); setPhotoSizeWarning(false);
      } catch {
        setServerError("You appear to be offline and this device can't save drafts. Please try again once you're back online.");
      }
    },
  });

  const onSubmit = (data: CreateTicketInput) => {
    setServerError(null);
    setSavedOffline(false);
    mutation.mutate({ ...data, clientDraftId: crypto.randomUUID() });
  };

  const category = watch("category");
  const priority = watch("priority");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setServerError(null); setSavedOffline(false); setPhotos(null); setPhotoLimitWarning(false); setPhotoSizeWarning(false); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#D47A00] flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Report an Issue</DialogTitle>
              <DialogDescription>
                Describe the problem and we'll get it resolved as soon as possible.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-2 space-y-4">
          <div>
            <Label className="text-[#212121] font-semibold">Issue Title</Label>
            <Input
              placeholder="e.g. Burst pipe in Block B"
              {...register("title")}
              error={errors.title?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#212121] font-semibold">Category</Label>
              <Select value={category} onValueChange={(v) => setValue("category", v as never)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="mt-1 text-xs text-[#B71C1C]">{errors.category.message}</p>}
            </div>
            <div>
              <Label className="text-[#212121] font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(v) => setValue("priority", v as never)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[#212121] font-semibold">Description</Label>
            <Textarea
              placeholder="Describe the issue in detail..."
              {...register("description")}
              error={errors.description?.message}
              rows={3}
            />
          </div>

          <div>
            <Label className="text-[#212121] font-semibold">Photos (optional, up to {MAX_TICKET_PHOTOS})</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="w-full text-sm text-[#6B5D45] mt-1 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#1B5E20]/10 file:text-[#1B5E20] hover:file:bg-[#1B5E20]/15 transition-colors"
              onChange={(e) => handlePhotoChange(e.target.files)}
            />
            {previewUrls.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previewUrls.map((url, i) => (
                  <div key={url} className="relative w-16 h-16 shrink-0">
                    <img
                      src={url}
                      alt={`Selected photo ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-[#D4C9A8]"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label="Remove photo"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#B71C1C] text-white flex items-center justify-center shadow-sm hover:bg-[#B71C1C]/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photoLimitWarning && (
              <p className="text-xs text-[#B71C1C] mt-1">Only the first {MAX_TICKET_PHOTOS} photos were kept.</p>
            )}
            {photoSizeWarning && (
              <p className="text-xs text-[#B71C1C] mt-1">
                Some photos were too large (max {Math.round(MAX_TICKET_PHOTO_BYTES / (1024 * 1024))}MB each) and were skipped.
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-xl bg-[#B71C1C]/10 border border-[#B71C1C]/20 px-3 py-2.5 text-sm text-[#B71C1C]">
              {serverError}
            </div>
          )}
          {savedOffline && (
            <div className="rounded-xl bg-[#1B5E20]/10 border border-[#1B5E20]/20 px-3 py-2.5 text-sm text-[#1B5E20]">
              You're offline — this report was saved on your device and will submit automatically once you're back online.
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="secondary" onClick={() => { reset(); setServerError(null); setSavedOffline(false); setPhotos(null); setPhotoLimitWarning(false); setPhotoSizeWarning(false); onClose(); }}>
            {savedOffline ? "Close" : "Cancel"}
          </Button>
          {!savedOffline && (
            <Button
              onClick={handleSubmit(onSubmit)}
              loading={isSubmitting || mutation.isPending}
            >
              Submit Ticket
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
