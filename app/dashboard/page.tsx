import { DashboardWhatsAppCard } from "@/components/dashboard/dashboard-whatsapp-card";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardQuickLinks } from "@/components/dashboard/dashboard-quick-links";
import { DashboardRecentCampaigns } from "@/components/dashboard/dashboard-recent-campaigns";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Dashboard
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Check your contacts, campaigns, and messaging stats. Quick access to key areas below.
        </p>
      </header>

      {/* First row: KPI stat cards */}
      <section>
        <DashboardStats />
      </section>

      {/* Second row: WhatsApp + Quick links */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[30%_1fr]">
        <div className="min-w-0">
          <DashboardWhatsAppCard />
        </div>
        <div className="min-w-0 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Quick links</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Jump to a section</p>
          </div>
          <DashboardQuickLinks />
        </div>
      </section>

      {/* Third row: Recent campaigns */}
      <section>
        <DashboardRecentCampaigns />
      </section>
    </div>
  );
}
