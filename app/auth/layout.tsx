import { ReactNode } from "react";

import { Command } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="bg-zinc-900 dark:bg-zinc-950 relative order-2 hidden h-full rounded-2xl lg:flex overflow-hidden">
          <div className="relative z-10 flex flex-col w-full">
            <div className="text-zinc-100 absolute top-10 space-y-2 px-10">
              <Command className="size-9 text-zinc-400" strokeWidth={1.5} />
              <h1 className="text-xl font-semibold tracking-tight text-white">{APP_CONFIG.name}</h1>
              <p className="text-sm text-zinc-400 max-w-[280px]">WhatsApp & Email Marketing—automate, engage, scale.</p>
            </div>

            <div className="absolute bottom-10 flex w-full justify-between gap-6 px-10">
              <div className="flex-1 space-y-1 min-w-0">
                <h2 className="font-medium text-white text-sm">WhatsApp Marketing</h2>
                <p className="text-xs text-zinc-500">Broadcasts, chatbots, live chat. Reach your audience on WhatsApp.</p>
              </div>
              <Separator orientation="vertical" className="shrink-0 mx-1 !h-auto bg-zinc-700" />
              <div className="flex-1 space-y-1 min-w-0">
                <h2 className="font-medium text-white text-sm">Email Marketing</h2>
                <p className="text-xs text-zinc-500">Campaigns, automation, analytics. Drive engagement with email.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
