# Forecasting Platform

简化版预测平台，采用 pnpm workspace 组织，包含后端 API 接口和前端工作台

## 技术栈

- Monorepo: pnpm workspace
- Backend: NestJS + TypeScript + Prisma
- Frontend: Next.js + React
- Database: SQLite
- Tests: Jest + Supertest

## 运行步骤

安装依赖：

```bash
pnpm install
```

生成 Prisma Client：

```bash
pnpm --filter @forecasting/api prisma:generate
```

初始化或更新 SQLite 表结构：

```bash
DATABASE_URL="file:./forecasting.db" pnpm --filter @forecasting/api prisma:migrate
```

分别启动后端和前端：

```bash
pnpm run start:api
pnpm run start:web
```

`pnpm run start:api` 会先执行 Prisma migration，再启动 Nest API。

这两个命令需要在项目根目录执行。如果当前目录在 `apps/web` 或 `apps/api` 下，根目录脚本不会被读取。

也可以直接指定 workspace 启动：

```bash
pnpm --filter @forecasting/api start:dev
pnpm --filter @forecasting/web dev
```

默认访问地址：

- API: `http://localhost:3000/api`
- Web: `http://localhost:3001`

## 常见问题

如果 TypeScript 或测试报类似下面的错误：

```text
Cannot find module '@nestjs/common' or its corresponding type declarations
Cannot find module 'class-validator' or its corresponding type declarations
```

通常不是代码 import 写错，而是 `node_modules` 没安装完整。比如依赖安装、测试或构建过程中被中断，pnpm 可能会留下半安装状态。

先重新安装依赖：

```bash
pnpm install
```



恢复依赖后再运行类型检查、测试或启动命令。

如果 API 启动时报：

```text
The table `main.users` does not exist in the current database
```

说明当前 SQLite 数据库还没有建表。先执行：

```bash
DATABASE_URL="file:./forecasting.db" pnpm --filter @forecasting/api prisma:migrate
```

然后再启动 API。根目录的 `pnpm run start:api` 已经包含这一步。


## 测试命令

运行 API 单元测试：

```bash
pnpm --filter @forecasting/api test:ci
```

运行 API e2e 测试：

```bash
pnpm --filter @forecasting/api test:e2e
```

类型检查：

```bash
pnpm --filter @forecasting/api typecheck
```

构建后端：

```bash
pnpm --filter @forecasting/api build
```

运行覆盖率：

```bash
pnpm test:cov
```


## 预置数据

应用启动时会通过 Prisma 写入默认用户；测试会先按迁移 SQL 建表，再通过 Prisma 重置数据。

| id | username | initial balance |
| --- | --- | --- |
| 1 | alice | 1000 |
| 2 | bob | 500 |
| 3 | charlie | 0 |

## API 说明

所有接口默认带 `/api` 前缀。

### 健康检查

```http
GET /api
```

返回应用基础文本响应。

### 查询用户

```http
GET /api/users
```

响应示例：

```json
[
  {
    "id": 1,
    "username": "alice",
    "balance": 1000,
    "initialBalance": 1000,
    "createdAt": "2026-01-01 00:00:00"
  }
]
```

### 充值

```http
POST /api/users/:id/deposit
Idempotency-Key: deposit-001
Content-Type: application/json
```

请求体：

```json
{ "amount": 100 }
```

响应示例：

```json
{
  "userId": 1,
  "balance": 1100,
  "ledgerEntryId": 1
}
```

相同 `Idempotency-Key` 和相同请求体只生效一次；相同 key 但请求体不同返回 `409 Conflict`。缺少 `Idempotency-Key` 返回 `400 Bad Request`。

### 查询下注

```http
GET /api/bets?userId=1
```

响应示例：

```json
[
  {
    "id": 1,
    "userId": 1,
    "gameId": "game-1",
    "amount": 100,
    "status": "PLACED",
    "createdAt": "2026-01-01 00:00:00"
  }
]
```

`userId` 可省略；省略时返回全部下注记录。

### 创建下注

```http
POST /api/bets
Idempotency-Key: bet-001
Content-Type: application/json
```

请求体：

```json
{
  "userId": 1,
  "gameId": "game-1",
  "amount": 100
}
```

响应示例：

```json
{
  "id": 1,
  "userId": 1,
  "gameId": "game-1",
  "amount": 100,
  "status": "PLACED",
  "balance": 900
}
```

成功后会扣减用户余额、创建 `PLACED` 订单，并追加 `BET_DEBIT` 账本。余额不足返回 `400 Bad Request`。幂等规则和充值接口一致。

### 结算下注

```http
POST /api/bets/:id/settle
Content-Type: application/json
```

请求体：

```json
{ "result": "WIN" }
```

`result` 只能是 `WIN` 或 `LOSE`。仅允许 `PLACED -> SETTLED`：

- `WIN`: 按 `amount * 2` 入账，表示返还本金并发放等额盈利。
- `LOSE`: 不返还余额。

重复结算或结算终态订单返回 `409 Conflict`。

### 取消下注

```http
POST /api/bets/:id/cancel
```

仅允许 `PLACED -> CANCELLED`。取消成功后追加 `BET_REFUND` 账本并退回下注金额。取消终态订单返回 `409 Conflict`。

### 对账

```http
GET /api/admin/reconcile?userId=1
```

响应示例：

```json
{
  "userId": 1,
  "recordedBalance": 1000,
  "calculatedBalance": 1000,
  "betStatusCounts": {
    "PLACED": 0,
    "SETTLED": 0,
    "CANCELLED": 0
  },
  "isConsistent": true,
  "anomalies": []
}
```

`recordedBalance` 来自用户当前余额；`calculatedBalance` 使用初始余额加账本流水重新计算。`anomalies` 会返回缺少扣款、重复发奖、WIN 缺发奖、LOSE 有发奖、取消缺退款、重复退款等异常。

## 前端功能

- 选择预置用户并查看当前余额。
- 充值并编辑 `Idempotency-Key`，可重复提交验证幂等。
- 创建下注并编辑 `Idempotency-Key`，可测试余额扣减和重复下注保护。
- 对 `PLACED` 订单执行 WIN、LOSE 结算或取消退款。
- 查看记录余额、账本推导余额、订单状态统计和对账异常。
