export function includes<T>(arr: T[], val: T): boolean {
  return arr.some((v) => v === val);
}
