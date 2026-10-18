import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, ShieldCheck, User as UserIcon, Waves } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/constants";
import { initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OceanBackground } from "./ocean-background";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NavGroup } from "./nav-items";

function NavList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const { isAdmin } = useAuth();

  return (
    <nav className="space-y-6" aria-label="Dashboard navigation">
      {groups.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.title}
            </p>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar className="h-8 w-8">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="" crossOrigin="anonymous" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initialsFrom(profile?.full_name ?? profile?.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{profile?.full_name ?? "Account"}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{profile?.full_name ?? "Account"}</span>
          <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
          {role ? (
            <Badge variant="outline" className="mt-1 w-fit rounded-full text-[11px]">
              {ROLE_LABELS[role]}
            </Badge>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === "customer" ? (
          <DropdownMenuItem onSelect={() => navigate("/app/profile")}>
            <UserIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            My profile
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => navigate("/manage/staff")}>
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Staff & roles
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void signOut().then(() => navigate("/"))}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Shared shell for the customer area and the staff/admin area: responsive
 * sidebar, mobile sheet navigation, notification bell and account menu.
 */
export function DashboardLayout({
  groups,
  areaLabel,
  showNotifications = false,
  notificationsPath = "/app/notifications",
}: {
  groups: NavGroup[];
  areaLabel: string;
  showNotifications?: boolean;
  notificationsPath?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-background">
      <OceanBackground textured={false} />

      <aside className="relative z-20 hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-ocean text-primary-foreground">
            <Waves className="h-4 w-4" aria-hidden="true" />
          </span>
          <Link to="/" className="font-display text-base font-extrabold tracking-tight">
            LabaFlow
          </Link>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)] px-2 py-5">
          <NavList groups={groups} />
        </ScrollArea>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetTitle className="font-display">Lab a Day</SheetTitle>
              <div className="mt-6">
                <NavList groups={groups} onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
              {areaLabel}
            </Badge>
          </div>

          {showNotifications ? <NotificationBell to={notificationsPath} /> : null}
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
