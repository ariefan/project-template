import { db } from "@workspace/db";
import {
  type CouponRow,
  type CouponType,
  coupons,
  type NewCouponRow,
} from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListCouponsOptions {
  page?: number;
  pageSize?: number;
  type?: CouponType;
  isActive?: boolean;
  code?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ListCouponsResult {
  data: CouponRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Create a new coupon
 */
export async function createCoupon(data: NewCouponRow): Promise<CouponRow> {
  const [coupon] = await db.insert(coupons).values(data).returning();
  if (!coupon) {
    throw new Error("Failed to create coupon");
  }
  return coupon;
}

/**
 * Get a coupon by ID
 */
export async function getCouponById(
  couponId: string
): Promise<CouponRow | null> {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, couponId))
    .limit(1);

  return coupon ?? null;
}

/**
 * Get a coupon by code
 */
export async function getCouponByCode(code: string): Promise<CouponRow | null> {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.toUpperCase()))
    .limit(1);

  return coupon ?? null;
}

/**
 * List coupons with pagination and filtering
 */
export async function listCoupons(
  options: ListCouponsOptions = {}
): Promise<ListCouponsResult> {
  const {
    page = 1,
    pageSize = 50,
    type,
    isActive,
    code,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  // Build where conditions
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [];

  if (type) {
    conditions.push(eq(coupons.type, type));
  }
  if (isActive !== undefined) {
    conditions.push(eq(coupons.isActive, isActive));
  }
  if (code) {
    conditions.push(
      sql`UPPER(${coupons.code}) LIKE ${`%${code.toUpperCase()}%`}`
    );
  }

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coupons)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalCount = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (page - 1) * pageSize;

  // Determine sort column
  const sortColumn = sortBy === "code" ? coupons.code : coupons.createdAt;

  // Fetch data
  const data = await db
    .select()
    .from(coupons)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sortOrder === "desc" ? desc(sortColumn) : sortColumn)
    .limit(pageSize)
    .offset(offset);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Update a coupon
 */
export async function updateCoupon(
  couponId: string,
  updates: Partial<NewCouponRow>
): Promise<CouponRow | null> {
  const [coupon] = await db
    .update(coupons)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(coupons.id, couponId))
    .returning();

  return coupon ?? null;
}

/**
 * Delete a coupon (soft delete by deactivating)
 */
export async function deleteCoupon(
  couponId: string
): Promise<CouponRow | null> {
  const [coupon] = await db
    .update(coupons)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(coupons.id, couponId))
    .returning();

  return coupon ?? null;
}

/**
 * Increment coupon redemption count
 */
export async function incrementCouponRedemptions(
  couponId: string
): Promise<CouponRow | null> {
  const [coupon] = await db
    .update(coupons)
    .set({
      currentRedemptions: sql`${coupons.currentRedemptions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(coupons.id, couponId))
    .returning();

  return coupon ?? null;
}

/**
 * Check if coupon is valid (active, not expired, under redemption limit)
 */
export async function isValidCoupon(
  code: string,
  planId: string
): Promise<{ valid: boolean; coupon?: CouponRow; reason?: string }> {
  const coupon = await getCouponByCode(code);

  if (!coupon) {
    return { valid: false, reason: "Coupon not found" };
  }

  if (!coupon.isActive) {
    return { valid: false, reason: "Coupon is inactive" };
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, reason: "Coupon is not yet valid" };
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, reason: "Coupon has expired" };
  }

  if (
    coupon.maxRedemptions &&
    coupon.currentRedemptions !== null &&
    coupon.currentRedemptions >= coupon.maxRedemptions
  ) {
    return { valid: false, reason: "Coupon redemption limit reached" };
  }

  if (coupon.planIds) {
    const allowedPlanIds = coupon.planIds.split(",");
    if (!allowedPlanIds.includes(planId)) {
      return { valid: false, reason: "Coupon not valid for this plan" };
    }
  }

  return { valid: true, coupon };
}
