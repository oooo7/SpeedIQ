"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavGroup, type NavMainItem } from "@/navigation/sidebar-items";

const SIDEBAR_OPEN_STORAGE_KEY = "speediq-sidebar-nav-open";

const DEFAULT_OPEN_SECTIONS: Record<string, boolean> = {
  "WhatsApp Marketing": true,
  "Email Marketing": true,
  Contacts: true,
};

function getStoredOpenState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_OPEN_SECTIONS, ...stored };
  } catch {
    return { ...DEFAULT_OPEN_SECTIONS };
  }
}

function setStoredOpenState(state: Record<string, boolean>) {
  try {
    window.localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

interface NavMainProps {
  readonly items: readonly NavGroup[];
  readonly isProjectSelected: boolean;
}

const IsComingSoon = () => (
  <span className="ml-auto bg-gray-200 dark:bg-gray-800 px-2 py-1 text-xs">Soon</span>
);

const NavItemExpanded = ({
  item,
  isActive,
  open,
  onOpenChange,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <Collapsible
      key={item.title}
      asChild
      open={open}
      onOpenChange={onOpenChange}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {item.subItems ? (
            <SidebarMenuButton
              disabled={item.comingSoon}
              isActive={isActive(item.url, item.subItems)}
              tooltip={item.title}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              {item.comingSoon && <IsComingSoon />}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              aria-disabled={item.comingSoon}
              isActive={isActive(item.url)}
              tooltip={item.title}
            >
              <Link href={item.url} target={item.newTab ? "_blank" : undefined}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
                {item.comingSoon && <IsComingSoon />}
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton aria-disabled={subItem.comingSoon} isActive={isActive(subItem.url)} asChild>
                    <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                      {subItem.icon && <subItem.icon />}
                      <span>{subItem.title}</span>
                      {subItem.comingSoon && <IsComingSoon />}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
}) => {
  return (
    <SidebarMenuItem key={item.title}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            disabled={item.comingSoon}
            tooltip={item.title}
            isActive={isActive(item.url, item.subItems)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <ChevronRight />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-50 space-y-1" side="right" align="start">
          {item.subItems?.map((subItem) => (
            <DropdownMenuItem key={subItem.title} asChild>
              <SidebarMenuSubButton
                key={subItem.title}
                asChild
                className="focus-visible:ring-0"
                aria-disabled={subItem.comingSoon}
                isActive={isActive(subItem.url)}
              >
                <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                  {subItem.icon && <subItem.icon className="text-gray-900 dark:text-gray-50" />}
                  <span>{subItem.title}</span>
                  {subItem.comingSoon && <IsComingSoon />}
                </Link>
              </SidebarMenuSubButton>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items, isProjectSelected }: NavMainProps) {
  const path = usePathname();
  const { state, isMobile } = useSidebar();

  const [openState, setOpenState] = useState<Record<string, boolean>>(() => getStoredOpenState());

  const isItemActive = useCallback(
    (url: string, subItems?: NavMainItem["subItems"]) => {
      if (subItems?.length) {
        return subItems.some((sub) => path.startsWith(sub.url));
      }
      return path === url;
    },
    [path]
  );

  const handleOpenChange = useCallback((itemTitle: string, open: boolean) => {
    setOpenState((prev) => {
      const next = { ...prev, [itemTitle]: open };
      setStoredOpenState(next);
      return next;
    });
  }, []);

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items
                .filter((item) => (item.requiresProject ? isProjectSelected : true))
                .map((item) => {
                if (state === "collapsed" && !isMobile) {
                  if (!item.subItems) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          aria-disabled={item.comingSoon}
                          tooltip={item.title}
                          isActive={isItemActive(item.url)}
                        >
                          <Link href={item.url} target={item.newTab ? "_blank" : undefined}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  return <NavItemCollapsed key={item.title} item={item} isActive={isItemActive} />;
                }
                return (
                  <NavItemExpanded
                    key={item.title}
                    item={item}
                    isActive={isItemActive}
                    open={item.subItems ? (openState[item.title] ?? false) : false}
                    onOpenChange={item.subItems ? (open) => handleOpenChange(item.title, open) : () => {}}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
