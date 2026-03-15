import { createClient } from "@/lib/supabase/server";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

export async function DashboardHeader() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url")
    .eq("id", user?.id ?? "")
    .single();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "")
    .eq("is_read", false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden w-10" />
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <Link href="/dashboard/alerts">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="text-xs">
            {getInitials(profile?.full_name || user?.email || "U")}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
