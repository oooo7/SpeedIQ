import Link from "next/link";
import { LayoutTemplate, Megaphone, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

const links = [
  { title: "Campaigns", href: "/dashboard/email/campaigns", icon: Megaphone },
  { title: "Subscribers", href: "/dashboard/email/subscribers", icon: Users },
  { title: "Templates", href: "/dashboard/email/templates", icon: LayoutTemplate },
];

export default function EmailMarketingPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Email Marketing"
        description="Manage campaigns, subscribers, and templates."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="bg-white dark:bg-gray-900 h-full transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-sm text-foreground">{item.title}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
