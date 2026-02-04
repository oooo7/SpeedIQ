import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailSubscribersPage() {
  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Email Subscribers</h1>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Email subscriber management is not available yet.
        </p>
        <p className="text-sm font-medium mb-2">Coming soon</p>
        <Link href="/dashboard/email">
          <Button variant="outline" size="sm">
            Back to Email Marketing
          </Button>
        </Link>
      </div>
    </div>
  );
}
