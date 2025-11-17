import { Model, Association, HasManyGetAssociationsMixin, BelongsToManyGetAssociationsMixin } from "sequelize";
import { Donation } from "./Donation";
import { SalesTransaction } from "./SalesTransaction";
import { CollectionSchedule } from "./CollectionSchedule";
import { CollectionReceipt } from "./CollectionReceipt";
import { LabeledItem } from "./LabeledItem";
import { Task } from "./Task";
import { Recyclery } from "./Recyclery";

export interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  contract_hours: number;
}

export interface UserInstance
  extends Model<UserAttributes>,
    UserAttributes {
  // --- hasMany ---
  getDonations: HasManyGetAssociationsMixin<Donation>;
  getSalesTransactions: HasManyGetAssociationsMixin<SalesTransaction>;
  getCollectionSchedules: HasManyGetAssociationsMixin<CollectionSchedule>;
  getCollectionReceipts: HasManyGetAssociationsMixin<CollectionReceipt>;
  getLabeledItems: HasManyGetAssociationsMixin<LabeledItem>;
  getTasks: HasManyGetAssociationsMixin<Task>;

  // --- belongsToMany ---
  getRecycleries: BelongsToManyGetAssociationsMixin<Recyclery>;

  // --- custom association signature for "managedStores" ---
  getManagedStores: HasManyGetAssociationsMixin<Recyclery>;

  static associations: {
    donations: Association<UserInstance, Donation>;
    salesTransactions: Association<UserInstance, SalesTransaction>;
    collectionSchedules: Association<UserInstance, CollectionSchedule>;
    collectionReceipts: Association<UserInstance, CollectionReceipt>;
    labeledItems: Association<UserInstance, LabeledItem>;
    tasks: Association<UserInstance, Task>;
    recycleries: Association<UserInstance, Recyclery>;
    managedStores: Association<UserInstance, Recyclery>;
  };
}

export const User: UserInstance;
