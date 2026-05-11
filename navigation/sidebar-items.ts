import {
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  Mail,
  Users,
  UsersRound,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
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
        subItems: [
          {
            title: "Campaigns",
            url: "/dashboard/email/campaigns",
          },
          {
            title: "Subscribers",
            url: "/dashboard/email/subscribers",
          },
          {
            title: "Templates",
            url: "/dashboard/email/templates",
          },
        ],
      },
      {
        title: "SMS Marketing",
        url: "/dashboard/sms",
        icon: MessageSquareText,
        requiresProject: true,
        subItems: [
          {
            title: "Campaigns",
            url: "/dashboard/sms/campaigns",
          },
          {
            title: "Contacts",
            url: "/dashboard/sms/contacts",
          },
          {
            title: "Templates",
            url: "/dashboard/sms/templates",
          },
          {
            title: "Chats",
            url: "/dashboard/sms/live-chat",
          },
          {
            title: "Analytics",
            url: "/dashboard/sms/analytics",
          },
        ],
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
          {
            title: "WhatsApp",
            url: "/dashboard/settings/whatsapp-account",
          },
          {
            title: "Email",
            url: "/dashboard/settings/email",
          },
          {
            title: "SMS",
            url: "/dashboard/settings/sms",
          },
          {
            title: "Tags",
            url: "/dashboard/settings/tags",
          },
          {
            title: "Canned Messages",
            url: "/dashboard/settings/canned-message",
          },
        ],
      },
      {
        title: "Billing",
        url: "/dashboard/billing",
        icon: CreditCard,
        requiresProject: true,
      },
    ],
  },
];
