import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { SMS_ENABLED } from "@/lib/features";

export default function SmsSettingsLayout({ children }: { children: React.ReactNode }) {
  if (!SMS_ENABLED) {
    return (
      <FeatureLocked
        title="SMS Settings"
        description="Manage your SMS provider and number configuration."
        reason="SMS is currently disabled. Contact your administrator if you need access."
      />
    );
  }
  return <>{children}</>;
}
