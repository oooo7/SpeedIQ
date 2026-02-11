import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t bg-slate-50 dark:bg-slate-950">
            <div className="container px-4 py-8 md:px-6 md:py-12 lg:py-16">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
                    <div className="col-span-2 lg:col-span-2">
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="text-xl font-medium">SpeedIQ</span>
                        </Link>
                        <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                            Accelerate your workflow with SpeedIQ. The fastest way to manage your projects and team.
                        </p>
                    </div>
                    <div className="flex flex-col space-y-3">
                        <h4 className="text-sm font-medium">Product</h4>
                        <Link
                            href="#features"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Features
                        </Link>
                        <Link
                            href="#pricing"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="#changelog"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Changelog
                        </Link>
                    </div>
                    <div className="flex flex-col space-y-3">
                        <h4 className="text-sm font-medium">Company</h4>
                        <Link
                            href="#about"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            About
                        </Link>
                        <Link
                            href="#blog"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Blog
                        </Link>
                        <Link
                            href="#careers"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Careers
                        </Link>
                    </div>
                    <div className="flex flex-col space-y-3">
                        <h4 className="text-sm font-medium">Legal</h4>
                        <Link
                            href="#privacy"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="#terms"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Terms
                        </Link>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} SpeedIQ Inc. All rights reserved.
                    </p>
                    <div className="flex items-center space-x-4">
                        {/* Social icons can go here */}
                    </div>
                </div>
            </div>
        </footer>
    );
}
