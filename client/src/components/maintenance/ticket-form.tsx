import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTicketSchema, type CreateTicketInput } from "@shared/validators";
import { api } from "@/lib/api";
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

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "roads", label: "Roads & Paths" },
  { value: "landscaping", label: "Landscaping" },
  { value: "security", label: "Security" },
  { value: "cleaning", label: "Cleaning" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TicketForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);

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
    mutationFn: (data: CreateTicketInput) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("priority", data.priority);
      if (photos) {
        Array.from(photos).forEach((f) => formData.append("photos", f));
      }
      return api.upload("/api/maintenance", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", "my"] });
      reset();
      setPhotos(null);
      onClose();
    },
    onError: (err: unknown) => {
      setServerError(err instanceof Error ? err.message : "Failed to submit ticket");
    },
  });

  const onSubmit = (data: CreateTicketInput) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const category = watch("category");
  const priority = watch("priority");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a Problem</DialogTitle>
          <DialogDescription>
            Describe the issue and we'll get it sorted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-2 space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              placeholder="e.g. Burst pipe in Block B stairwell"
              {...register("title")}
              error={errors.title?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setValue("category", v as never)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>
              )}
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setValue("priority", v as never)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the issue in detail..."
              {...register("description")}
              error={errors.description?.message}
            />
          </div>

          <div>
            <Label>Photos (optional, max 5)</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1A5C38]/10 file:text-[#1A5C38]"
              onChange={(e) => setPhotos(e.target.files)}
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
            Submit Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
