import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVisitorSchema, type CreateVisitorInput } from "@shared/validators";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, AlertTriangle, UserPlus } from "lucide-react";
import type { Visitor } from "@shared/types";
import { VISITOR_PURPOSES } from "@shared/options";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Compute the local-time minimum for datetime-local inputs (now, rounded down
// to the minute). getTimezoneOffset() returns minutes west of UTC; subtracting
// it converts the UTC epoch to local time before slicing.
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function CreateVisitorPass({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [smsWarning, setSmsWarning] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVisitorInput>({
    resolver: zodResolver(createVisitorSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateVisitorInput) => api.post<Visitor>("/api/visitors", data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["visitors", "my"] });
      // The visitor's SMS pass is the only way they know to show it at the
      // gate — if it didn't send, don't silently close as if everything
      // worked; the resident needs to know so they can tell the visitor
      // directly (call/WhatsApp) instead.
      if (!res.data.smsSent) {
        setSmsWarning(true);
        return;
      }
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : "Failed to create visitor pass");
    },
  });

  const onSubmit = (data: CreateVisitorInput) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setServerError(null);
    setSmsWarning(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent>
        {smsWarning ? (
          <div className="p-6 text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-brand-amber mx-auto" />
            <DialogTitle>Pass created — SMS didn't send</DialogTitle>
            <p className="text-sm text-[#6B5D45]">
              The visitor pass was created, but we couldn't send the SMS.
              Please share the pass details with your visitor directly
              (call or WhatsApp) so they have it at the gate.
            </p>
            <Button onClick={handleClose} className="w-full mt-2">
              Got it
            </Button>
          </div>
        ) : (
        <>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Invite a Visitor</DialogTitle>
              <DialogDescription>
                A QR code will be generated and sent to your visitor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/*
          The form wraps both the fields AND the footer so that the submit
          button is always part of the form — pressing Enter in any field
          triggers submission, and type="submit" on the button works correctly.
        */}
        <form
          id="visitor-pass-form"
          onSubmit={handleSubmit(onSubmit)}
          className="px-6 pb-2 space-y-4"
        >
          <div>
            <Label htmlFor="vname" className="text-[#212121] font-semibold">
              Visitor's Name
            </Label>
            <Input
              id="vname"
              placeholder="e.g. John Kamau"
              autoComplete="off"
              {...register("name")}
              error={errors.name?.message}
            />
          </div>

          <div>
            <Label htmlFor="vphone" className="text-[#212121] font-semibold">
              Phone Number
            </Label>
            <Input
              id="vphone"
              type="tel"
              placeholder="0722 123 456"
              inputMode="tel"
              autoComplete="off"
              {...register("phone")}
              error={errors.phone?.message}
            />
          </div>

          <div>
            <Label htmlFor="vpurpose" className="text-[#212121] font-semibold">
              Purpose of Visit{" "}
              <span className="font-normal text-[#9C8A6A] text-xs">(optional)</span>
            </Label>
            {/* Native select (not shadcn) — registers directly with
                react-hook-form, and structured purposes make the gate log
                analysable instead of a pile of free-text variations. */}
            <select
              id="vpurpose"
              {...register("purpose")}
              className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/30 focus:border-[#1B5E20] text-[#212121]"
            >
              <option value="">Select purpose…</option>
              {VISITOR_PURPOSES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="vexpected" className="text-[#212121] font-semibold">
              Expected Arrival{" "}
              <span className="font-normal text-[#9C8A6A] text-xs">(optional)</span>
            </Label>
            <Input
              id="vexpected"
              type="datetime-local"
              min={localNow()}
              {...register("expectedAt")}
              error={errors.expectedAt?.message}
              className="[color-scheme:light]"
            />
            <p className="mt-1 text-xs text-[#9C8A6A]">
              Leave blank if the visitor is coming any time today.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-[#B71C1C]/10 border border-[#B71C1C]/20 px-3 py-2.5 text-sm text-[#B71C1C]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          {/* Footer is inside the form so type="submit" works and Enter submits */}
          <DialogFooter className="pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting || mutation.isPending}
            >
              Create Pass
            </Button>
          </DialogFooter>
        </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
