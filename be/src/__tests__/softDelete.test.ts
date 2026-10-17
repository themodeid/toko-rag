// ==============================================================================
// 🛡️ UNIT TESTS: SOFT DELETE INTEGRITY & AUDIT PRESERVATION
// ==============================================================================

console.log("=== TESTING SOFT DELETE & AUDIT INTEGRITY ===");

let failed = 0;

interface TestEntity {
  id: string;
  nama: string;
  deleted_at: Date | null;
  is_available: boolean;
}

// Mock database storage
const mockDatabase: TestEntity[] = [
  { id: "1", nama: "Matcha Latte", deleted_at: null, is_available: true },
  { id: "2", nama: "Caramel Macchiato", deleted_at: null, is_available: true },
  { id: "3", nama: "Espresso Tonic", deleted_at: null, is_available: false },
];

// Helper: Query only active entities
function queryActiveEntities(db: TestEntity[]): TestEntity[] {
  return db.filter((item) => item.deleted_at === null);
}

// Helper: Execute Soft Delete
function softDeleteEntity(db: TestEntity[], id: string): TestEntity | null {
  const index = db.findIndex((item) => item.id === id && item.deleted_at === null);
  if (index === -1) return null;
  
  db[index] = {
    ...db[index],
    deleted_at: new Date(),
    is_available: false,
  };
  return db[index];
}

// Test 1: Verify Initial Active Count
const initialActive = queryActiveEntities(mockDatabase);
if (initialActive.length === 3) {
  console.log("✅ PASS: Initial active query returns all 3 non-deleted records.");
} else {
  console.error("❌ FAILED: Initial active query count mismatch:", initialActive.length);
  failed++;
}

// Test 2: Execute Soft Delete on item '2'
const deletedItem = softDeleteEntity(mockDatabase, "2");
if (deletedItem && deletedItem.deleted_at !== null && deletedItem.is_available === false) {
  console.log("✅ PASS: Soft delete successfully sets deleted_at and sets is_available to FALSE.");
} else {
  console.error("❌ FAILED: Soft delete execution failed:", deletedItem);
  failed++;
}

// Test 3: Active entities query must now exclude deleted item
const activeAfterDelete = queryActiveEntities(mockDatabase);
const hasDeletedInActive = activeAfterDelete.some((item) => item.id === "2");
if (activeAfterDelete.length === 2 && !hasDeletedInActive) {
  console.log("✅ PASS: Active catalog query properly excludes soft-deleted records.");
} else {
  console.error("❌ FAILED: Soft-deleted entity leaked into active catalog!");
  failed++;
}

// Test 4: Cannot delete already soft-deleted entity (Idempotent / 404 guard)
const doubleDelete = softDeleteEntity(mockDatabase, "2");
if (doubleDelete === null) {
  console.log("✅ PASS: Double deletion safely returns null (prevents corrupt state).");
} else {
  console.error("❌ FAILED: Double deletion allowed!");
  failed++;
}

// Test 5: Historical foreign key integrity preserved
// The item still exists in physical database for past order items join
const physicalItem = mockDatabase.find((item) => item.id === "2");
if (physicalItem && physicalItem.nama === "Caramel Macchiato") {
  console.log("✅ PASS: Physical record preserved in database for historical order audit.");
} else {
  console.error("❌ FAILED: Physical record was destroyed!");
  failed++;
}

if (failed === 0) {
  console.log("\n🎉 ALL SOFT DELETE INTEGRITY TESTS PASSED 100%!");
} else {
  console.error(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
}
