import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { EMAIL_ENABLED } from "@/lib/features";

export default function EmailSettingsLayout({ children }: { children: React.ReactNode }) {
  if (!EMAIL_ENABLED) {
    return (
      <FeatureLocked
        title="Email Settings"
        description="Manage your email provider and domain configuration."
        reason="Email is currently disabled. Contact your administrator if you need access."
      />
    );
  }
  return <>{children}</>;
}
