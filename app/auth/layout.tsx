import { ReactNode } from "react";

import { Command } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="bg-purple-600 dark:bg-purple-500 relative order-2 hidden h-full rounded-3xl lg:flex overflow-hidden">
          {/* Content overlay */}
          <div className="relative z-10 flex flex-col w-full">
            <div className="text-white absolute top-10 space-y-1 px-10">
              <Command className="size-10" />
              <h1 className="text-2xl font-medium">{APP_CONFIG.name}</h1>
              <p className="text-sm">WhatsApp & Email Marketing platform—automate, engage, scale.</p>
            </div>

            <div className="absolute bottom-10 flex w-full justify-between px-10">
              <div className="text-white flex-1 space-y-1">
                <h2 className="font-medium">WhatsApp Marketing</h2>
                <p className="text-sm">Broadcasts, chatbots, and live chat. Reach and convert your audience on WhatsApp.</p>
              </div>
              <Separator orientation="vertical" className="mx-3 !h-auto bg-white/20" />
              <div className="text-white flex-1 space-y-1">
                <h2 className="font-medium">Email Marketing</h2>
                <p className="text-sm">
                  Campaigns, automation, and analytics. Drive engagement and sales with smart email.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
