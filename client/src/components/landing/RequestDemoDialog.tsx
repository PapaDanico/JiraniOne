import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createLeadSchema, type CreateLeadInput } from "@shared/validators";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { BRAND_NAME } from "@shared/brand";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RequestDemoDialog({ open, onClose }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateLeadInput) => api.post("/api/leads", data),
  });

  const onSubmit = (data: CreateLeadInput) => {
    mutation.mutate(data);
  };

  // Reset both form and mutation state on close — otherwise a stale
  // success/error from a previous attempt reappears the next time the
  // dialog opens, since the component stays mounted across open/close.
  const handleClose = () => {
    reset();
    mutation.reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Block dismissal (X, Escape, outside-click all route through here
        // in controlled mode) while a submission is in flight — otherwise
        // closing mid-request lets a late resolution flip the mutation to
        // success/error after the user has already reopened for a new
        // attempt.
        if (!v && !mutation.isPending) handleClose();
      }}
    >
      <DialogContent>
        {mutation.isSuccess ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-[#1B5E20] mx-auto" />
            <DialogTitle>Thank you!</DialogTitle>
            <p className="text-sm text-[#6B5D45]">
              We've received your details and will reach out shortly to set up
              {BRAND_NAME} for your estate.
            </p>
            <Button onClick={handleClose} className="w-full mt-2">
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle>Bring {BRAND_NAME} to Your Estate</DialogTitle>
                  <DialogDescription>
                    Tell us about your estate and we'll set up a walkthrough.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form
              id="request-demo-form"
              onSubmit={handleSubmit(onSubmit)}
              className="px-6 pb-2 space-y-4"
            >
              <div>
                <Label htmlFor="lestate" className="text-[#212121] font-semibold">
                  Estate / Company Name
                </Label>
                <Input
                  id="lestate"
                  placeholder="e.g. Greenview Gardens"
                  {...register("estateName")}
                  error={errors.estateName?.message}
                />
              </div>

              <div>
                <Label htmlFor="lcontact" className="text-[#212121] font-semibold">
                  Your Name
                </Label>
                <Input
                  id="lcontact"
                  placeholder="e.g. Jane Wambui"
                  {...register("contactName")}
                  error={errors.contactName?.message}
                />
              </div>

              <div>
                <Label htmlFor="lphone" className="text-[#212121] font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="lphone"
                  type="tel"
                  placeholder="0722 123 456"
                  inputMode="tel"
                  {...register("phone")}
                  error={errors.phone?.message}
                />
              </div>

              <div>
                <Label htmlFor="lemail" className="text-[#212121] font-semibold">
                  Email{" "}
                  <span className="font-normal text-[#9C8A6A] text-xs">(optional)</span>
                </Label>
                <Input
                  id="lemail"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  error={errors.email?.message}
                />
              </div>

              <div>
                <Label htmlFor="lunits" className="text-[#212121] font-semibold">
                  Number of Units{" "}
                  <span className="font-normal text-[#9C8A6A] text-xs">(optional)</span>
                </Label>
                <Input
                  id="lunits"
                  type="number"
                  placeholder="e.g. 120"
                  {...register("unitsCount", {
                    setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                  })}
                  error={errors.unitsCount?.message}
                />
              </div>

              <div>
                <Label htmlFor="lmessage" className="text-[#212121] font-semibold">
                  Message{" "}
                  <span className="font-normal text-[#9C8A6A] text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="lmessage"
                  placeholder="Anything else we should know?"
                  rows={3}
                  {...register("message")}
                  error={errors.message?.message}
                />
              </div>

              {mutation.isError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-[#B71C1C]/10 border border-[#B71C1C]/20 px-3 py-2.5 text-sm text-[#B71C1C]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {mutation.error instanceof ApiError ? mutation.error.message : "Failed to send your request"}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" loading={mutation.isPending}>
                  Request Demo
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
