"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFacebookSDK, type EmbeddedSignupEventData } from "./facebook-sdk";

interface WhatsAppConnectButtonProps {
  projectId: string;
  appId: string;
  configId: string;
  solutionId?: string | null;
  onSuccess: () => void;
  disabled?: boolean;
}

export function WhatsAppConnectButton({
  projectId,
  appId,
  configId,
  solutionId,
  onSuccess,
  disabled,
}: WhatsAppConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [isHttps, setIsHttps] = useState(true);

  // Check if on HTTPS
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsHttps(window.location.protocol === "https:");
    }
  }, []);

  const handleAuthSuccess = async (code: string) => {
    setIsConnecting(true);
    setCurrentStep("Exchanging authorization...");

    try {
      const response = await fetch(
        `/api/projects/${projectId}/whatsapp/oauth/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect WhatsApp account");
      }

      toast.success("WhatsApp account connected successfully!");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Connection failed"
      );
    } finally {
      setIsConnecting(false);
      setCurrentStep(null);
    }
  };

  const handleAuthError = (error: string) => {
    // Don't show error for user cancellation
    if (error !== "cancelled") {
      toast.error(`Authentication failed: ${error}`);
    }
    setIsConnecting(false);
    setCurrentStep(null);
  };

  const handleEmbeddedSignupEvent = (data: EmbeddedSignupEventData) => {
    if (data.current_step) {
      setCurrentStep(data.current_step);
    }
  };

  const { launchEmbeddedSignup, sdkReady } = useFacebookSDK({
    appId,
    configId,
    solutionId,
    onAuthSuccess: handleAuthSuccess,
    onAuthError: handleAuthError,
    onEmbeddedSignupEvent: handleEmbeddedSignupEvent,
  });

  if (!isHttps) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 dark:text-amber-100">HTTPS Required</h4>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                WhatsApp Embedded Signup requires HTTPS. For local development, use ngrok or deploy to a staging environment with HTTPS.
              </p>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                You can still use the manual connection method below.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={launchEmbeddedSignup}
      disabled={disabled || isConnecting || !sdkReady}
      className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
    >
      {!sdkReady ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading SDK...
        </>
      ) : isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {currentStep || "Connecting..."}
        </>
      ) : (
        <>
          <WhatsAppIcon className="h-4 w-4" />
          Connect with WhatsApp
        </>
      )}
    </Button>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
