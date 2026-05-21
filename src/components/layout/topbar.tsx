import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Bell, Search, ChevronDown, User, Settings, LogOut, ShieldCheck, DollarSign, FileText, Building2, Calendar, CheckSquare, Users, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { useEvents } from "@/context/events-context";
import { useTasks } from "@/context/tasks-context";
import { useMembers } from "@/context/members-context";
import { useFinance } from "@/context/finance-context";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRole, type Role } from "@/context/role-context";
import { useAuth } from "@/context/auth-context";

interface NotificationPrefs {
  emailDigest: boolean
  taskAssigned: boolean
  eventReminder: boolean
  financeAlerts: boolean
  memberJoined: boolean
}

const NOTIFICATION_PREFS_STORAGE_KEY = "clubrm-notification-prefs";
const RECENT_SEARCHES_STORAGE_KEY = "recentSearches";
const READ_NOTIFICATIONS_STORAGE_KEY = "readNotifs";
const MIN_SEARCH_QUERY_LENGTH = 2;
const MAX_RECENT_SEARCHES = 5;
const SEARCH_RESULT_LIMITS = {
  events: 3,
  tasks: 3,
  members: 3,
  expenses: 2,
  reimbursements: 2,
  income: 2,
  documents: 3,
  sponsors: 3,
} as const;
const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailDigest: true,
  taskAssigned: true,
  eventReminder: true,
  financeAlerts: true,
  memberJoined: false,
};

const ROLES: Role[] = [
  "President",
  "VP Internal",
  "VP Finance",
  "VP Events",
  "VP External",
  "Marketing",
  "Executive",
  "Administrator",
];

function readNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!stored) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

const SEARCH_TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  Event:    { color: "bg-pink-500/20 text-pink-400",    icon: <Calendar   className="h-3 w-3" /> },
  Task:     { color: "bg-amber-500/20 text-amber-400",  icon: <CheckSquare className="h-3 w-3" /> },
  Member:   { color: "bg-primary/20 text-primary",      icon: <Users      className="h-3 w-3" /> },
  Finance:  { color: "bg-emerald-500/20 text-emerald-400", icon: <DollarSign className="h-3 w-3" /> },
  Document: { color: "bg-violet-500/20 text-violet-400", icon: <FileText   className="h-3 w-3" /> },
  Sponsor:  { color: "bg-sky-500/20 text-sky-400",      icon: <Building2   className="h-3 w-3" /> },
};

type SearchResult = { type: string; label: string; sub: string; route: string };

function appendSearchMatches<T>(
  results: SearchResult[],
  items: T[],
  predicate: (item: T) => boolean,
  limit: number,
  mapper: (item: T) => SearchResult,
) {
  items.filter(predicate).slice(0, limit).forEach((item) => results.push(mapper(item)));
}

