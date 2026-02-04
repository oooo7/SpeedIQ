import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Choose a setting from the sidebar or{" "}
        <Link href="/dashboard/settings/whatsapp-account">
          <Button variant="link" className="p-0 h-auto">
            connect WhatsApp Account
          </Button>
        </Link>
        .
      </p>
    </div>
  );
}
