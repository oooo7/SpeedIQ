import { redirect } from "next/navigation";

export default function EmailAnalyticsRedirect() {
  redirect("/dashboard/analytics?tab=email");
}
