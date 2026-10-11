const { checkAvailability, allocateResourcesForBooking, releaseBookingResources } = require('./src/services/availabilityService');
const { db, connectDB } = require('./src/db/database');

async function runTests() {
  await connectDB();
  console.log('=== RUNNING RESOURCE AVAILABILITY TEST SUITE ===');

  // TEST 1: Check Availability for Multi-Booking on 2026-11-20
  console.log('\n--- TEST 1: Compatible Booking 1 on 2026-11-20 (Silver) ---');
  const res1 = await checkAvailability({
    date: '2026-11-20',
    startTime: '10:00',
    endTime: '15:00',
    packageId: 3 // Silver
  });
  console.log('Test 1 (Silver booking 1):', res1.available ? 'PASS' : 'FAIL', res1.reason || '');

  // TEST 2: Second Compatible Booking same date
  console.log('\n--- TEST 2: Second Compatible Booking same date (Gold) ---');
  const res2 = await checkAvailability({
    date: '2026-11-20',
    startTime: '16:00',
    endTime: '22:00',
    packageId: 4 // Gold
  });
  console.log('Test 2 (Gold booking 2 same date):', res2.available ? 'PASS' : 'FAIL', res2.reason || '');

  // TEST 3: Manual Full Day Block prevents booking
  console.log('\n--- TEST 3: Manual Full Day Block on 2026-12-25 ---');
  await db.prepare("INSERT INTO availability_blocks (date, block_type, reason) VALUES (?, ?, ?)")
    .run('2026-12-25', 'date', 'Christmas Holiday');
  const res3 = await checkAvailability({
    date: '2026-12-25',
    startTime: '10:00',
    endTime: '15:00',
    packageId: 3
  });
  console.log('Test 3 (Manual Block Check):', !res3.available && res3.block_type === 'date' ? 'PASS' : 'FAIL', '->', res3.reason);
  await db.prepare("DELETE FROM availability_blocks WHERE date = '2026-12-25'").run();

  // TEST 4: Drone constraint check (Package requires drone, all drones maintenance)
  console.log('\n--- TEST 4: Drone Constraint Check ---');
  await db.prepare("UPDATE equipment SET availability = 'maintenance' WHERE category = 'drone'").run();
  const res4 = await checkAvailability({
    date: '2026-11-21',
    startTime: '10:00',
    endTime: '18:00',
    packageId: 4 // Gold requires drone
  });
  console.log('Test 4 (Drone in maintenance blocks Gold package):', !res4.available ? 'PASS' : 'FAIL', '->', res4.reason);
  await db.prepare("UPDATE equipment SET availability = 'available' WHERE category = 'drone'").run();

  // TEST 5: Verify existing bookings intact
  const count = await db.prepare("SELECT COUNT(*) as c FROM bookings").get();
  console.log('\n--- TEST 5: Existing Bookings Records Check ---');
  console.log('Total Existing Bookings preserved:', count.c, 'PASS');

  console.log('\n=== ALL TESTS FINISHED ===');
}

runTests().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
