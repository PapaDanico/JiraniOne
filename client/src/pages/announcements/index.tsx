import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { Announcement } from "@shared/types";

const priorityVariant: Record<string, "default" | "warning" | "urgent"> = {
  info: "default",
  warning: "warning",
  urgent: "urgent",
};

function ComposeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("info");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/api/announcements", { title, body, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post Announcement</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!title || !body}
          >
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () =>
      api.get<Announcement[]>("/api/announcements").then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Notices" />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-gray-900">Announcements</h1>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <Plus className="h-4 w-4" /> Post
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : announcements?.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements?.map((a) => (
              <Card key={a.id} className={a.priority === "urgent" ? "border-red-200 bg-red-50/30" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Badge variant={priorityVariant[a.priority] ?? "default"}>
                      {a.priority}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{a.body}</p>
                      <p className="text-xs text-gray-300 mt-2">{formatRelative(a.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
      <BottomNav />
    </div>
  );
}
