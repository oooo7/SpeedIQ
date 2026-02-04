import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactsUploadPage() {
  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-2">
        <Upload className="h-6 w-6" />
        <h1 className="text-xl font-semibold">Upload CSV</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Import contacts from a CSV file. CSV import is available for WhatsApp contacts.
      </p>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <p className="text-sm mb-4">
          Go to WhatsApp contacts to upload a CSV with columns: phone (required), name, email.
        </p>
        <Link href="/dashboard/whatsapp/contacts">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Open WhatsApp contacts to import
          </Button>
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Email subscriber import will be available when Email Marketing is launched.
      </p>
    </div>
  );
}
