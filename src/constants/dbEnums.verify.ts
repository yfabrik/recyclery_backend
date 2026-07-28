import type Arrival from "../models/arrival.js";
import type CashSession from "../models/cashsession.js";
import type CollectionPoint from "../models/collectionpoint.js";
import type Donation from "../models/donation.js";
import type GiftCard from "../models/giftcard.js";
import type GiftCardTransaction from "../models/giftcardtransaction.js";
import type LabeledItem from "../models/labeleditem.js";
import type SalesTransaction from "../models/salestransaction.js";
import type Task from "../models/task.js";
import type TaskSchedule from "../models/taskschedule.js";
import type TransactionGlobalPromotion from "../models/transactionGlobalPromotion.js";
import type TransactionPayment from "../models/transactionpayment.js";
import type User from "../models/user.js";
import type WasteDisposal from "../models/wasteDisposal.js";
import type EmployeeVacation from "../models/employeeVacation.js";
import {
  ARRIVAL_SOURCE_TYPES,
  ARRIVAL_STATUSES,
  CASH_SESSION_STATUSES,
  COLLECTION_POINT_TYPES,
  CONDITION_STATES,
  DONATION_STATUSES,
  GIFT_CARD_STATUSES,
  GIFT_CARD_TRANSACTION_TYPES,
  LABELED_ITEM_STATUSES,
  PAYMENT_METHODS,
  PROMOTION_TYPES,
  RECURRENCE_PATTERNS,
  SALES_PAYMENT_METHODS,
  SALES_TRANSACTION_STATUSES,
  TASK_CATEGORIES,
  TRANSACTION_TYPES,
  USER_ROLES,
  VACATION_REASONS,
  WASTE_DISPOSAL_TYPES,
} from "./dbEnums.js";

void (USER_ROLES satisfies readonly User["role"][]);
void (ARRIVAL_SOURCE_TYPES satisfies readonly Arrival["source_type"][]);
void (ARRIVAL_STATUSES satisfies readonly Arrival["status"][]);
void (CASH_SESSION_STATUSES satisfies readonly CashSession["status"][]);
void (COLLECTION_POINT_TYPES satisfies readonly CollectionPoint["type"][]);
void (DONATION_STATUSES satisfies readonly Donation["status"][]);
void (GIFT_CARD_STATUSES satisfies readonly GiftCard["status"][]);
void (
  GIFT_CARD_TRANSACTION_TYPES satisfies readonly GiftCardTransaction["type"][]
);
void (CONDITION_STATES satisfies readonly LabeledItem["condition_state"][]);
void (LABELED_ITEM_STATUSES satisfies readonly LabeledItem["status"][]);
void (PAYMENT_METHODS satisfies readonly TransactionPayment["method"][]);
void (
  SALES_PAYMENT_METHODS satisfies readonly SalesTransaction["payment_method"][]
);
void (TRANSACTION_TYPES satisfies readonly SalesTransaction["transactionType"][]);
void (
  SALES_TRANSACTION_STATUSES satisfies readonly SalesTransaction["status"][]
);
void (PROMOTION_TYPES satisfies readonly TransactionGlobalPromotion["type"][]);
void (TASK_CATEGORIES satisfies readonly Task["category"][]);
void (
  RECURRENCE_PATTERNS satisfies readonly NonNullable<
    TaskSchedule["recurrence_pattern"]
  >[]
);
void (WASTE_DISPOSAL_TYPES satisfies readonly WasteDisposal["disposal_type"][]);
void (VACATION_REASONS satisfies readonly EmployeeVacation["reason"][]);
