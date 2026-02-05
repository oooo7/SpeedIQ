"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsAppConnectButton } from "@/components/whatsapp/whatsapp-connect-button";

const DEFAULT_RETURN_TO = "/dashboard/settings/whatsapp-account";

export default function WhatsAppConnectPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const returnTo = searchParams.get("returnTo") ?? DEFAULT_RETURN_TO;

  const [oauthConfig, setOauthConfig] = useState<{
    appId: string;
    configId: string;
    solutionId?: string | null;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  // Require login: API calls will 401 if not logged in; redirect to login so user can return here
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => {
        if (cancelled) return;
        if (r.status === 401) {
          setAuthFailed(true);
          setAuthChecked(true);
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setOauthConfig(data);
      })
      .catch(() => setOauthConfig(null));
  }, []);

  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (authFailed) {
    const loginUrl = `/auth/login?returnTo=${encodeURIComponent(
      `/auth/whatsapp/connect?projectId=${projectId}&returnTo=${encodeURIComponent(returnTo)}`
    )}`;
    return (
      <div className="flex flex-col gap-4 p-8 max-w-md mx-auto">
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need to be signed in to connect a WhatsApp Business account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={loginUrl}>Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex flex-col gap-4 p-8 max-w-md mx-auto">
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Missing project</CardTitle>
            <CardDescription>
              This page requires a project. Open WhatsApp Account from your dashboard settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={returnTo}>Back to settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!oauthConfig) {
    return (
      <div className="flex flex-col gap-4 p-8 max-w-md mx-auto">
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Not configured</CardTitle>
            <CardDescription>
              WhatsApp Embedded Signup is not configured. Add FACEBOOK_APP_ID and WHATSAPP_CONFIG_ID to your environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={returnTo}>Back to settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/whatsapp/connect`
      : "";

  return (
    <div className="flex flex-col gap-4 p-8 max-w-md mx-auto">
      <Card className="border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle>Connect with WhatsApp</CardTitle>
          <CardDescription>
            Use Meta&apos;s secure login to connect your WhatsApp Business account. You will be returned to settings when done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WhatsAppConnectButton
            projectId={projectId}
            appId={oauthConfig.appId}
            configId={oauthConfig.configId}
            solutionId={oauthConfig.solutionId}
            onSuccess={() => {
              window.location.replace(returnTo);
            }}
          />
          <p className="text-xs text-muted-foreground">
            In Meta, use this single URL in <strong>Valid OAuth redirect URIs</strong>:{" "}
            <code className="break-all">{redirectUri || "https://your-domain.com/auth/whatsapp/connect"}</code>
          </p>
        </CardContent>
      </Card>
      <Button asChild variant="ghost" size="sm">
        <Link href={returnTo}>Cancel and go back</Link>
      </Button>
    </div>
  );
}
