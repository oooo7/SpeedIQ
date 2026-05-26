"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  BarChart3,
  CreditCard,
  History,
  Package,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
  { href: "/admin/credit-packs", label: "Credit packs", icon: Package },
  { href: "/admin/credit-weights", label: "Credit weights", icon: Wallet },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-log", label: "Audit log", icon: History },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="hidden w-52 shrink-0 md:block">
      <ul className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = item.exact ? path === item.href : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1 font-medium text-foreground">
          <Activity className="h-3 w-3" /> Heads-up
        </p>
        <p className="mt-1">
          Changes here are live for all users immediately. Edits are recorded in the audit log.
        </p>
      </div>
    </nav>
  );
}
