import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VisitorList } from "@/components/visitor/visitor-list";
import { GateLog } from "@/components/visitor/gate-log";
import { QrScanner } from "@/components/visitor/qr-scanner";
import { Search, ClipboardList, Users } from "lucide-react";

export default function VisitorsPage() {
  const { user } = useAuth();
  const isSecurityOrAdmin = user?.role === "security" || user?.role === "admin";

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Visitors" />
      <main className="container-list pt-4 page-content">
        {user?.role === "resident" && <VisitorList />}

        {isSecurityOrAdmin && (
          <Tabs defaultValue="scan">
            <TabsList className="w-full mb-4 bg-[#EDE7D8] border border-[#D4C9A8]">
              <TabsTrigger value="scan" className="flex-1 flex items-center gap-1.5 data-[state=active]:bg-[#1B5E20] data-[state=active]:text-white">
                <Search className="h-3.5 w-3.5" /> Search
              </TabsTrigger>
              <TabsTrigger value="log" className="flex-1 flex items-center gap-1.5 data-[state=active]:bg-[#1B5E20] data-[state=active]:text-white">
                <ClipboardList className="h-3.5 w-3.5" /> Gate Log
              </TabsTrigger>
              {user.role === "admin" && (
                <TabsTrigger value="all" className="flex-1 flex items-center gap-1.5 data-[state=active]:bg-[#1B5E20] data-[state=active]:text-white">
                  <Users className="h-3.5 w-3.5" /> All
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="scan">
              <QrScanner />
            </TabsContent>
            <TabsContent value="log">
              <GateLog />
            </TabsContent>
            {user.role === "admin" && (
              <TabsContent value="all">
                <VisitorList />
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
