import SuperadminClient from "./SuperadminClient";
import { cookies } from "next/headers";
import { getUserBySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  const token = (await cookies()).get('session')?.value;
  const me = token ? await getUserBySessionToken(token) : null;
  const isSuper = me?.role === 'SUPERADMIN';

  if (!isSuper) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">SUPERADMIN Console</h1>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 text-sm">
          Access restricted. You must be a SUPERADMIN to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">SUPERADMIN Console</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Manage businesses, shops, and assign Admins.</p>
      <SuperadminClient />
    </div>
  );
}
