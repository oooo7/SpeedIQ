import {
  Inbox,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  Mail,
  Users,
  UsersRound,
  CreditCard,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { BILLING_ENABLED, EMAIL_ENABLED, SMS_ENABLED } from "@/lib/features";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  locked?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  requiresProject?: boolean;
  locked?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        requiresProject: true,
      },
      {
        title: "WhatsApp Marketing",
        url: "/dashboard/whatsapp",
        icon: MessageSquare,
        requiresProject: true,
        subItems: [
          {
            title: "Campaigns",
            url: "/dashboard/whatsapp/campaigns",
          },
          {
            title: "Contacts",
            url: "/dashboard/whatsapp/contacts",
          },
          {
            title: "Templates",
            url: "/dashboard/whatsapp/templates",
          },
          {
            title: "Chats",
            url: "/dashboard/whatsapp/live-chat",
          },
        ],
      },
      {
        title: "Email Marketing",
        url: "/dashboard/email",
        icon: Mail,
        requiresProject: true,
        locked: !EMAIL_ENABLED,
        subItems: EMAIL_ENABLED
          ? [
              { title: "Campaigns", url: "/dashboard/email/campaigns" },
              { title: "Subscribers", url: "/dashboard/email/subscribers" },
              { title: "Templates", url: "/dashboard/email/templates" },
            ]
          : undefined,
      },
      {
        title: "SMS Marketing",
        url: "/dashboard/sms",
        icon: MessageSquareText,
        requiresProject: true,
        locked: !SMS_ENABLED,
        subItems: SMS_ENABLED
          ? [
              { title: "Campaigns", url: "/dashboard/sms/campaigns" },
              { title: "Contacts", url: "/dashboard/sms/contacts" },
              { title: "Templates", url: "/dashboard/sms/templates" },
              { title: "Chats", url: "/dashboard/sms/live-chat" },
              { title: "Analytics", url: "/dashboard/sms/analytics" },
            ]
          : undefined,
      },
      {
        title: "Automation",
        url: "/dashboard/automation",
        icon: Workflow,
        requiresProject: true,
      },
      {
        title: "Contacts",
        url: "/dashboard/contacts",
        icon: Users,
        requiresProject: true,
        subItems: [
          {
            title: "All Contacts",
            url: "/dashboard/contacts",
          },
          {
            title: "Upload CSV",
            url: "/dashboard/contacts/upload",
          },
        ],
      },
      {
        title: "Team",
        url: "/dashboard/team",
        icon: UsersRound,
        requiresProject: true,
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        requiresProject: true,
        subItems: [
          { title: "WhatsApp", url: "/dashboard/settings/whatsapp-account" },
          { title: "Email", url: "/dashboard/settings/email", locked: !EMAIL_ENABLED },
          { title: "SMS", url: "/dashboard/settings/sms", locked: !SMS_ENABLED },
          { title: "Tags", url: "/dashboard/settings/tags" },
          { title: "Canned Messages", url: "/dashboard/settings/canned-message" },
        ],
      },
      {
        title: "Billing",
        url: "/dashboard/billing",
        icon: CreditCard,
        requiresProject: true,
        locked: !BILLING_ENABLED,
      },
      {
        title: "Invitations",
        url: "/invitations",
        icon: Inbox,
      },
    ],
  },
];
