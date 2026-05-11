import { DashboardWhatsAppCard } from "@/components/dashboard/dashboard-whatsapp-card";
import { DashboardEmailCard } from "@/components/dashboard/dashboard-email-card";
import { DashboardSmsCard } from "@/components/dashboard/dashboard-sms-card";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardQuickLinks } from "@/components/dashboard/dashboard-quick-links";
import { DashboardRecentCampaigns } from "@/components/dashboard/dashboard-recent-campaigns";
import { PageHeader } from "@/components/dashboard/page-header";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Overview"
        description="Track contacts, campaigns, and messaging across WhatsApp, Email, and SMS."
      />

      {/* First row: aggregated KPI stat cards */}
      <section>
        <DashboardStats />
      </section>

      {/* Second row: three channel cards */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">Channels</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connection status for each messaging channel
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardWhatsAppCard />
          <DashboardEmailCard />
          <DashboardSmsCard />
        </div>
      </section>

      {/* Third row: quick links */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">Quick links</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Jump to a section</p>
        </div>
        <DashboardQuickLinks />
      </section>

      {/* Fourth row: recent campaigns across all channels */}
      <section>
        <DashboardRecentCampaigns />
      </section>
    </div>
  );
}
