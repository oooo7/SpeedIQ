import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactsUploadPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Upload CSV"
        description="Import contacts from a CSV file. CSV import is available for WhatsApp contacts."
      />
      <Card className="bg-white dark:bg-gray-900 w-full">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Go to WhatsApp contacts to upload a CSV with columns: phone (required), name, email.
          </p>
          <Link href="/dashboard/whatsapp/contacts">
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Open WhatsApp contacts to import
            </Button>
          </Link>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Email subscriber import will be available when Email Marketing is launched.
      </p>
    </div>
  );
}
