const { db } = require('../db/database');

const APPROVED_STATUSES = ['confirmed', 'in_progress', 'editing', 'album_production', 'ready_for_delivery', 'completed'];

/**
 * Normalizes time string to HH:MM format
 */
function normalizeTime(t) {
  if (!t) return '10:00';
  const parts = String(t).trim().split(':');
  const h = parts[0].padStart(2, '0');
  const m = (parts[1] || '00').slice(0, 2).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Checks if two time intervals on the same day overlap, accounting for an optional buffer in minutes.
 */
function intervalsOverlap(startA, endA, startB, endB, bufferMinutes = 0) {
  const toMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  let aStart = toMinutes(normalizeTime(startA));
  let aEnd = toMinutes(normalizeTime(endA));
  let bStart = toMinutes(normalizeTime(startB));
  let bEnd = toMinutes(normalizeTime(endB));

  // If ends cross midnight or end <= start, treat end as next day
  if (aEnd <= aStart) aEnd += 24 * 60;
  if (bEnd <= bStart) bEnd += 24 * 60;

  // Add buffer to existing interval B
  const bufferedBStart = Math.max(0, bStart - bufferMinutes);
  const bufferedBEnd = bEnd + bufferMinutes;

  return aStart < bufferedBEnd && aEnd > bufferedBStart;
}

/**
 * Resolves resource requirements for a booking based on package and selected add-ons.
 */
async function getBookingResourceRequirements(packageId, addOns = []) {
  let reqs = {
    photo_teams: 1,
    video_teams: 1,
    camera_kits: 2,
    drones: 0,
    drone_operators: 0,
    gimbals: 0,
  };

  if (packageId) {
    const pkg = await db.prepare('SELECT resource_reqs_json, features_json, name FROM packages WHERE id = ?').get(packageId);
    if (pkg && pkg.resource_reqs_json) {
      try {
        const parsed = JSON.parse(pkg.resource_reqs_json);
        reqs = { ...reqs, ...parsed };
      } catch (e) {}
    } else if (pkg) {
      // Fallback heuristics based on package name
      if (pkg.name === 'Gold') {
        reqs.drones = 1;
        reqs.drone_operators = 1;
        reqs.gimbals = 1;
      } else if (pkg.name === 'Diamond') {
        reqs.photo_teams = 2;
        reqs.camera_kits = 3;
        reqs.drones = 1;
        reqs.drone_operators = 1;
        reqs.gimbals = 1;
      }
    }
  }

  // Check if any add-on demands a drone or additional gear
  if (Array.isArray(addOns)) {
    for (const addon of addOns) {
      const name = (addon.name || '').toLowerCase();
      if (name.includes('drone')) {
        reqs.drones = Math.max(reqs.drones, 1);
        reqs.drone_operators = Math.max(reqs.drone_operators, 1);
      }
      if (name.includes('gimbal')) {
        reqs.gimbals = Math.max(reqs.gimbals, 1);
      }
      if (name.includes('photographer') || name.includes('photo team')) {
        reqs.photo_teams += 1;
        reqs.camera_kits += 1;
      }
      if (name.includes('videographer') || name.includes('video team')) {
        reqs.video_teams += 1;
        reqs.camera_kits += 1;
      }
    }
  }

  return reqs;
}

/**
 * Checks resource and capacity availability for a given date, time window, and requirements.
 */
async function checkAvailability({
  date,
  startTime = '10:00',
  endTime = '22:00',
  packageId = null,
  addOns = [],
  ignoreBookingId = 0,
}) {
  const studio = await db.prepare('SELECT daily_booking_capacity, buffer_hours FROM studio_settings LIMIT 1').get() || {};
  const maxCapacity = studio.daily_booking_capacity || 3;
  const bufferMinutes = Math.round((studio.buffer_hours || 1.0) * 60);

  // 1. Check Full Day Blocks
  const fullDayBlock = await db.prepare(`
    SELECT * FROM availability_blocks 
    WHERE date = ? AND (block_type = 'date' OR block_type IS NULL)
  `).get(date);

  if (fullDayBlock) {
    return {
      available: false,
      reason: fullDayBlock.reason || `Studio is closed or fully blocked on ${date}.`,
      block_type: 'date',
    };
  }

  // 2. Check Specific Time Range Blocks
  const timeBlocks = await db.prepare(`
    SELECT * FROM availability_blocks 
    WHERE date = ? AND block_type = 'time_slot'
  `).all(date);

  for (const tb of timeBlocks) {
    if (intervalsOverlap(startTime, endTime, tb.start_time, tb.end_time, 0)) {
      return {
        available: false,
        reason: tb.reason || `Time slot ${tb.start_time} - ${tb.end_time} is blocked on ${date}.`,
        block_type: 'time_slot',
      };
    }
  }

  // 3. Check Daily Booking Capacity
  const approvedMarks = APPROVED_STATUSES.map(() => '?').join(',');
  const approvedBookingsOnDate = await db.prepare(`
    SELECT id, booking_ref, event_start_time, event_end_time, package_name, booking_status
    FROM bookings 
    WHERE event_date = ? AND booking_status IN (${approvedMarks}) AND id != ?
  `).all(date, ...APPROVED_STATUSES, ignoreBookingId || 0);

  // Manual custom capacity limit for that date if set
  const capBlock = await db.prepare("SELECT max_capacity FROM availability_blocks WHERE date = ? AND block_type = 'capacity'").get(date);
  const effectiveMaxCap = capBlock?.max_capacity !== undefined && capBlock?.max_capacity !== null ? capBlock.max_capacity : maxCapacity;

  if (approvedBookingsOnDate.length >= effectiveMaxCap) {
    return {
      available: false,
      reason: `Maximum daily booking capacity of ${effectiveMaxCap} has been reached for ${date}.`,
      block_type: 'capacity',
      current_bookings: approvedBookingsOnDate.length,
      max_capacity: effectiveMaxCap,
    };
  }

  // 4. Resolve Required Resources
  const reqs = await getBookingResourceRequirements(packageId, addOns);

  // 5. Query active Studio Resources
  const allTeams = await db.prepare("SELECT * FROM studio_teams WHERE status = 'active'").all();
  const allEquipment = await db.prepare("SELECT * FROM equipment WHERE availability = 'available'").all();

  // 6. Find overlapping approved bookings on the same date/time
  const overlappingApprovedBookings = approvedBookingsOnDate.filter((b) =>
    intervalsOverlap(startTime, endTime, b.event_start_time, b.event_end_time, bufferMinutes)
  );

  // 7. Find allocations consumed by overlapping approved bookings
  const overlappingBookingIds = overlappingApprovedBookings.map((b) => b.id);
  let occupiedTeamIds = new Set();
  let occupiedEquipIds = new Set();

  if (overlappingBookingIds.length > 0) {
    const allocMarks = overlappingBookingIds.map(() => '?').join(',');
    const occupiedAllocations = await db.prepare(`
      SELECT resource_type, resource_id FROM booking_resource_allocations
      WHERE booking_id IN (${allocMarks}) AND status = 'allocated'
    `).all(...overlappingBookingIds);

    for (const alloc of occupiedAllocations) {
      if (alloc.resource_type === 'team') occupiedTeamIds.add(alloc.resource_id);
      if (alloc.resource_type === 'equipment') occupiedEquipIds.add(alloc.resource_id);
    }
  }

  // Also include manual team and equipment blocks on this date/time
  const manualTeamBlocks = await db.prepare(`
    SELECT target_team_id, start_time, end_time, reason FROM availability_blocks 
    WHERE date = ? AND block_type = 'team' AND target_team_id IS NOT NULL
  `).all(date);
  for (const mtb of manualTeamBlocks) {
    if (intervalsOverlap(startTime, endTime, mtb.start_time || '00:00', mtb.end_time || '23:59', 0)) {
      occupiedTeamIds.add(mtb.target_team_id);
    }
  }

  const manualEqBlocks = await db.prepare(`
    SELECT target_equipment_id, start_time, end_time, reason FROM availability_blocks 
    WHERE date = ? AND block_type = 'equipment' AND target_equipment_id IS NOT NULL
  `).all(date);
  for (const meb of manualEqBlocks) {
    if (intervalsOverlap(startTime, endTime, meb.start_time || '00:00', meb.end_time || '23:59', 0)) {
      occupiedEquipIds.add(meb.target_equipment_id);
    }
  }

  // 8. Compute Available Resources
  const availablePhotoTeams = allTeams.filter(
    (t) => (t.team_type === 'photography' || t.team_type === 'hybrid') && !occupiedTeamIds.has(t.id)
  );
  const availableVideoTeams = allTeams.filter(
    (t) => (t.team_type === 'videography' || t.team_type === 'hybrid') && !occupiedTeamIds.has(t.id)
  );
  const availableDroneUnits = allTeams.filter(
    (t) => t.team_type === 'drone' && !occupiedTeamIds.has(t.id)
  );

  const availableCameraKits = allEquipment.filter(
    (e) => e.category === 'camera' && !occupiedEquipIds.has(e.id)
  );
  const availableDrones = allEquipment.filter(
    (e) => e.category === 'drone' && !occupiedEquipIds.has(e.id)
  );
  const availableGimbals = allEquipment.filter(
    (e) => e.category === 'gimbal' && !occupiedEquipIds.has(e.id)
  );

  // 9. Compare Available vs Required
  const missing = [];
  if (reqs.photo_teams > 0 && availablePhotoTeams.length < reqs.photo_teams) {
    missing.push(`Photography teams (needed: ${reqs.photo_teams}, available: ${availablePhotoTeams.length})`);
  }
  if (reqs.video_teams > 0 && availableVideoTeams.length < reqs.video_teams) {
    missing.push(`Videography teams (needed: ${reqs.video_teams}, available: ${availableVideoTeams.length})`);
  }
  if (reqs.camera_kits > 0 && availableCameraKits.length < reqs.camera_kits) {
    missing.push(`Camera kits (needed: ${reqs.camera_kits}, available: ${availableCameraKits.length})`);
  }
  if (reqs.drones > 0 && availableDrones.length < reqs.drones) {
    missing.push(`Drones (needed: ${reqs.drones}, available: ${availableDrones.length})`);
  }
  if (reqs.drone_operators > 0 && availableDroneUnits.length < reqs.drone_operators) {
    missing.push(`Drone pilot/operator (needed: ${reqs.drone_operators}, available: ${availableDroneUnits.length})`);
  }
  if (reqs.gimbals > 0 && availableGimbals.length < reqs.gimbals) {
    missing.push(`Gimbals (needed: ${reqs.gimbals}, available: ${availableGimbals.length})`);
  }

  if (missing.length > 0) {
    return {
      available: false,
      reason: `Required resources are not available for this time slot: ${missing.join('; ')}.`,
      missing_resources: missing,
      required: reqs,
      occupied_teams_count: occupiedTeamIds.size,
      occupied_equipment_count: occupiedEquipIds.size,
      overlapping_bookings: overlappingApprovedBookings.map((b) => b.booking_ref),
    };
  }

  // Provide candidates that can be assigned upon approval
  return {
    available: true,
    required: reqs,
    candidate_resources: {
      photo_teams: availablePhotoTeams.slice(0, reqs.photo_teams),
      video_teams: availableVideoTeams.slice(0, reqs.video_teams),
      drone_units: availableDroneUnits.slice(0, reqs.drone_operators),
      cameras: availableCameraKits.slice(0, reqs.camera_kits),
      drones: availableDrones.slice(0, reqs.drones),
      gimbals: availableGimbals.slice(0, reqs.gimbals),
    },
    total_approved_on_date: approvedBookingsOnDate.length,
    remaining_daily_capacity: effectiveMaxCap - approvedBookingsOnDate.length,
  };
}

/**
 * Assigns resources safely upon approval within an isolated check.
 */
async function allocateResourcesForBooking(bookingId) {
  const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) throw new Error('Booking not found');

  // Verify availability right now
  const check = await checkAvailability({
    date: booking.event_date,
    startTime: booking.event_start_time,
    endTime: booking.event_end_time,
    packageId: booking.package_id,
    ignoreBookingId: booking.id,
  });

  if (!check.available) {
    throw new Error(`Cannot approve booking: ${check.reason}`);
  }

  // Clear any existing allocations for this booking
  await db.prepare('DELETE FROM booking_resource_allocations WHERE booking_id = ?').run(booking.id);

  const insertAlloc = db.prepare(`
    INSERT INTO booking_resource_allocations (booking_id, resource_type, resource_id, resource_name, allocated_start_time, allocated_end_time, status)
    VALUES (?, ?, ?, ?, ?, ?, 'allocated')
  `);

  const { candidate_resources } = check;

  for (const t of candidate_resources.photo_teams || []) {
    await insertAlloc.run(booking.id, 'team', t.id, t.name, booking.event_start_time, booking.event_end_time);
  }
  for (const t of candidate_resources.video_teams || []) {
    await insertAlloc.run(booking.id, 'team', t.id, t.name, booking.event_start_time, booking.event_end_time);
  }
  for (const t of candidate_resources.drone_units || []) {
    await insertAlloc.run(booking.id, 'team', t.id, t.name, booking.event_start_time, booking.event_end_time);
  }
  for (const e of candidate_resources.cameras || []) {
    await insertAlloc.run(booking.id, 'equipment', e.id, e.name, booking.event_start_time, booking.event_end_time);
  }
  for (const e of candidate_resources.drones || []) {
    await insertAlloc.run(booking.id, 'equipment', e.id, e.name, booking.event_start_time, booking.event_end_time);
  }
  for (const e of candidate_resources.gimbals || []) {
    await insertAlloc.run(booking.id, 'equipment', e.id, e.name, booking.event_start_time, booking.event_end_time);
  }

  return check;
}

/**
 * Releases resources when a booking is cancelled or rejected.
 */
async function releaseBookingResources(bookingId) {
  await db.prepare("UPDATE booking_resource_allocations SET status = 'released' WHERE booking_id = ?").run(bookingId);
}

module.exports = {
  APPROVED_STATUSES,
  normalizeTime,
  intervalsOverlap,
  getBookingResourceRequirements,
  checkAvailability,
  allocateResourcesForBooking,
  releaseBookingResources,
};