export function TopBar() {
  const { role, setRole } = useRole();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { events } = useEvents();
  const { tasks } = useTasks();
  const { members } = useMembers();
  const { expenses, reimbursements, income } = useFinance();
  
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() => readNotificationPrefs());
  const [searchSponsors, setSearchSponsors] = useState<{ id: string; company: string; industry: string; tier: string }[]>([]);
  const [searchDocs, setSearchDocs] = useState<{ id: string; name: string; category: string; tags: string[] }[]>([]);

  useEffect(() => {
    const syncPrefs = () => setNotificationPrefs(readNotificationPrefs());
    window.addEventListener("storage", syncPrefs);
    window.addEventListener("clubrm-settings-updated", syncPrefs as EventListener);
    return () => {
      window.removeEventListener("storage", syncPrefs);
      window.removeEventListener("clubrm-settings-updated", syncPrefs as EventListener);
    };
  }, []);

  useEffect(() => {
    const db = supabase as any;
    Promise.all([
      supabase.from("sponsors").select("id, company, industry, tier"),
      db.from("documents").select("id, name, category, tags"),
    ]).then(([sponsorsRes, docsRes]: [any, any]) => {
      if (sponsorsRes.data) setSearchSponsors(sponsorsRes.data);
      if (docsRes.data) setSearchDocs(docsRes.data);
    });
  }, []);

  const notifications = useMemo(() => {
    const items: { id: string; title: string; sub: string; time: string; route: string; read: boolean }[] = [];
    const now = new Date();
    const currentMember = user?.email
      ? members.find((member) => member.email.toLowerCase() === user.email?.toLowerCase())
      : undefined;

    if (notificationPrefs.financeAlerts) {
      const pendingExp = expenses.filter((e) => e.status === "pending");
      if (pendingExp.length > 0) {
        items.push({ id: "n-exp", title: `${pendingExp.length} expense(s) awaiting approval`, sub: `Total: $${pendingExp.reduce((s, e) => s + e.amount, 0).toFixed(0)}`, time: "Now", route: "/finance", read: false });
      }
      const pendingReim = reimbursements.filter((r) => r.status === "pending");
      if (pendingReim.length > 0) {
        items.push({ id: "n-reim", title: `${pendingReim.length} reimbursement(s) pending`, sub: `Total: $${pendingReim.reduce((s, r) => s + r.amount, 0).toFixed(0)}`, time: "Now", route: "/finance", read: false });
      }
    }

    if (notificationPrefs.taskAssigned && currentMember) {
      const assignedTasks = tasks.filter((task) => task.assignees.includes(currentMember.id) && task.status !== "done");
      if (assignedTasks.length > 0) {
        items.push({ id: "n-task-assigned", title: `${assignedTasks.length} task(s) assigned to you`, sub: assignedTasks.slice(0, 2).map((task) => task.title).join(", "), time: "Now", route: "/tasks", read: false });
      }
    }

    if (notificationPrefs.eventReminder) {
      const upcoming = events.filter((e) => {
        const start = new Date(e.startDate);
        const diff = start.getTime() - now.getTime();
        return diff > 0 && diff < 48 * 60 * 60 * 1000;
      });
      upcoming.forEach((e) => {
        items.push({ id: `n-ev-${e.id}`, title: `Upcoming: ${e.title}`, sub: e.location || "No location", time: "Soon", route: "/events", read: false });
      });
    }

    if (notificationPrefs.memberJoined) {
      const recentMembers = members.filter((member) => {
        const joinedAt = new Date(member.joinDate);
        const diff = now.getTime() - joinedAt.getTime();
        return diff >= 0 && diff < 30 * 24 * 60 * 60 * 1000;
      });
      recentMembers.slice(0, 3).forEach((member) => {
        items.push({ id: `n-member-${member.id}`, title: `${member.name} joined the club`, sub: `${member.role} • ${member.department}`, time: "Recently", route: "/members", read: false });
      });
    }
    return items;
  }, [events, expenses, members, notificationPrefs, reimbursements, tasks, user?.email]);

  const [readNotifs, setReadNotifs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(readNotifs)));
  }, [readNotifs]);

  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !readNotifs.has(n.id)).length;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < MIN_SEARCH_QUERY_LENGTH) return [];
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    appendSearchMatches(
      results,
      events,
      (event) => event.title.toLowerCase().includes(q) || (event.location || "").toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.events,
      (event) => ({ type: "Event", label: event.title, sub: event.location || "No location", route: "/events" }),
    );

    appendSearchMatches(
      results,
      tasks,
      (task) => task.title.toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.tasks,
      (task) => ({ type: "Task", label: task.title, sub: task.status, route: "/tasks" }),
    );

    appendSearchMatches(
      results,
      members,
      (member) => member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.members,
      (member) => ({ type: "Member", label: member.name, sub: member.role, route: "/members" }),
    );

    appendSearchMatches(
      results,
      expenses,
      (expense) => expense.description.toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.expenses,
      (expense) => ({ type: "Finance", label: expense.description, sub: `Expense • $${expense.amount}`, route: "/finance" }),
    );

    appendSearchMatches(
      results,
      reimbursements,
      (reimbursement) => reimbursement.description.toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.reimbursements,
      (reimbursement) => ({ type: "Finance", label: reimbursement.description, sub: `Reimbursement • $${reimbursement.amount}`, route: "/finance" }),
    );

    appendSearchMatches(
      results,
      income,
      (entry) => entry.source.toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.income,
      (entry) => ({ type: "Finance", label: entry.source, sub: `Income • $${entry.amount}`, route: "/finance" }),
    );

    appendSearchMatches(
      results,
      searchDocs,
      (doc) => doc.name.toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.documents,
      (doc) => ({ type: "Document", label: doc.name, sub: doc.category, route: "/documents" }),
    );

    appendSearchMatches(
      results,
      searchSponsors,
      (sponsor) => sponsor.company.toLowerCase().includes(q),
      SEARCH_RESULT_LIMITS.sponsors,
      (sponsor) => ({ type: "Sponsor", label: sponsor.company, sub: sponsor.industry, route: "/external" }),
    );

    return results;
  }, [searchQuery, events, tasks, members, expenses, reimbursements, income, searchDocs, searchSponsors]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 w-full bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="flex items-center gap-2 mr-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 hover:bg-accent/50 transition-colors rounded-md py-1 outline-none">
              <span className="font-semibold text-foreground">TechClub</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Fall 2026</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Current Membership</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex justify-between items-center">
              <span>TechClub</span>
              <span className="text-[10px] uppercase font-bold text-primary">Active</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-primary font-medium">+ Join another organization</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative flex-1 max-w-xl" ref={searchContainerRef}>
        <div className="flex items-center gap-2 bg-muted/40 hover:bg-muted/60 px-3 py-1.5 rounded-md border border-border/50 focus-within:border-primary/50 transition-all group">
          <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search everything..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
          />
          {!searchQuery && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-background/50 border border-border/40 px-1.5 py-0.5 rounded pointer-events-none">
              <span className="text-[11px] leading-none">⌘</span>K
            </div>
          )}
        </div>

        {searchOpen && searchQuery.length < 2 && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium uppercase">Recent</span>
              <button onClick={clearRecentSearches} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>
            {recentSearches.map((query, i) => (
              <button key={i} className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted/50 text-left border-b border-border/20 last:border-0"
                onClick={() => { setSearchQuery(query); searchInputRef.current?.focus(); }}>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium flex-1 truncate">{query}</span>
              </button>
            ))}
          </div>
        )}

        {searchOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-xl z-50 overflow-hidden max-h-[420px] overflow-y-auto">
            {searchResults.map((r, i) => (
              <button key={i} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted/50 text-left border-b border-border/20 last:border-0"
                onClick={() => { 
                  saveRecentSearch(searchQuery);
                  navigate(`${r.route}?search=${encodeURIComponent(r.label)}`);
                  setSearchQuery(""); 
                  setSearchOpen(false); 
                }}>
                <span className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase", SEARCH_TYPE_CONFIG[r.type]?.color)}>
                  {SEARCH_TYPE_CONFIG[r.type]?.icon}{r.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">{unreadCount}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-xl">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && <button className="text-[10px] text-primary hover:underline" onClick={() => setReadNotifs(new Set(notifications.map(n => n.id)))}>Mark all read</button>}
            </div>
            <div className="max-h-80 overflow-y-auto w-full">
              {notifications.map((n) => (
                <button key={n.id} className={cn("flex flex-col items-start gap-1 w-full p-4 border-b hover:bg-muted/50 transition-colors text-left", readNotifs.has(n.id) && "opacity-60 bg-muted/20")}
                  onClick={() => { setReadNotifs(prev => new Set(prev).add(n.id)); setNotifOpen(false); navigate(n.route); }}>
                  <div className="flex items-start justify-between w-full">
                    <span className={cn("text-sm font-medium", !readNotifs.has(n.id) && "text-primary")}>{n.title}</span>
                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2">{n.sub}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-4" />

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 px-2 gap-2 hover:bg-accent/50 flex items-center rounded-md border border-border/50 outline-none">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-none gap-1">
                <span className="text-xs font-semibold">{displayName}</span>
                <span className="text-[10px] text-muted-foreground">{role}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                <span>Switch Role</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
                  {ROLES.map((r) => (
                    <DropdownMenuRadioItem key={r} value={r} className="text-xs">{r}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
