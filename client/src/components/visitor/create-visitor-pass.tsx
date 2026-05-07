import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVisitorSchema, type CreateVisitorInput } from "@shared/validators";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateVisitorPass({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVisitorInput>({
    resolver: zodResolver(createVisitorSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateVisitorInput) =>
      api.post("/api/visitors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors", "my"] });
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof Error ? err.message : "Failed to create visitor pass",
      );
    },
  });

  const onSubmit = async (data: CreateVisitorInput) => {
    setServerError(null);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Visitor Pass</DialogTitle>
          <DialogDescription>
            A QR code will be generated and sent to your visitor via SMS.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-2 space-y-4">
          <div>
            <Label htmlFor="vname">Visitor Name</Label>
            <Input
              id="vname"
              placeholder="John Kamau"
              {...register("name")}
              error={errors.name?.message}
            />
          </div>

          <div>
            <Label htmlFor="vphone">Visitor Phone</Label>
            <Input
              id="vphone"
              type="tel"
              placeholder="0722 123 456"
              inputMode="tel"
              {...register("phone")}
              error={errors.phone?.message}
            />
          </div>

          <div>
            <Label htmlFor="vpurpose">Purpose (optional)</Label>
            <Input
              id="vpurpose"
              placeholder="e.g. House visit, delivery"
              {...register("purpose")}
              error={errors.purpose?.message}
            />
          </div>

          <div>
            <Label htmlFor="vexpected">Expected Date & Time (optional)</Label>
            <Input
              id="vexpected"
              type="datetime-local"
              {...register("expectedAt")}
              error={errors.expectedAt?.message}
            />
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              {serverError}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting || mutation.isPending}
          >
            Create Pass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
