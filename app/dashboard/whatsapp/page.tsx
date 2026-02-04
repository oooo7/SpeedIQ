import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WhatsAppPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-500" />
        <h1 className="text-xl font-semibold">WhatsApp Marketing</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage campaigns, contacts, templates, and live chat from the sidebar.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/whatsapp/contacts">
          <Button variant="outline">Contacts</Button>
        </Link>
        <Link href="/dashboard/whatsapp/campaigns">
          <Button variant="outline">Campaigns</Button>
        </Link>
        <Link href="/dashboard/whatsapp/templates">
          <Button variant="outline">Templates</Button>
        </Link>
        <Link href="/dashboard/whatsapp/live-chat">
          <Button variant="outline">Live Chat</Button>
        </Link>
      </div>
    </div>
  );
}
