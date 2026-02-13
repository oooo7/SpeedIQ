import Link from "next/link";
import { Mail, MessageSquare, MessageSquareQuote, Tag } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

const settingLinks = [
  { title: "WhatsApp", href: "/dashboard/settings/whatsapp-account", icon: MessageSquare },
  { title: "Email", href: "/dashboard/settings/email", icon: Mail },
  { title: "Tags", href: "/dashboard/settings/tags", icon: Tag },
  { title: "Canned Messages", href: "/dashboard/settings/canned-message", icon: MessageSquareQuote },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Settings"
        description="Manage your project settings and integrations."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="bg-white dark:bg-gray-900 h-full transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground">
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
