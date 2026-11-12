import "server-only";
import { networkInterfaces } from "node:os";

/** Private IPv4 addresses of this machine, most likely Wi-Fi/LAN first. */
export function lanAddresses(): string[] {
  const ips: { ip: string; name: string }[] = [];
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === "IPv4" && !a.internal) ips.push({ ip: a.address, name });
    }
  }
  // Virtual adapters (WSL, Hyper-V, Docker, VirtualBox, VPNs) are rarely reachable from a phone.
  const virtual = /vethernet|wsl|hyper-v|docker|vbox|virtualbox|vmware|utun|tun|tap|br-|zerotier|tailscale/i;
  const rank = ({ ip, name }: { ip: string; name: string }) =>
    (virtual.test(name) ? 10 : 0) + (ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 5);
  return [...new Set(ips.sort((a, b) => rank(a) - rank(b)).map((x) => x.ip))];
}
