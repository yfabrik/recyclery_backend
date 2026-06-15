export const USER_ROLES = ["admin", "manager", "employee"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ARRIVAL_SOURCE_TYPES = [
  "point",
  "apport",
  "house_clearance",
] as const;
export type ArrivalSourceType = (typeof ARRIVAL_SOURCE_TYPES)[number];

export const ARRIVAL_STATUSES = ["received"] as const;
export type ArrivalStatus = (typeof ARRIVAL_STATUSES)[number];

export const CASH_SESSION_STATUSES = ["open", "close"] as const;
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number];

export const COLLECTION_POINT_TYPES = [
  "standard",
  "entreprise",
  "association",
  "school",
  "hospital",
  "other",
] as const;
export type CollectionPointType = (typeof COLLECTION_POINT_TYPES)[number];

export const DONATION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const GIFT_CARD_STATUSES = [
  "active",
  "partially_used",
  "redeemed",
  "expired",
  "cancelled",
] as const;
export type GiftCardStatus = (typeof GIFT_CARD_STATUSES)[number];

export const GIFT_CARD_TRANSACTION_TYPES = [
  "issue",
  "charge",
  "refund_recredit",
  "manual_adjustment",
  "expire",
] as const;
export type GiftCardTransactionType =
  (typeof GIFT_CARD_TRANSACTION_TYPES)[number];

export const CONDITION_STATES = [
  "excellent",
  "good",
  "fair",
  "poor",
] as const;
export type ConditionState = (typeof CONDITION_STATES)[number];

export const LABELED_ITEM_STATUSES = ["available", "sold"] as const;
export type LabeledItemStatus = (typeof LABELED_ITEM_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "check",
  "giftcard",
  "transfer",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SALES_PAYMENT_METHODS = [
  "cash",
  "card",
  "check",
  "giftcard",
  "mixed",
  "transfer",
] as const;
export type SalesPaymentMethod = (typeof SALES_PAYMENT_METHODS)[number];

export const TRANSACTION_TYPES = ["sell", "refund"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const SALES_TRANSACTION_STATUSES = [
  "pending",
  "completed",
  "cancelled",
] as const;
export type SalesTransactionStatus =
  (typeof SALES_TRANSACTION_STATUSES)[number];

export const PROMOTION_TYPES = ["percent", "fixed"] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const TASK_CATEGORIES = [
  "vente",
  "point",
  "collection",
  "custom",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const RECURRENCE_PATTERNS = [
  "daily",
  "weekly",
  "monthly",
] as const;
export type RecurrencePattern = (typeof RECURRENCE_PATTERNS)[number];

export const WASTE_DISPOSAL_TYPES = [
  "eco_organism",
  "landfill",
  "recycling",
  "other",
] as const;
export type WasteDisposalType = (typeof WASTE_DISPOSAL_TYPES)[number];

// Domain enums (not backed by Sequelize ENUM columns)

export const EMPLOYEE_DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type EmployeeDayOfWeek = (typeof EMPLOYEE_DAYS_OF_WEEK)[number];

export const TIME_SLOTS = ["morning", "afternoon"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const FRENCH_WEEKDAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;
export type FrenchWeekday = (typeof FRENCH_WEEKDAYS)[number];
