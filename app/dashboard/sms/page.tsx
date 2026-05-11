import Link from "next/link";
import { BarChart3, MessageCircle, Megaphone, Settings, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

const links = [
  { title: "Campaigns", href: "/dashboard/sms/campaigns", icon: Megaphone },
  { title: "Contacts", href: "/dashboard/sms/contacts", icon: Users },
  { title: "Live Chat", href: "/dashboard/sms/live-chat", icon: MessageCircle },
  { title: "Templates", href: "/dashboard/sms/templates", icon: Settings },
  { title: "Analytics", href: "/dashboard/sms/analytics", icon: BarChart3 },
];

export default function SmsPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="SMS Marketing"
        description="Build and automate SMS campaigns using your connected Twilio setup."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
