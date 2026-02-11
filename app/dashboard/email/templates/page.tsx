import { Mail } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function EmailTemplatesPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Email Templates"
        description="Create and manage email templates for your campaigns."
      />
      <Card className="bg-white dark:bg-gray-900 w-full">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground mb-4">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">Coming soon</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Email templates are not available yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
