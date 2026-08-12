"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiHome, FiBox, FiUsers, FiFileText, FiSettings, FiMenu, FiX } from "react-icons/fi";
import { FaInstagram, FaYoutube, FaGlobe } from "react-icons/fa";
import { cn } from "@/lib/cn";
import Link from "next/link";

const baseNav = [
  { href: "/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/products", label: "Products", icon: FiBox },
  { href: "/customers", label: "Customers", icon: FiUsers },
  { href: "/invoices", label: "Invoices", icon: FiFileText },
  { href: "/settings", label: "Settings", icon: FiSettings },
  { href: "/settings/users", label: "Users", icon: FiUsers },
];

function SearchBar({ onSearchToggle }: { onSearchToggle: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  // Keep header search in sync with ?search= when on /products
  useEffect(() => {
    const isProducts = window.location.pathname?.startsWith("/products");
    const q = searchParams?.get("search") ?? "";
    if (isProducts) setSearchValue(q);
    else setSearchValue("");
  }, [searchParams]);

  const onSearchSubmit = useMemo(
    () => (e?: React.FormEvent | React.KeyboardEvent) => {
      if (e && "preventDefault" in e) e.preventDefault();
      const q = searchValue.trim();
      if (q) router.push(`/products?search=${encodeURIComponent(q)}`);
      else router.push(`/products`);
      onSearchToggle();
    },
    [searchValue, router, onSearchToggle]
  );

  return (
    <form onSubmit={onSearchSubmit} className="hidden sm:block relative">
      <input
        type="search"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Search products..."
        className="w-48 sm:w-56 md:w-64 lg:w-72 text-sm sm:text-base rounded-full border-2 border-zinc-700 bg-white/10 hover:bg-white/15 focus:bg-white/20 px-4 sm:px-5 py-2.5 pr-10 placeholder-zinc-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
        aria-label="Search products"
      />
      <button 
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
        aria-label="Search"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Role and memberships for role-based nav
  const [me, setMe] = useState<{ user: { role?: string } | null; memberships: any[] }>({ user: null, memberships: [] });
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        setMe({ user: j?.user || null, memberships: j?.memberships || [] });
      } catch {
        setMe({ user: null, memberships: [] });
      }
    })();
  }, []);
  const role: string | undefined = me.user?.role as any;
  const isSuper = role === 'SUPERADMIN';
  const isStaff = role === 'STAFF';
  type NavItem = { href: string; label: string; icon: any };
  const nav: NavItem[] = useMemo(() => {
    let items = [...baseNav] as NavItem[];
    if (isStaff) items = items.filter(i => i.href !== '/settings' && i.href !== '/settings/users');
    if (isSuper) items = [{ href: '/superadmin', label: 'Superadmin', icon: FiSettings }, ...items];
    return items;
  }, [isSuper, isStaff]);

  // Context selector state
  const [ctx, setCtx] = useState<{ businesses: { id: string; name: string }[]; shopsByBiz: Record<string, { id: string; name: string }[]> }>({ businesses: [], shopsByBiz: {} });
  const [ctxBiz, setCtxBiz] = useState<string>("");
  const [ctxShop, setCtxShop] = useState<string>("");
  useEffect(() => {
    (async () => {
      if (!(isSuper || !isStaff)) return; // only admin/superadmin
      try {
        const res = await fetch('/api/context/options', { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok) setCtx({ businesses: j?.data?.businesses || [], shopsByBiz: j?.data?.shopsByBiz || {} });
      } catch {}
    })();
  }, [isSuper, isStaff]);
  async function applyContext(nextBiz: string, nextShop: string) {
    try {
      await fetch('/api/context/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: nextBiz, shop_id: nextShop || null }) });
      setCtxBiz(nextBiz);
      setCtxShop(nextShop || "");
      // reload to let server components pick cookies
      window.location.reload();
    } catch {}
  }

  // Keep header search in sync with ?search= when on /products
  useEffect(() => {
    const isProducts = pathname?.startsWith("/products");
    const q = searchParams?.get("search") ?? "";
    if (isProducts) setSearchValue(q);
    else setSearchValue("");
  }, [pathname, searchParams]);

  const onSearchSubmit = useMemo(
    () => (e?: React.FormEvent | React.KeyboardEvent) => {
      if (e && "preventDefault" in e) e.preventDefault();
      const q = searchValue.trim();
      if (q) router.push(`/products?search=${encodeURIComponent(q)}`);
      else router.push(`/products`);
      setMobileOpen(false);
    },
    [searchValue, router]
  );
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/reset-password/force');
  if (isAuthPage) {
    return (
      <div className="min-h-dvh flex flex-col bg-gradient-to-br from-indigo-50 via-white to-pink-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 text-zinc-900 dark:text-zinc-100">
        <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
          {children}
        </main>
        <footer className="px-4 py-3 text-sm text-zinc-200 border-t border-indigo-900/30 bg-zinc-950/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>© LakVee Softwares Pvt. Ltd.</div>
            <div className="flex items-center gap-4">
              <a href="https://lakveesoftwares.co.in" target="_blank" rel="noreferrer" aria-label="Website" title="Website"
                 className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-indigo-300 transition-colors">
                <svg viewBox="0 0 24 24" className="text-lg h-4 w-4" fill="currentColor"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2c1.93 0 3.68.78 4.95 2.05A6.97 6.97 0 0119 12c0 1.93-.78 3.68-2.05 4.95A6.97 6.97 0 0112 19a6.97 6.97 0 01-4.95-2.05A6.97 6.97 0 015 12c0-1.93.78-3.68 2.05-4.95A6.97 6.97 0 0112 5z"/></svg>
                <span className="hidden sm:inline">lakveesoftwares.co.in</span>
              </a>
              <a href="https://instagram.com/lakveesoftwares" target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram"
                 className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-pink-400 transition-colors">
                <svg viewBox="0 0 24 24" className="text-lg h-4 w-4" fill="currentColor"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm13 5a1 1 0 110-2 1 1 0 010 2zM12 8a4 4 0 110 8 4 4 0 010-8z"/></svg>
                <span className="hidden sm:inline">@lakveesoftwares</span>
              </a>
              <a href="https://youtube.com/@lakveesoftwares" target="_blank" rel="noreferrer" aria-label="YouTube" title="YouTube"
                 className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                <svg viewBox="0 0 24 24" className="text-lg h-4 w-4" fill="currentColor"><path d="M23.5 6.2s-.2-1.6-.8-2.3c-.8-.8-1.7-.8-2.1-.9C17.6 2.6 12 2.6 12 2.6h0s-5.6 0-8.6.4c-.4 0-1.3.1-2.1.9C.7 4.6.5 6.2.5 6.2S0 8.1 0 10v1.9c0 1.9.5 3.8.5 3.8s.2 1.6.8 2.3c.8.8 1.8.8 2.2.9 1.6.2 6.5.4 8.5.4h0c0 0 5.6 0 8.6-.4.4 0 1.3-.1 2.1-.9.6-.7.8-2.3.8-2.3S24 13.9 24 12V10c0-1.9-.5-3.8-.5-3.8zM9.6 14.8V7.9l6.2 3.4-6.2 3.5z"/></svg>
                <span className="hidden sm:inline">@lakveesoftwares</span>
              </a>
            </div>
            <div className="text-zinc-400">v0.1 • Next.js 15 • React 19 RC</div>
          </div>
        </footer>
      </div>
    );
  }
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-indigo-50 via-white to-pink-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-indigo-900/30 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md shadow-sm">
        <div className="px-4 py-4 sm:py-5 grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
          {/* Brand (left) */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="sm:hidden inline-flex items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 p-2.5 mr-1.5"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <FiX /> : <FiMenu />}
            </button>
            <img
              src="/logo.png"
              alt="Logo"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg object-contain bg-white p-1 shadow ring-1 ring-black/10"
            />
            <div className="hidden sm:block">
              <div className="font-semibold text-lg leading-5 bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">General Billing</div>
              <div className="text-xs text-zinc-500 leading-4">Medical & General Stores</div>
            </div>
          </div>
          {/* Nav (center) */}
          <nav className="hidden sm:flex items-center gap-1 overflow-x-auto justify-center">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-3 rounded-md text-base whitespace-nowrap transition-colors",
                    "text-zinc-200 hover:text-white hover:bg-indigo-900/60",
                    active 
                      ? "bg-indigo-600 text-white font-medium shadow-md" 
                      : "font-normal"
                  )}
                  prefetch={false}
                >
                  <Icon className="shrink-0 text-lg" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {/* Actions (right) */}
          <div className="flex items-center gap-2 justify-end">
            <Suspense fallback={<div className="w-48 h-10 bg-zinc-800/50 rounded-full animate-pulse"></div>}>
              <SearchBar onSearchToggle={() => setMobileOpen(false)} />
            </Suspense>
            <div className="hidden md:flex items-center gap-2">
              <div className="h-6 w-0.5 bg-indigo-600/50"></div>
              <div className="text-xs sm:text-sm text-zinc-300">{role ? `Role: ${role}` : 'Not signed in'}</div>
            </div>
            <button
              onClick={async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {} finally { window.location.href = '/login'; } }}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 px-3 py-2 text-sm shadow hover:bg-white"
            >
              Logout
            </button>
          </div>
        </div>
        {/* Mobile nav & search */}
        {mobileOpen && (
          <div className="px-4 pb-3 sm:hidden border-t border-black/5 dark:border-white/10">
            <form onSubmit={onSearchSubmit} className="py-3">
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search products..."
                className="w-full text-base rounded-md border border-zinc-300 bg-white px-3.5 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
              />
            </form>
            <nav className="grid gap-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-3 rounded-md text-base",
                      "hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40",
                      active && "bg-indigo-600 text-white hover:bg-indigo-600"
                    )}
                  >
                    <Icon className="shrink-0 text-lg" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {} finally { window.location.href = '/login'; } }}
                className="mt-2 flex items-center gap-2 px-3.5 py-3 rounded-md text-base hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40"
              >
                Logout
              </button>
            </nav>
          </div>
        )}
      </header>
      <main className="p-4 lg:p-6 w-full grow">
        {children}
      </main>
      <footer className="px-4 py-3 text-sm text-zinc-200 border-t border-indigo-900/30 bg-zinc-950/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>© LakVee Softwares Pvt. Ltd.</div>
          <div className="flex items-center gap-4">
            <a href="https://lakveesoftwares.co.in" target="_blank" rel="noreferrer" aria-label="Website" title="Website"
               className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-indigo-300 transition-colors">
              <FaGlobe className="text-lg" />
              <span className="hidden sm:inline">lakveesoftwares.co.in</span>
            </a>
            <a href="https://instagram.com/lakveesoftwares" target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram"
               className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-pink-400 transition-colors">
              <FaInstagram className="text-lg" />
              <span className="hidden sm:inline">@lakveesoftwares</span>
            </a>
            <a href="https://youtube.com/@lakveesoftwares" target="_blank" rel="noreferrer" aria-label="YouTube" title="YouTube"
               className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-red-500 transition-colors">
              <FaYoutube className="text-lg" />
              <span className="hidden sm:inline">@lakveesoftwares</span>
            </a>
          </div>
          <div className="text-zinc-400">v0.1 • Next.js 15 • React 19 RC</div>
        </div>
      </footer>
    </div>
  );
}
