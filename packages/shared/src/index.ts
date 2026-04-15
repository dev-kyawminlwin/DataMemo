/** Cross-app enums and types for DataMemo (API + web). */

export const ASSET_TYPES = ["data", "runner", "test"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const FACEBOOK_CATEGORIES = [
  "profile",
  "bm",
  "page",
  "ads_account",
] as const;
export type FacebookCategory = (typeof FACEBOOK_CATEGORIES)[number];

export const TIKTOK_CATEGORIES = ["profile", "bc", "ads_account"] as const;
export type TikTokCategory = (typeof TIKTOK_CATEGORIES)[number];

export const ASSET_STATUSES = [
  "active",
  "disabled",
  "restricted",
  "dead",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const USER_ROLES = [
  "super_admin",
  "admin",
  "finance",
  "staff",
] as const;
export type UserRole = (typeof USER_ROLES)[number];
