import { PrismaClient, type Prisma } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL });
if (process.env.NODE_ENV !== "production") g.prisma = db;

export type Tx = Prisma.TransactionClient;
