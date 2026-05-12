import { Lock } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureLockedProps {
  title: string;
  description?: string;
  reason?: string;
}

export function FeatureLocked({
  title,
  description,
  reason = "This feature is currently disabled. Contact your administrator if you need access.",
}: FeatureLockedProps) {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={title} description={description} />
      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-base font-medium">{title} is locked</p>
          <p className="max-w-md text-sm text-muted-foreground">{reason}</p>
        </CardContent>
      </Card>
    </div>
  );
}
