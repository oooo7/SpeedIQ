import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailMarketingPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Email Marketing</h1>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 border-dashed p-8 text-center">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">Coming soon</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Email campaigns, subscribers, and templates will be available here.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" disabled>
            Campaigns
          </Button>
          <Button variant="outline" disabled>
            Subscribers
          </Button>
          <Button variant="outline" disabled>
            Templates
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        In the meantime, use WhatsApp Marketing for campaigns and contacts.
      </p>
    </div>
  );
}
