"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { ChevronRight } from "lucide-react";

import { useBreadcrumbOverride } from "@/lib/breadcrumb-override-context";
import { useProjectContext } from "@/lib/projects/project-context";

const DASHBOARD_SEGMENT = "dashboard";

function formatLabel(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { activeProject } = useProjectContext();
  const { lastCrumbLabel } = useBreadcrumbOverride();

  if (!pathname) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "projects") {
    return (
      <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">Projects</span>
    );
  }

  if (!activeProject) {
    return (
      <span className="truncate text-sm text-gray-500 dark:text-gray-400">
        Select a project to get started
      </span>
    );
  }

  const crumbs: { label: string; href: string | null }[] = [];

  if (segments[0] === DASHBOARD_SEGMENT) {
    crumbs.push({ label: "Dashboard", href: segments.length === 1 ? null : "/dashboard" });
    for (let index = 1; index < segments.length; index += 1) {
      const segment = segments[index];
      const href = `/${[DASHBOARD_SEGMENT, ...segments.slice(1, index + 1)].join("/")}`;
      const isLast = index === segments.length - 1;
      crumbs.push({
        label: isLast && lastCrumbLabel ? lastCrumbLabel : formatLabel(segment),
        href: isLast ? null : href,
      });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
      {crumbs.map((crumb, index) => (
        <Fragment key={`${crumb.label}-${index}`}>
          {index > 0 && <ChevronRight className="size-3.5 text-gray-300 dark:text-gray-600" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-gray-900 dark:hover:text-gray-50 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate text-gray-900 dark:text-gray-50">{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
