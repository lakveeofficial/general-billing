import { query } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

export type Membership = {
  id: string;
  user_id: string;
  business_id: string;
  shop_id: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'STAFF' | string;
  can_delete_invoices: boolean;
  can_delete_products: boolean;
  can_manage_products: boolean;
  can_view_reports: boolean;
};

export async function getUserMemberships(userId: string): Promise<Membership[]> {
  const { rows } = await query<Membership>(
    `SELECT id, user_id, business_id, shop_id, role, 
            COALESCE(can_delete_invoices,false) AS can_delete_invoices,
            COALESCE(can_delete_products,false) AS can_delete_products,
            COALESCE(can_manage_products,true) AS can_manage_products,
            COALESCE(can_view_reports,true) AS can_view_reports
     FROM memberships WHERE user_id = $1`,
    [userId]
  );
  return rows;
}

export function isSuperadmin(user: SessionUser | null): boolean {
  return !!user && user.role === 'SUPERADMIN';
}

export function hasBusinessScope(memberships: Membership[], businessId: string): boolean {
  return memberships.some(m => m.business_id === businessId);
}

export function hasShopScope(memberships: Membership[], businessId: string, shopId?: string | null): boolean {
  if (!shopId) return hasBusinessScope(memberships, businessId);
  return memberships.some(m => m.business_id === businessId && (m.shop_id === null || m.shop_id === shopId));
}

export function firstBusinessId(memberships: Membership[]): string | null {
  return memberships[0]?.business_id ?? null;
}
