
import { getLocalDayOrdinalForRotation } from "../lib/local-day";

// Mock environment variables
process.env.DEPLOYMENT_TIMEZONE = "Asia/Kolkata";

console.log("Testing with Asia/Kolkata (UTC+5:30)");

const t1 = new Date("2026-05-10T18:00:00Z"); // 23:30 in Kolkata
const t2 = new Date("2026-05-10T19:00:00Z"); // 00:30 in Kolkata

console.log(`T1 (UTC 18:00): ${t1.toISOString()} -> Ordinal: ${getLocalDayOrdinalForRotation(t1)}`);
console.log(`T2 (UTC 19:00): ${t2.toISOString()} -> Ordinal: ${getLocalDayOrdinalForRotation(t2)}`);

if (getLocalDayOrdinalForRotation(t1) !== getLocalDayOrdinalForRotation(t2)) {
  console.log("SUCCESS: Rotation happened at midnight Kolkata time.");
} else {
  console.log("FAILURE: Rotation did NOT happen at midnight Kolkata time.");
}
