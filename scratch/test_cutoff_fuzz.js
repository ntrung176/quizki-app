import { calculateDayCutoffTimestamp, applyFuzzFactor, calculateAnkiSRS, DAY_CUTOFF_HOUR } from '../src/utils/srs.js';

console.log("=========================================");
console.log("🧪 TESTING SRS DAY CUT-OFF (5:00 AM) & FUZZ FACTOR");
console.log("=========================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${message}`);
        failed++;
    }
}

// 1. TEST DAY CUT-OFF (5:00 AM)
console.log("--- 1. Testing Day Cutoff Timestamp (5:00 AM) ---");

// Test Case A: Current time is 10:00 AM on 2026-08-06 (after 5 AM cutoff)
const timeAfterCutoff = new Date(2026, 7, 6, 10, 0, 0, 0).getTime(); // Aug 6 10:00 AM
const target1Day = calculateDayCutoffTimestamp(1, timeAfterCutoff);
const expected1Day = new Date(2026, 7, 7, 5, 0, 0, 0).getTime(); // Aug 7 5:00 AM
assert(target1Day === expected1Day, `Current 10:00 AM -> +1 day review set to tomorrow 5:00 AM (Aug 7 05:00)`);

// Test Case B: Current time is 02:00 AM on 2026-08-06 (before 5 AM cutoff, still in Aug 5 study block)
const timeBeforeCutoff = new Date(2026, 7, 6, 2, 0, 0, 0).getTime(); // Aug 6 02:00 AM
const targetBeforeCutoff = calculateDayCutoffTimestamp(1, timeBeforeCutoff);
const expectedBeforeCutoff = new Date(2026, 7, 6, 5, 0, 0, 0).getTime(); // Aug 6 05:00 AM
assert(targetBeforeCutoff === expectedBeforeCutoff, `Current 02:00 AM (Aug 6) -> +1 day review set to Aug 6 05:00 AM (in 3 hours)`);

// Test Case C: Current time is 06:00 AM on 2026-08-06 (after 5 AM cutoff), +10 days
const target10Days = calculateDayCutoffTimestamp(10, timeAfterCutoff);
const expected10Days = new Date(2026, 7, 16, 5, 0, 0, 0).getTime(); // Aug 16 05:00 AM
assert(target10Days === expected10Days, `Current Aug 6 -> +10 days set to Aug 16 05:00 AM`);


// 2. TEST FUZZ FACTOR
console.log("\n--- 2. Testing Fuzz Factor ---");

// Test Case A: Intervals <= 4 days should NOT be fuzzed (100% exact)
assert(applyFuzzFactor(1, 'card_1') === 1, `Interval 1 day has 0% fuzz -> 1 day`);
assert(applyFuzzFactor(2, 'card_1') === 2, `Interval 2 days has 0% fuzz -> 2 days`);
assert(applyFuzzFactor(3, 'card_1') === 3, `Interval 3 days has 0% fuzz -> 3 days`);
assert(applyFuzzFactor(4, 'card_1') === 4, `Interval 4 days has 0% fuzz -> 4 days`);

// Test Case B: Interval = 10 days (5 <= interval < 14) -> Fuzz range ±1 day [9, 11]
const fuzzed10 = applyFuzzFactor(10, 'card_test_10');
assert(fuzzed10 >= 9 && fuzzed10 <= 11, `Interval 10 days fuzzed within [9, 11] (Got: ${fuzzed10})`);

// Test Case C: Interval = 20 days (14 <= interval < 30) -> Fuzz range ±2 days [18, 22]
const fuzzed20 = applyFuzzFactor(20, 'card_test_20');
assert(fuzzed20 >= 18 && fuzzed20 <= 22, `Interval 20 days fuzzed within [18, 22] (Got: ${fuzzed20})`);

// Test Case D: Interval = 100 days (interval >= 30) -> Fuzz range ±8% [92, 108]
const fuzzed100 = applyFuzzFactor(100, 'card_test_100');
assert(fuzzed100 >= 92 && fuzzed100 <= 108, `Interval 100 days fuzzed within [92, 108] (Got: ${fuzzed100})`);

// Test Case E: Determinism with seed
const seed1A = applyFuzzFactor(15, 'card_xyz');
const seed1B = applyFuzzFactor(15, 'card_xyz');
assert(seed1A === seed1B, `Fuzz factor is deterministic for same seed (Got: ${seed1A})`);


// 3. INTEGRATION WITH calculateAnkiSRS
console.log("\n--- 3. Testing Integration in calculateAnkiSRS ---");
const reviewCardSrs = {
    interval: 10,
    ease: 2.5,
    reps: 5,
    state: 'REVIEW'
};
const resGood = calculateAnkiSRS(reviewCardSrs, 'good', 'seed_card_99');
assert(resGood.state === 'REVIEW', `State is REVIEW`);
assert(resGood.fuzzedInterval !== undefined, `Result contains fuzzedInterval (${resGood.fuzzedInterval})`);
assert(resGood.nextReviewOffsetMs > 0, `Result contains valid nextReviewOffsetMs (${(resGood.nextReviewOffsetMs / 86400000).toFixed(2)} days)`);

console.log(`\n=========================================`);
console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
console.log(`=========================================`);
if (failed > 0) process.exit(1);
