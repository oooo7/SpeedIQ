import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function EmailCampaignsPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        label="Email Marketing"
        title="Email Campaigns"
        description="Create and send email campaigns to your subscribers."
      />
      <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/50 max-w-lg">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800/80 text-muted-foreground mb-4">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming soon</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Email campaigns are not available yet.
          </p>
          <Link href="/dashboard/email">
            <Button variant="outline" size="sm">
              Back to Email Marketing
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
