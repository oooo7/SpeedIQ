import { Lock, Mail, MessageSquare, Smartphone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Variant = "whatsapp" | "email" | "sms";

const VARIANTS: Record<
  Variant,
  {
    title: string;
    Icon: typeof Mail;
    cardClass: string;
    iconBg: string;
    subClass: string;
  }
> = {
  whatsapp: {
    title: "WhatsApp",
    Icon: MessageSquare,
    cardClass: "bg-emerald-50 dark:bg-emerald-950/40",
    iconBg: "bg-emerald-600",
    subClass: "text-emerald-800/80 dark:text-emerald-200/80",
  },
  email: {
    title: "Email",
    Icon: Mail,
    cardClass: "bg-blue-50 dark:bg-blue-950/40",
    iconBg: "bg-blue-600",
    subClass: "text-blue-800/80 dark:text-blue-200/80",
  },
  sms: {
    title: "SMS",
    Icon: Smartphone,
    cardClass: "bg-purple-50 dark:bg-purple-950/40",
    iconBg: "bg-purple-600",
    subClass: "text-purple-800/80 dark:text-purple-200/80",
  },
};

export function LockedChannelCard({ variant }: { variant: Variant }) {
  const v = VARIANTS[variant];
  const Icon = v.Icon;
  return (
    <Card className={`h-full flex flex-col ${v.cardClass}`}>
      <CardContent className="p-5 flex flex-col flex-1 gap-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center text-white ${v.iconBg} opacity-60`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-base text-foreground">{v.title}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            </div>
            <p className={`text-sm mt-0.5 ${v.subClass}`}>This channel is currently disabled</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Contact your administrator if you need access to {v.title}.
        </p>
      </CardContent>
    </Card>
  );
}
