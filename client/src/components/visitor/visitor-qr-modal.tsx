import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Visitor } from "@shared/types";
import { formatDateTime } from "@/lib/utils";
import { CheckCircle, Clock } from "lucide-react";

interface Props {
  visitor: Visitor;
  onClose: () => void;
}

export function VisitorQrModal({ visitor, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Visitor Pass</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-6 text-center space-y-4">
          {/* Visitor identity */}
          <div className="bg-[#1B5E20] rounded-2xl p-4 text-white">
            <div className="w-12 h-12 rounded-full bg-[#D4A017]/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-[#D4A017] font-bold text-xl">{visitor.name.charAt(0)}</span>
            </div>
            <p className="font-bold text-lg tracking-tight">{visitor.name}</p>
            <p className="text-white/70 text-sm">{visitor.phone}</p>
          </div>

          {/* Details */}
          {visitor.purpose && (
            <p className="text-sm text-[#6B5D45] italic">"{visitor.purpose}"</p>
          )}
          {visitor.expectedAt && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-[#6B5D45]">
              <Clock className="h-4 w-4" />
              Expected: {formatDateTime(visitor.expectedAt)}
            </div>
          )}

          {/* QR Code */}
          <div className="flex justify-center py-2">
            <div className="p-3 bg-white rounded-2xl border-4 border-[#D4C9A8] shadow-inner">
              <img
                src={visitor.qrCode}
                alt="Visitor QR Code"
                className="w-44 h-44"
              />
            </div>
          </div>

          {/* Pass ID */}
          <div className="bg-[#EDE7D8] rounded-xl px-4 py-2.5 border border-[#D4C9A8]">
            <p className="text-xs text-[#6B5D45] mb-0.5">Pass ID</p>
            <p className="font-mono font-bold text-[#212121] text-lg tracking-widest">
              {visitor.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {visitor.smsSent && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-[#1B5E20] font-semibold">
              <CheckCircle className="h-4 w-4" />
              SMS sent to visitor
            </div>
          )}

          <p className="text-xs text-[#D4C9A8]">Show this code at the gate</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
