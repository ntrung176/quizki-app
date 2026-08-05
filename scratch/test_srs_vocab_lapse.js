import { calculateAnkiSRS, normalizeSRSState } from '../src/utils/srs.js';

function runSrsTests() {
    console.log('=== STARTING RIGOROUS SRS VOCABULARY LAPSE TESTS ===\n');

    let passedCount = 0;
    let failedCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passedCount++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failedCount++;
        }
    }

    // -------------------------------------------------------------
    // TEST 1: Card with 10 days interval lapsed via 'again'
    // -------------------------------------------------------------
    console.log('--- TEST 1: Review card (10 days interval) lapsed with "again" ---');
    const initialCard1 = {
        id: 'vocab_101',
        srsInterval: 10,
        srsEase: 2.50,
        srsReps: 4,
        srsState: 'REVIEW',
        srsLapseCount: 0
    };

    const result1 = calculateAnkiSRS(initialCard1, 'again');
    assert(result1.state === 'RELEARNING', 'State transitions from REVIEW to RELEARNING');
    assert(result1.prelapseInterval === 10, 'prelapseInterval correctly captures old 10-day interval');
    assert(result1.interval === 10, 'Interval in RELEARNING is set to 10 minutes');
    assert(Math.abs(result1.ease - 2.30) < 0.001, 'Ease factor reduced by 0.20 (2.50 -> 2.30)');
    assert(result1.isLapsed === true, 'isLapsed flag set to true');
    assert(result1.lapseCount === 1, 'lapseCount incremented to 1');

    // Test 1b: Student reviews the relearning card and rates 'good'
    console.log('\n--- TEST 1b: Relearning card rated "good" ---');
    const relearningCard1 = {
        ...initialCard1,
        srsInterval: result1.interval,
        srsEase: result1.ease,
        srsState: result1.state,
        srsPrelapseInterval: result1.prelapseInterval,
        srsIsLapsed: result1.isLapsed,
        srsLapseCount: result1.lapseCount
    };

    const result1b = calculateAnkiSRS(relearningCard1, 'good');
    assert(result1b.state === 'REVIEW', 'State graduates back to REVIEW');
    assert(result1b.interval === 5, 'Interval penalized by 50%: reduced from 10 days to 5 days');
    assert(result1b.prelapseInterval === null, 'prelapseInterval cleared after graduation');
    assert(result1b.isLapsed === false, 'isLapsed reset to false');

    // -------------------------------------------------------------
    // TEST 2: Card with 20 days interval lapsed via 'again' then 'good'
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Review card (20 days interval) lapsed with "again" then "good" ---');
    const initialCard2 = {
        id: 'vocab_102',
        srsInterval: 20,
        srsEase: 2.50,
        srsReps: 6,
        srsState: 'REVIEW'
    };

    const result2a = calculateAnkiSRS(initialCard2, 'again');
    assert(result2a.state === 'RELEARNING', 'State transitions to RELEARNING');
    assert(result2a.prelapseInterval === 20, 'prelapseInterval captured as 20 days');

    const result2b = calculateAnkiSRS({
        ...initialCard2,
        srsInterval: result2a.interval,
        srsEase: result2a.ease,
        srsState: result2a.state,
        srsPrelapseInterval: result2a.prelapseInterval,
        srsIsLapsed: result2a.isLapsed
    }, 'good');

    assert(result2b.state === 'REVIEW', 'State graduates back to REVIEW');
    assert(result2b.interval === 10, 'Interval penalized by 50%: reduced from 20 days to 10 days');

    // -------------------------------------------------------------
    // TEST 3: Short interval card (1 day interval) lapsed via 'again' then 'good'
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Short interval card (1 day) lapsed with "again" then "good" ---');
    const initialCard3 = {
        id: 'vocab_103',
        srsInterval: 1,
        srsEase: 2.50,
        srsReps: 1,
        srsState: 'REVIEW'
    };

    const result3a = calculateAnkiSRS(initialCard3, 'again');
    assert(result3a.prelapseInterval === 1, 'prelapseInterval captured as 1 day');

    const result3b = calculateAnkiSRS({
        ...initialCard3,
        srsInterval: result3a.interval,
        srsEase: result3a.ease,
        srsState: result3a.state,
        srsPrelapseInterval: result3a.prelapseInterval
    }, 'good');

    assert(result3b.interval === 1, '1-day interval stays at 1 day (does NOT inappropriately increase to 2 days)');

    // -------------------------------------------------------------
    // TEST 4: Relearning card rated 'hard'
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Relearning card (prelapse 10 days) rated "hard" ---');
    const result4 = calculateAnkiSRS({
        ...initialCard1,
        srsInterval: 10,
        srsState: 'RELEARNING',
        srsPrelapseInterval: 10,
        srsEase: 2.30
    }, 'hard');

    assert(result4.state === 'REVIEW', 'Graduates to REVIEW');
    assert(result4.interval === 3, 'Hard rating on relearning yields 30% of 10 days = 3 days');

    // -------------------------------------------------------------
    // TEST 5: Relearning card rated 'easy'
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Relearning card (prelapse 10 days) rated "easy" ---');
    const result5 = calculateAnkiSRS({
        ...initialCard1,
        srsInterval: 10,
        srsState: 'RELEARNING',
        srsPrelapseInterval: 10,
        srsEase: 2.30
    }, 'easy');

    assert(result5.state === 'REVIEW', 'Graduates to REVIEW');
    assert(result5.interval === 7, 'Easy rating on relearning yields 70% of 10 days = 7 days');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log(`\n=============================================================`);
    console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log(`=============================================================`);

    if (failedCount > 0) {
        process.exit(1);
    }
}

runSrsTests();
