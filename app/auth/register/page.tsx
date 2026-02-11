import Link from "next/link";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { RegisterForm } from "@/components/auth/register-form";
import { GoogleButton } from "@/components/auth/social-auth/google-button";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterV2() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[380px] px-4">
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-medium">Create your account</h1>
              <p className="text-muted-foreground text-sm">Please enter your details to register.</p>
            </div>
            <div className="space-y-4">
              <GoogleButton className="w-full" />
              <div className="after:border-gray-100 dark:after:border-gray-800/80 relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-white dark:bg-gray-900 text-muted-foreground relative z-10 px-2">Or continue with</span>
              </div>
              <RegisterForm />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link className="text-gray-900 dark:text-gray-50" href="login">
            Login
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm text-muted-foreground">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Globe className="size-4" />
          ENG
        </div>
      </div>
    </>
  );
}
