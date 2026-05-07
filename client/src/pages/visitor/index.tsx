import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VisitorList } from "@/components/visitor/visitor-list";
import { GateLog } from "@/components/visitor/gate-log";
import { QrScanner } from "@/components/visitor/qr-scanner";

export default function VisitorsPage() {
  const { user } = useAuth();
  const isSecurityOrAdmin = user?.role === "security" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Visitors" />
      <main className="max-w-lg mx-auto px-4 pt-4">
        {user?.role === "resident" && <VisitorList />}

        {isSecurityOrAdmin && (
          <Tabs defaultValue="scan">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="scan" className="flex-1">Scan / Lookup</TabsTrigger>
              <TabsTrigger value="log" className="flex-1">Gate Log</TabsTrigger>
              {user.role === "admin" && (
                <TabsTrigger value="all" className="flex-1">All Passes</TabsTrigger>
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
