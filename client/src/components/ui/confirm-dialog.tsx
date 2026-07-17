import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

// Shared confirmation prompt for destructive/irreversible taps (delete,
// cancel) — mobile mis-taps are a real risk for this app's target users
// (budget Android devices, thumb typing on a moving matatu), and several
// destructive actions previously fired immediately on a single click.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${destructive ? "bg-[#B71C1C]/10" : "bg-[#1B5E20]/10"}`}>
              <AlertTriangle className={`h-5 w-5 ${destructive ? "text-[#B71C1C]" : "text-[#1B5E20]"}`} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2">
          <p className="text-sm text-[#6B5D45]">{description}</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className={destructive ? "bg-[#B71C1C] hover:bg-[#B71C1C]/90 text-white" : undefined}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
