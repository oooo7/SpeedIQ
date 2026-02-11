import { DashboardWhatsAppCard } from "@/components/dashboard/dashboard-whatsapp-card";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardQuickLinks } from "@/components/dashboard/dashboard-quick-links";
import { DashboardRecentCampaigns } from "@/components/dashboard/dashboard-recent-campaigns";
import { PageHeader } from "@/components/dashboard/page-header";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Overview"
        description="Check your contacts, campaigns, and messaging stats. Quick access to key areas below."
      />

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
            <h2 className="text-sm font-medium text-foreground">Quick links</h2>
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
