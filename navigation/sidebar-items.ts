import {
  LayoutDashboard,
  MessageSquare,
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
      },
    ],
  },
];
