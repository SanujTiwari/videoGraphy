const { db, connectDB } = require('./database');

async function migrateAvailabilitySchema() {
  await connectDB();

  // 1. Studio capacity & timezone settings
  await db.prepare("ALTER TABLE studio_settings ADD COLUMN IF NOT EXISTS daily_booking_capacity INTEGER DEFAULT 3").run();
  await db.prepare("ALTER TABLE studio_settings ADD COLUMN IF NOT EXISTS buffer_hours DOUBLE PRECISION DEFAULT 1.0").run();
  await db.prepare("ALTER TABLE studio_settings ADD COLUMN IF NOT EXISTS studio_timezone TEXT DEFAULT 'Asia/Kolkata'").run();

  // 2. Package resource requirements
  await db.prepare("ALTER TABLE packages ADD COLUMN IF NOT EXISTS resource_reqs_json TEXT").run();

  // Silver: 1 photo team, 1 video team, 2 camera kits, 0 drones, 0 gimbals
  const silverReqs = JSON.stringify({ photo_teams: 1, video_teams: 1, camera_kits: 2, drones: 0, drone_operators: 0, gimbals: 0 });
  await db.prepare("UPDATE packages SET resource_reqs_json = ? WHERE name = 'Silver'").run(silverReqs);

  // Gold: 1 photo team, 1 video team, 2 camera kits, 1 drone, 1 drone operator, 1 gimbal
  const goldReqs = JSON.stringify({ photo_teams: 1, video_teams: 1, camera_kits: 2, drones: 1, drone_operators: 1, gimbals: 1 });
  await db.prepare("UPDATE packages SET resource_reqs_json = ? WHERE name = 'Gold'").run(goldReqs);

  // Diamond: 2 photo teams, 1 video team, 3 camera kits, 1 drone, 1 drone operator, 1 gimbal
  const diamondReqs = JSON.stringify({ photo_teams: 2, video_teams: 1, camera_kits: 3, drones: 1, drone_operators: 1, gimbals: 1 });
  await db.prepare("UPDATE packages SET resource_reqs_json = ? WHERE name = 'Diamond'").run(diamondReqs);

  // 3. Studio Teams table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS studio_teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      team_type TEXT NOT NULL,
      leader_name TEXT,
      leader_mobile TEXT,
      member_count INTEGER DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
    )
  `).run();

  // 4. Equipment enhancement
  await db.prepare("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS assigned_team_id INTEGER REFERENCES studio_teams(id) ON DELETE SET NULL").run();
  await db.prepare("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number TEXT").run();

  // 5. Booking Resource Allocations
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS booking_resource_allocations (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      resource_name TEXT NOT NULL,
      allocated_start_time TEXT,
      allocated_end_time TEXT,
      status TEXT NOT NULL DEFAULT 'allocated',
      created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
    )
  `).run();

  // 6. Upgraded Availability Blocks
  await db.prepare("ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'date'").run();
  await db.prepare("ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS start_time TEXT").run();
  await db.prepare("ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS end_time TEXT").run();
  await db.prepare("ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS target_team_id INTEGER REFERENCES studio_teams(id) ON DELETE CASCADE").run();
  await db.prepare("ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS target_equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE").run();
  await db.prepare("ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS max_capacity INTEGER").run();
  await db.prepare("ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')").run();

  // 7. Seed safe initial teams if table is empty
  const teamCount = await db.prepare("SELECT COUNT(*) as count FROM studio_teams").get();
  if (teamCount.count === 0) {
    const insertTeam = db.prepare(`
      INSERT INTO studio_teams (name, team_type, leader_name, leader_mobile, member_count, status, notes)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `);

    await insertTeam.run('Alpha Photo Team', 'photography', 'Vikram Singh', '+91 98765 11001', 2, 'Senior Candid and Traditional Lead');
    await insertTeam.run('Beta Photo Team', 'photography', 'Aman Sharma', '+91 98765 11002', 2, 'Traditional Photo Specialists');
    await insertTeam.run('Cinema Video Team 1', 'videography', 'Rohan Verma', '+91 98765 11003', 2, 'Cinematic 4K Video & Gimbal');
    await insertTeam.run('Traditional Video Team 2', 'videography', 'Sunil Kumar', '+91 98765 11004', 2, 'Full HD Traditional Video');
    await insertTeam.run('Aerial Drone Unit', 'drone', 'Deepak Rana', '+91 98765 11005', 1, 'Certified Drone Pilot');
  }

  // 8. Seed equipment if table is empty
  const eqCount = await db.prepare("SELECT COUNT(*) as count FROM equipment").get();
  if (eqCount.count === 0) {
    const insertEq = db.prepare(`
      INSERT INTO equipment (asset_id, name, category, quantity, condition, availability, purchase_date, notes)
      VALUES (?, ?, ?, ?, 'excellent', 'available', '2024-01-15', ?)
    `);

    await insertEq.run('CAM-001', 'Sony Alpha A7 IV Kit A (35mm, 85mm)', 'camera', 1, 'Primary Candid Rig');
    await insertEq.run('CAM-002', 'Sony Alpha A7 III Kit B (24-70mm GM)', 'camera', 1, 'Traditional Photography Kit');
    await insertEq.run('CAM-003', 'Sony FX3 Cinema Rig', 'camera', 1, 'Cinematic Videography Lead');
    await insertEq.run('CAM-004', 'Sony A7R V High-Res Kit', 'camera', 1, 'Royal Portraits & Pre-wedding');
    await insertEq.run('DRONE-01', 'DJI Mavic 3 Pro Cine Combo', 'drone', 1, '4K 60fps Baraat & Venue Aerials');
    await insertEq.run('GIMBAL-01', 'DJI RS 3 Pro Gimbal Stabilizer', 'gimbal', 1, 'Cinematic Teaser & Entry Tracking');
    await insertEq.run('GIMBAL-02', 'DJI Ronin SC Stabilizer', 'gimbal', 1, 'Secondary Video Stabilization');
    await insertEq.run('AUDIO-01', 'Rode Wireless PRO Dual Mic System', 'audio', 2, 'Vows & Ritual Audio Capture');
  }

  // 9. Gallery photos media support & Cloudinary settings
  await db.prepare("ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image'").run();
  await db.prepare("ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS public_id TEXT").run();
  await db.prepare("ALTER TABLE studio_settings ADD COLUMN IF NOT EXISTS cloudinary_cloud_name TEXT").run();
  await db.prepare("ALTER TABLE studio_settings ADD COLUMN IF NOT EXISTS cloudinary_api_key TEXT").run();
  await db.prepare("ALTER TABLE studio_settings ADD COLUMN IF NOT EXISTS cloudinary_api_secret TEXT").run();

  console.log('✅ Availability, Resource, and Cloudinary Media Schema migration completed successfully!');
}

if (require.main === module) {
  migrateAvailabilitySchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateAvailabilitySchema };
