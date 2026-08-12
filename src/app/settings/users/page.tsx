import { query } from "@/lib/db";
import { cookies } from "next/headers";
import { getUserBySessionToken } from "@/lib/auth";
import { getUserMemberships, isSuperadmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // Restrict to ADMIN or SUPERADMIN
  const token = (await cookies()).get('session')?.value;
  const me = token ? await getUserBySessionToken(token) : null;
  const allowed = me && (me.role === 'ADMIN' || me.role === 'SUPERADMIN');
  if (!allowed) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Staff Management</h1>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 text-sm">
          Access restricted. Only Admins can manage staff.
        </div>
      </div>
    );
  }
  // Determine business by scope:
  // - SUPERADMIN: default to first-created business
  // - ADMIN: use the first business from their memberships
  let business: { id: string; name: string } | null = null;
  let bizId: string | null = null;
  if (me && isSuperadmin(me)) {
    const { rows: businesses } = await query<{ id: string; name: string }>(
      `SELECT id, name FROM businesses ORDER BY created_at ASC LIMIT 1`
    );
    business = businesses[0] || null;
    bizId = business?.id || null;
  } else if (me) {
    const memberships = await getUserMemberships(me.id);
    const firstBizId = memberships[0]?.business_id || null;
    bizId = firstBizId;
    if (bizId) {
      const { rows } = await query<{ id: string; name: string }>(`SELECT id, name FROM businesses WHERE id = $1`, [bizId]);
      business = rows[0] || null;
    }
  }
  const { rows: shops } = bizId
    ? await query<{ id: string; name: string }>(
        `SELECT id, name FROM shops WHERE business_id = $1 ORDER BY created_at ASC`,
        [bizId]
      )
    : { rows: [] as { id: string; name: string }[] };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Staff Management</h1>
      {!bizId ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
          No business found. Create a business first.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <CreateStaffForm businessId={bizId} businessName={business?.name || "Business"} shops={shops} />
          <StaffList businessId={bizId} />
        </div>
      )}
    </div>
  );
}

function CreateStaffForm({ businessId, businessName, shops }: { businessId: string; businessName: string; shops: { id: string; name: string }[] }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50">
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 font-medium">Create Staff for {businessName}</div>
      <CreateStaffClient businessId={businessId} shops={shops} />
    </div>
  );
}
import CreateStaffClient from "./CreateStaffClient";
import StaffListClient from "./StaffListClient";

function StaffList({ businessId }: { businessId: string }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50">
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 font-medium">Existing Staff</div>
      <StaffListClient businessId={businessId} />
    </div>
  );
}
