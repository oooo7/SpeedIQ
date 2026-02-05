"use client";

import { useEffect, useCallback, useRef, useState } from "react";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras?: {
            setup?: {
              solutionID?: string;
            };
            featureType?: string;
            sessionInfoVersion?: number;
          };
        }
      ) => void;
    };
  }
}

interface FacebookLoginResponse {
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
  };
  status: string;
}

export interface EmbeddedSignupEventData {
  phone_number_id?: string;
  waba_id?: string;
  current_step?: string;
}

interface FacebookSDKProps {
  appId: string;
  configId: string;
  solutionId?: string | null;
  onAuthSuccess: (code: string) => void;
  onAuthError: (error: string) => void;
  onEmbeddedSignupEvent?: (data: EmbeddedSignupEventData) => void;
}

export function useFacebookSDK({
  appId,
  configId,
  solutionId,
  onAuthSuccess,
  onAuthError,
  onEmbeddedSignupEvent,
}: FacebookSDKProps) {
  const initialized = useRef(false);
  const callbacksRef = useRef({ onAuthSuccess, onAuthError, onEmbeddedSignupEvent });
  const [sdkReady, setSdkReady] = useState(false);

  // Keep callbacks up to date
  useEffect(() => {
    callbacksRef.current = { onAuthSuccess, onAuthError, onEmbeddedSignupEvent };
  }, [onAuthSuccess, onAuthError, onEmbeddedSignupEvent]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Check if we're on HTTP (Facebook requires HTTPS)
    if (typeof window !== "undefined" && window.location.protocol === "http:") {
      // Don't load SDK on HTTP at all
      console.warn("Facebook SDK requires HTTPS. WhatsApp Embedded Signup will not work on HTTP.");
      return;
    }

    // Session info listener for Embedded Signup events (can come from www.facebook.com or business.facebook.com)
    const sessionInfoListener = (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP" && callbacksRef.current.onEmbeddedSignupEvent) {
          callbacksRef.current.onEmbeddedSignupEvent(data.data);
        }
      } catch {
        // Not a JSON message, ignore
      }
    };
    window.addEventListener("message", sessionInfoListener);

    // Initialize Facebook SDK (match Meta Embedded Signup implementation doc)
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        autoLogAppEvents: true,
        version: "v22.0",
      });

      // Wait a bit to ensure SDK is fully initialized
      setTimeout(() => {
        setSdkReady(true);
      }, 100);
    };

    // Load SDK script if not already loaded
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onerror = () => {
        callbacksRef.current.onAuthError("Failed to load Facebook SDK");
      };
      document.body.appendChild(script);
    } else if (window.FB) {
      // SDK already loaded
      setSdkReady(true);
    }

    return () => {
      window.removeEventListener("message", sessionInfoListener);
    };
  }, [appId]);

  const launchEmbeddedSignup = useCallback(() => {
    // Check if on localhost HTTP
    if (typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname === "localhost") {
      callbacksRef.current.onAuthError("Facebook login requires HTTPS. For local development, use a tunnel service like ngrok or configure HTTPS.");
      return;
    }

    // Triple check SDK is ready
    if (!window.FB) {
      callbacksRef.current.onAuthError("Facebook SDK not loaded. Please refresh the page.");
      return;
    }

    if (!sdkReady) {
      callbacksRef.current.onAuthError("Facebook SDK not ready. Please wait a moment and try again.");
      return;
    }

    if (typeof window.FB.login !== "function") {
      callbacksRef.current.onAuthError("Facebook SDK not properly initialized. Please refresh the page.");
      return;
    }

    // Match Meta doc: config_id, response_type: "code", override_default_response_type: true, extras: { setup: {} }
    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          callbacksRef.current.onAuthSuccess(response.authResponse.code);
        } else {
          // User cancelled or error
          const status = response.status;
          if (status === "not_authorized" || status === "unknown") {
            // User cancelled - don't show error
            callbacksRef.current.onAuthError("cancelled");
          } else {
            callbacksRef.current.onAuthError(status || "Login failed");
          }
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: solutionId ? { solutionID: solutionId } : {},
        },
      }
    );
  }, [configId, solutionId, sdkReady]);

  return { launchEmbeddedSignup, sdkReady };
}
