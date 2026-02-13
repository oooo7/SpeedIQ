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
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              WhatsApp: CSV with columns phone (required), name, email.
            </p>
            <Link href="/dashboard/whatsapp/contacts">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                WhatsApp contacts import
              </Button>
            </Link>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800/80 pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Email: CSV with columns email (required), name.
            </p>
            <Link href="/dashboard/email/subscribers">
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Email subscribers import
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
