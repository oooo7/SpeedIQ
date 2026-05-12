import Link from "next/link";
import {
  Lock,
  Mail,
  MessageSquare,
  Settings,
  Smartphone,
  Users,
  UsersRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EMAIL_ENABLED, SMS_ENABLED } from "@/lib/features";

const mainLinks = [
  { title: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageSquare, locked: false },
  { title: "Email", href: "/dashboard/email", icon: Mail, locked: !EMAIL_ENABLED },
  { title: "SMS", href: "/dashboard/sms", icon: Smartphone, locked: !SMS_ENABLED },
  { title: "Contacts", href: "/dashboard/contacts", icon: Users, locked: false },
  { title: "Team", href: "/dashboard/team", icon: UsersRound, locked: false },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, locked: false },
];

export function DashboardQuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {mainLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}>
            <Card
              className={`h-full transition-colors ${
                item.locked
                  ? "bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800/40"
                  : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`font-medium text-sm ${
                    item.locked ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {item.title}
                </span>
                {item.locked && <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
