import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Visitor } from "@shared/types";
import { formatDateTime } from "@/lib/utils";

interface Props {
  visitor: Visitor;
  onClose: () => void;
}

export function VisitorQrModal({ visitor, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Visitor Pass</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 text-center space-y-3">
          <p className="font-semibold text-gray-900">{visitor.name}</p>
          <p className="text-sm text-gray-500">{visitor.phone}</p>
          {visitor.expectedAt && (
            <p className="text-xs text-gray-400">
              Expected: {formatDateTime(visitor.expectedAt)}
            </p>
          )}
          {/* QR code is a data URL stored in qrCode field */}
          <div className="flex justify-center py-2">
            <img
              src={visitor.qrCode}
              alt="Visitor QR Code"
              className="w-48 h-48 rounded-xl border border-gray-100"
            />
          </div>
          <p className="text-xs text-gray-400">
            Pass ID: <span className="font-mono font-medium">{visitor.id.slice(0, 8).toUpperCase()}</span>
          </p>
          {visitor.smsSent && (
            <p className="text-xs text-green-600">✓ SMS sent to visitor</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
