import { redirect } from "next/navigation";

export default function WhatsAppAnalyticsRedirect() {
  redirect("/dashboard/analytics?tab=whatsapp");
}
