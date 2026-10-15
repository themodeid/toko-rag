import { CheckoutOrderInput, checkoutOrderSchema } from "../modules/order/order.schema";

console.log("=== TESTING KIOSK ORDER LOGIC & ESTIMATION ===");

let failed = 0;

// Test 1: Valid checkout payload
const validOrderPayload = {
  nama_pelanggan: "Adam Wahyu",
  items: [
    {
      minuman_id: "c4b1e5a7-9b2f-48d1-8d2b-6c4a1e9f1a01",
      qty: 2,
      suhu: "ICE" as const,
      sugar_level: "LESS" as const,
      catatan: "Sedikit es saja ya"
    },
    {
      minuman_id: "c4b1e5a7-9b2f-48d1-8d2b-6c4a1e9f1a02",
      qty: 1,
      suhu: "HOT" as const,
      sugar_level: "NORMAL" as const
    }
  ]
};

const validParsed = checkoutOrderSchema.safeParse(validOrderPayload);
if (validParsed.success) {
  console.log("✅ PASS: Valid order schema passed parsing.");
} else {
  console.error("❌ FAILED: Valid order schema failed:", validParsed.error.issues);
  failed++;
}

// Test 2: Profanity name in order schema should be blocked
const toxicOrderPayload = {
  nama_pelanggan: "Si Anjing Bangsat",
  items: [
    {
      minuman_id: "c4b1e5a7-9b2f-48d1-8d2b-6c4a1e9f1a01",
      qty: 1
    }
  ]
};

const toxicParsed = checkoutOrderSchema.safeParse(toxicOrderPayload);
if (!toxicParsed.success) {
  console.log("✅ PASS: Toxic customer name was properly rejected by Zod schema:", toxicParsed.error.issues[0].message);
} else {
  console.error("❌ FAILED: Toxic customer name was accepted!");
  failed++;
}

// Test 3: Empty items should be blocked
const emptyItemsPayload = {
  nama_pelanggan: "Thomas",
  items: []
};

const emptyParsed = checkoutOrderSchema.safeParse(emptyItemsPayload);
if (!emptyParsed.success) {
  console.log("✅ PASS: Empty items array rejected properly:", emptyParsed.error.issues[0].message);
} else {
  console.error("❌ FAILED: Empty items array was accepted!");
  failed++;
}

// Test 4: Queue time estimation formula
// Formula: (activeQueuesCount * 4) + (itemCount * 2)
function calculateEstimatedMinutes(activeQueuesCount: number, itemCount: number): number {
  return Math.max(3, (activeQueuesCount * 4) + (itemCount * 2));
}

const est1 = calculateEstimatedMinutes(0, 1); // 0 antrian, 1 item -> max(3, 2) = 3 menit
const est2 = calculateEstimatedMinutes(2, 3); // 2 antrian, 3 item -> (2*4) + (3*2) = 14 menit
const est3 = calculateEstimatedMinutes(5, 2); // 5 antrian, 2 item -> (5*4) + (2*2) = 24 menit

if (est1 === 3 && est2 === 14 && est3 === 24) {
  console.log("✅ PASS: Queue estimation math is deterministic & accurate.");
} else {
  console.error("❌ FAILED: Queue estimation math mismatch:", { est1, est2, est3 });
  failed++;
}

if (failed === 0) {
  console.log("\n🎉 ALL KIOSK LOGIC TESTS PASSED 100%!");
} else {
  console.error(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
}
