import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DomainError } from '../domain-error';
import { nowSql, PrismaService } from '../prisma/prisma.service';

export interface IdempotencyRecord<T> {
  status: number;
  body: T;
}

export interface StoredIdempotencyRow {
  requestHash: string;
  responseStatus: number;
  responseBody: string;
}

@Injectable()
export class HelperService {
  /**
   * 校验并标准化幂等 Key，缺少 Key 时直接拒绝请求。
   */
  requireIdempotencyKey(key?: string): string {
    if (!key || !key.trim()) {
      throw new DomainError('Idempotency-Key header is required', 400);
    }
    return key.trim();
  }

  /**
   * 为请求体生成稳定哈希，用于判断同一个幂等 Key 是否对应同一份请求。
   */
  requestHash(payload: unknown): string {
    // 先对请求体按 key 排序，再计算哈希，避免字段顺序不同导致幂等判断误判。
    return createHash('sha256')
      .update(JSON.stringify(sortValue(payload)))
      .digest('hex');
  }

  /**
   * 读取已保存的幂等响应；如果请求内容不一致，则按冲突处理。
   */
  parseStoredResponse<T>(
    row: StoredIdempotencyRow,
    hash: string,
  ): IdempotencyRecord<T> {
    // 同一个 Key 只能对应同一份请求内容，金额或用户变化都要返回 409。
    if (row.requestHash !== hash) {
      throw new DomainError(
        'Idempotency-Key was already used with a different request body',
        409,
      );
    }

    return {
      status: row.responseStatus,
      body: JSON.parse(row.responseBody) as T,
    };
  }

  /**
   * 查询指定作用域和 Key 是否已有幂等处理记录。
   */
  async findStoredIdempotency(
    scope: string,
    key: string,
    prisma: IdempotencyClient,
  ): Promise<StoredIdempotencyRow | undefined> {
    const record = await prisma.idempotencyKey.findUnique({
      where: { scope_key: { scope, key } },
      select: {
        requestHash: true,
        responseStatus: true,
        responseBody: true,
      },
    });

    return record ?? undefined;
  }

  /**
   * 保存幂等处理结果，后续相同请求可以直接回放该响应。
   */
  async storeIdempotency(
    scope: string,
    key: string,
    hash: string,
    status: number,
    body: unknown,
    prisma: IdempotencyClient,
  ): Promise<void> {
    await prisma.idempotencyKey.create({
      data: {
        scope,
        key,
        requestHash: hash,
        responseStatus: status,
        responseBody: JSON.stringify(body),
        createdAt: nowSql(),
      },
    });
  }
}

/**
 * 递归排序对象字段，保证 JSON 字段顺序不影响哈希结果。
 */
function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

type IdempotencyClient = Pick<PrismaService, 'idempotencyKey'>;
