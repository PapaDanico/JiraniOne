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
import { UserPlus } from "lucide-react";

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
    mutationFn: (data: CreateVisitorInput) => api.post("/api/visitors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors", "my"] });
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      setServerError(err instanceof Error ? err.message : "Imeshindwa kuunda pasi");
    },
  });

  const onSubmit = async (data: CreateVisitorInput) => {
    setServerError(null);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setServerError(null); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Karibisha Mgeni</DialogTitle>
              <DialogDescription>
                QR code itatolewa na kutumwa kwa mgeni wako.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-2 space-y-4">
          <div>
            <Label htmlFor="vname" className="text-[#212121] font-semibold">Jina la Mgeni</Label>
            <Input
              id="vname"
              placeholder="Mfano: John Kamau"
              {...register("name")}
              error={errors.name?.message}
            />
          </div>

          <div>
            <Label htmlFor="vphone" className="text-[#212121] font-semibold">Nambari ya Simu</Label>
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
            <Label htmlFor="vpurpose" className="text-[#212121] font-semibold">Sababu ya Kutembelea (si lazima)</Label>
            <Input
              id="vpurpose"
              placeholder="Mfano: Ziara ya nyumbani, uwasilishaji"
              {...register("purpose")}
              error={errors.purpose?.message}
            />
          </div>

          <div>
            <Label htmlFor="vexpected" className="text-[#212121] font-semibold">Wakati wa Kutarajiwa (si lazima)</Label>
            <Input
              id="vexpected"
              type="datetime-local"
              {...register("expectedAt")}
              error={errors.expectedAt?.message}
            />
          </div>

          {serverError && (
            <div className="rounded-xl bg-[#B71C1C]/10 border border-[#B71C1C]/20 px-3 py-2.5 text-sm text-[#B71C1C]">
              {serverError}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="secondary" onClick={() => { reset(); setServerError(null); onClose(); }}>
            Ghairi
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting || mutation.isPending}
          >
            Unda Pasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
