import type { Sequelize, Transaction } from "sequelize";

/** Use an existing transaction, or open one if none was provided. */
export async function withTransaction<T>(
  sequelize: Sequelize,
  transaction: Transaction | null | undefined,
  run: (transaction: Transaction) => PromiseLike<T>,
): Promise<T> {
  if (transaction) return run(transaction);
  return sequelize.transaction(run);
}
