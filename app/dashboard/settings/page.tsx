import Link from "next/link";
import {
  MessageSquare,
  Tag,
  MessageCircle,
  Headphones,
  Megaphone,
  FileText,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

const settingLinks = [
  { title: "WhatsApp Account", href: "/dashboard/settings/whatsapp-account", icon: MessageSquare },
  { title: "Tags", href: "/dashboard/settings/tags", icon: Tag },
  { title: "Canned Message", href: "/dashboard/settings/canned-message", icon: MessageCircle },
  { title: "Template Message", href: "/dashboard/settings/template-message", icon: FileText },
  { title: "Optin Management", href: "/dashboard/settings/optin-management", icon: MessageSquare },
  { title: "Live Chat Settings", href: "/dashboard/settings/live-chat", icon: Headphones },
  { title: "Campaign Settings", href: "/dashboard/settings/campaign", icon: Megaphone },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        label="Settings"
        title="Settings"
        description="Manage your project settings and integrations."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/50 h-full transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/80 text-muted-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">{item.title}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
