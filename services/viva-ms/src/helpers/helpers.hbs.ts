export default {
  eq: (v1: unknown, v2: unknown) => v1 === v2,
  ne: (v1: unknown, v2: unknown) => v1 !== v2,
  lt: (v1: number, v2: number) => v1 < v2,
  gt: (v1: number, v2: number) => v1 > v2,
  lte: (v1: number, v2: number) => v1 <= v2,
  gte: (v1: number, v2: number) => v1 >= v2,
  includes: (v1: string, v2: string) => v1.includes(v2),
  and(...args: unknown[]) {
    return Array.prototype.every.call(args, Boolean);
  },
  or(...args: unknown[]) {
    return Array.prototype.slice.call(args, 0, -1).some(Boolean);
  },
};
