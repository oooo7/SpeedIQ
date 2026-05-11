import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Settings,
  Smartphone,
  Users,
  UsersRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const mainLinks = [
  { title: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageSquare },
  { title: "Email", href: "/dashboard/email", icon: Mail },
  { title: "SMS", href: "/dashboard/sms", icon: Smartphone },
  { title: "Contacts", href: "/dashboard/contacts", icon: Users },
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
  );
}
