/**
 * SSRF guard for /api/fetch-job (S-batch, log #17): blocks literal
 * private / loopback / link-local / local hostnames before any fetch.
 *
 * Honest residual: this checks the literal host only. A public hostname
 * that RESOLVES to a private address (DNS rebinding) is not stopped —
 * resolution-time checking is out of scope for the smallest version.
 */

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.some((n) => Number.isNaN(n) || n > 255) ? null : nums;
}

function isPrivateIpv4(nums: number[]): boolean {
  const [a, b] = nums;
  return (
    a === 127 || // 127.0.0.0/8 loopback
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local
    a === 0 // 0.0.0.0/8 "this network"
  );
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb")) return true; // fe80::/10
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 unique-local
  // IPv4-mapped/compatible forms, e.g. ::ffff:127.0.0.1
  const v4 = h.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)?.[1];
  if (v4) {
    const nums = parseIpv4(v4);
    if (nums && isPrivateIpv4(nums)) return true;
  }
  // Hex form of the IPv4-mapped address: URL parsers normalize
  // [::ffff:127.0.0.1] to ::ffff:7f00:1, which the dotted check above
  // never sees. Decode the two trailing hex groups back into octets
  // and apply the same IPv4 ranges (RR-31).
  const mapped = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/) ?? h.match(/^::ffff:([0-9a-f]{1,4})$/);
  if (mapped) {
    const hi = parseInt(mapped[1], 16);
    const lo = mapped[2] !== undefined ? parseInt(mapped[2], 16) : 0;
    const nums = [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
    if (isPrivateIpv4(nums)) return true;
  }
  return false;
}

/** True when the hostname must never be fetched server-side. */
export function isBlockedHost(rawHostname: string): boolean {
  let host = rawHostname.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  // RR-31: strip ONE trailing dot before any check — "localhost." and
  // "127.0.0.1." are the same hosts with a root dot, and resolvers
  // treat them identically; without this they slipped past every
  // comparison below.
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  const v4 = parseIpv4(host);
  if (v4) return isPrivateIpv4(v4);
  if (host.includes(":")) return isPrivateIpv6(host);
  return false;
}
