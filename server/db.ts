import { PrismaClient, Prisma } from "@prisma/client";
export const db = new PrismaClient();
export type Transaction = Prisma.TransactionClient;
// Tous les appareils d'un foyer prennent le même verrou transactionnel.
export async function familyWrite<T>(work: (tx: Transaction) => Promise<T>) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(104205)`;
      return work(tx);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
