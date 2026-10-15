import { validateCustomerName, containsProfanity } from "../utils/profanityFilter";

console.log("=== TESTING PROFANITY & NAME SANITIZATION GUARDRAIL ===");

const validNames = [
  "Adam",
  "Nino Nakano",
  "Thomas S.Pd",
  "D'Angelo",
  "Siti Aminah",
  "Fauzi-Rahman"
];

const toxicNames = [
  "anjing",
  "Anj1ng",
  "k o n t o l",
  "babi_hutan",
  " dasar goblok ",
  "Brengsek",
  "fuck you",
  "b!tch",
  "a" // too short
];

let failed = 0;

for (const name of validNames) {
  const result = validateCustomerName(name);
  if (!result.isValid) {
    console.error(`❌ FAILED: Valid name "${name}" was rejected: ${result.message}`);
    failed++;
  } else {
    console.log(`✅ PASS: Valid name "${name}" accepted.`);
  }
}

for (const name of toxicNames) {
  const result = validateCustomerName(name);
  if (result.isValid) {
    console.error(`❌ FAILED: Toxic name "${name}" was mistakenly ACCEPTED!`);
    failed++;
  } else {
    console.log(`✅ PASS: Toxic name "${name}" was blocked: ${result.message}`);
  }
}

if (failed === 0) {
  console.log("\n🎉 ALL PROFANITY GUARDRAIL TESTS PASSED 100%!");
} else {
  console.error(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
}
