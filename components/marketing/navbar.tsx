import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function Navbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <span className="font-medium sm:inline-block">SpeedIQ</span>
                </Link>
                <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
                    <Link
                        href="#features"
                        className="transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        Features
                    </Link>
                    <Link
                        href="#pricing"
                        className="transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        Pricing
                    </Link>
                    <Link
                        href="#about"
                        className="transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        About
                    </Link>
                </nav>
                <div className="flex items-center space-x-4">
                    {user ? (
                        <Button asChild variant="default" size="sm">
                            <Link href="/dashboard">Dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/auth/login">Log in</Link>
                            </Button>
                            <Button asChild variant="default" size="sm">
                                <Link href="/auth/register">Get Started</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
