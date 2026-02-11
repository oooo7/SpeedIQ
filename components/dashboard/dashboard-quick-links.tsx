import Link from "next/link";
import {
  BarChart3,
  Mail,
  MessageSquare,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const mainLinks = [
  { title: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageSquare },
  { title: "Email", href: "/dashboard/email", icon: Mail },
  { title: "Contacts", href: "/dashboard/contacts", icon: Users },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Team", href: "/dashboard/team", icon: UsersRound },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardQuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {mainLinks.map((item) => {
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
  );
}
