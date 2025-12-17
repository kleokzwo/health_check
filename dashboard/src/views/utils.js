export function formatBytes(n) {
  if (n == null) return "-";
  const units = ["B","KB","MB","GB","TB"];
  let i = 0;
  let x = Number(n);
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}
