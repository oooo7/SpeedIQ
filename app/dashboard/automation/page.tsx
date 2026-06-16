import type { Metadata } from "next";
import { AutomationClient } from "./automation-client";

export const metadata: Metadata = {
  title: "Omnichannel Visual Journey Builder — SpeedIQ",
  description: "Create, test, and run multi-step customer message workflows spanning WhatsApp, Email, and SMS.",
};

export default function AutomationDashboardPage() {
  return <AutomationClient />;
}
