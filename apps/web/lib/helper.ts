// API 辅助函数文件，提供提交写操作时需要的 Key 生成方法。
/**
 * 生成默认幂等 Key，用户也可以在页面手动复用或修改。
 */
export function makeIdempotencyKey(prefix: string): string {
  // 页面默认生成可读 Key，也允许用户手动复用它来验证幂等行为。
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}
