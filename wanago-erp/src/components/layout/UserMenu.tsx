"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Settings, LogOut, Palette } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/DropdownMenu";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { cn, initials } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";

function ModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
      {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "Auto"]] as const).map(([v, Icon, label]) => (
        <button
          key={v}
          onClick={(e) => { e.preventDefault(); setTheme(v); }}
          title={label}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-150",
            theme === v ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          <Icon size={13} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function UserMenu() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const name  = user?.displayName ?? "User";
  const email = user?.email ?? "";
  const ab    = initials(name) || "WA";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-full pl-2 pr-1 py-1 outline-none transition-colors hover:bg-muted lg:pl-3">
          <div className="hidden text-right md:block">
            <p className="text-[13px] font-semibold leading-tight text-foreground">{name}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{email}</p>
          </div>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white shadow-sm ring-2 ring-primary/20">
            {ab}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-3" align="end">
        <div className="flex items-center gap-3 px-1 pb-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
            {ab}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.systemRole ? SYSTEM_ROLE_LABELS[user.systemRole] : email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="space-y-3 px-1 py-2">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Appearance</p>
            <ModeToggle />
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              <Palette size={11} /> Accent Color
            </p>
            <ThemePicker />
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings size={16} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout} className="text-destructive hover:bg-destructive/10">
          <LogOut size={16} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
