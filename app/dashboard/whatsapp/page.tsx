import Link from "next/link";
import { LayoutTemplate, Megaphone, MessageSquare, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

const links = [
  { title: "Campaigns", href: "/dashboard/whatsapp/campaigns", icon: Megaphone },
  { title: "Contacts", href: "/dashboard/whatsapp/contacts", icon: Users },
  { title: "Templates", href: "/dashboard/whatsapp/templates", icon: LayoutTemplate },
  { title: "Live Chat", href: "/dashboard/whatsapp/live-chat", icon: MessageSquare },
];

export default function WhatsAppPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        label="WhatsApp Marketing"
        title="WhatsApp Marketing"
        description="Manage campaigns, contacts, templates, and live chat."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/50 h-full transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">
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
