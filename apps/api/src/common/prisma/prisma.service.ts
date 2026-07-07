import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = sqliteFileUrl(
      process.env.DATABASE_URL ?? 'file:./forecasting.db',
    );
    super({
      adapter: new PrismaBetterSqlite3({ url }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.seedDefaultUsers();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async resetForTests(): Promise<void> {
    await this.idempotencyKey.deleteMany();
    await this.ledgerEntry.deleteMany();
    await this.bet.deleteMany();
    await this.user.deleteMany();
    await this.seedDefaultUsers();
  }

  private async seedDefaultUsers(): Promise<void> {
    const createdAt = nowSql();
    await Promise.all(
      [
        {
          id: 1,
          username: 'alice',
          initialBalance: 1000,
          balance: 1000,
          createdAt,
        },
        {
          id: 2,
          username: 'bob',
          initialBalance: 500,
          balance: 500,
          createdAt,
        },
        {
          id: 3,
          username: 'charlie',
          initialBalance: 0,
          balance: 0,
          createdAt,
        },
      ].map((user) =>
        this.user.upsert({
          where: { id: user.id },
          update: {},
          create: user,
        }),
      ),
    );
  }
}

export function nowSql(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function sqliteFileUrl(databaseUrl: string): string {
  if (databaseUrl.startsWith('file:')) {
    return databaseUrl;
  }

  return `file://${databaseUrl}`;
}
