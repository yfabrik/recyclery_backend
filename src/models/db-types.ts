import {
  type ModelStatic,
  type Sequelize
} from "sequelize";
import type Arrival from "./arrival.js";
import type CashRegister from "./cashregister.ts";
import type CashSession from "./cashsession.ts";
import type Category from "./category.ts";
import type CollectionPoint from "./collectionpoint.ts";
import type Donation from "./donation.js";
import type EcoOrganism from "./ecoorganism.js";
import type Employee from "./employee.js";
import type EmployeeStore from "./employeestore.js";
import type EmployeeWorkdays from "./employeeworkdays.js";
import type GiftCard from "./giftcard.js";
import type GiftCardTransaction from "./giftcardtransaction.js";
import type LabeledItem from "./labeleditem.js";
import type Promotion from "./promotion.js";
import type Recyclery from "./recyclery.js";
import type Role from "./role.js";
import type SalesTransaction from "./salestransaction.ts";
import type Skill from "./skill.js";
import type Task from "./task.js";
import type TaskSchedule from "./taskschedule.js";
import type TransactionItem from "./transactionitem.js";
import type TransactionPayment from "./transactionpayment.js";
import type User from "./user.js";
import type WasteDisposal from "./wasteDisposal.js";

export type Models = {
  Arrival: Arrival;
  CashRegister: CashRegister;
  CashSession: CashSession;
  Category: Category;
  CollectionPoint: CollectionPoint;
  Donation: Donation;
  EcoOrganism: EcoOrganism;
  Employee: Employee;
  EmployeeStore: EmployeeStore;
  EmployeeWorkdays: EmployeeWorkdays;
  GiftCard: GiftCard;
  GiftCardTransaction: GiftCardTransaction;
  LabeledItem: LabeledItem;
  Recyclery: Recyclery;
  Role: Role;
  Promotion: Promotion;
  TransactionPayment: TransactionPayment;
  TransactionItem: TransactionItem;
  SalesTransaction: SalesTransaction;
  Task: Task;
  TaskSchedule: TaskSchedule;
  User: User;
  WasteDisposal: WasteDisposal;
  Skill: Skill;
};

export type ModelStatics = {
  [P in keyof Models]: ModelClass<P>;
};

export type ModelName = keyof Models;

export type ModelClass<K extends ModelName = ModelName> = ModelStatic<
  Models[K]
> & {
  initModel: (s: Sequelize) => ModelStatic<Models[K]>;
  associate: (m: ModelStatics) => void;
  // class name, e.g. "Arrival"
  name: K;
};
export type ModelModule<K extends ModelName = ModelName> = {
  default: ModelClass<K>;
};

export type m = Models[keyof Models];

// export type Models = Record<ModelNames, Model<any, any;
export type DB = ModelStatics & {
  sequelize: Sequelize;
  Sequelize: typeof import("sequelize");
};


// export type WWW<M extends ModelClass<M>> = WhereOptions<Attributes<InstanceType<M>>>

// const a :WWW<Arrival>