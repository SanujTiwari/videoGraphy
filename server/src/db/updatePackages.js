const { db, connectDB } = require('./database');

const json = (v) => JSON.stringify(v ?? []);

async function updateStudioPackages() {
  await connectDB();

  // 1. Silver Package
  const silverServices = ['Traditional Video', 'Traditional Photography'];
  const silverFeatures = [
    'Traditional Video',
    'Traditional Photography',
    'One Reel / Highlight Video',
    '20-page Album, size 12×36',
    'Full HD Video',
    'One 32 GB Pendrive',
    'Four Event Days',
    '120–130 Photos in Album',
  ];
  const silverDetails = {
    tier: 'Basic wedding coverage',
    days: 'Four Event Days',
    album: '20-page Album, size 12×36 (120–130 Photos in Album)',
    pendrive: 'One 32 GB Pendrive',
    drone: 'Not included',
  };

  await db.prepare(`
    UPDATE packages SET
      price = 22000,
      original_price = 26000,
      pricing_mode = 'auto',
      discount_type = 'fixed',
      discount_value = 4000,
      discount_amount = 4000,
      discount_percent = 15.38,
      discount_enabled = 1,
      price_max = NULL,
      travel_policy = 'Travel charges may apply for event locations more than 30 km from the studio.',
      note = 'Travel charges may apply for event locations more than 30 km from the studio.',
      included_services_json = ?,
      features_json = ?,
      details_json = ?,
      display_order = 1,
      status = 'active'
    WHERE name = 'Silver'
  `).run(json(silverServices), json(silverFeatures), JSON.stringify(silverDetails));

  // 2. Gold Package
  const goldServices = ['Traditional Video', 'Traditional Photography', 'Cinematic Teaser'];
  const goldFeatures = [
    'Traditional Video',
    'Traditional Photography',
    'One Haldi Reel Video',
    'One Mehndi Reel Video',
    'One Cinematic Wedding Teaser',
    '30-page Album, size 14×40',
    'Video with Gimbal Shoot',
    'One-Day Drone Shoot for Baraat',
    '180–200 Photos in Album',
    'Four Event Days',
    'One 64 GB Pendrive',
  ];
  const goldDetails = {
    tier: 'Silver + cinematic content, gimbal, drone & larger album',
    days: 'Four Event Days',
    album: '30-page Album, size 14×40 (180–200 Photos in Album)',
    pendrive: 'One 64 GB Pendrive',
    drone: 'One-Day Drone Shoot for Baraat',
  };

  await db.prepare(`
    UPDATE packages SET
      price = 30000,
      original_price = NULL,
      pricing_mode = 'auto',
      discount_type = 'percentage',
      discount_value = 0,
      discount_amount = NULL,
      discount_percent = NULL,
      discount_enabled = 0,
      price_max = NULL,
      travel_policy = 'Travel charges may apply for event locations more than 30 km from the studio.',
      note = 'Travel charges may apply for event locations more than 30 km from the studio.',
      included_services_json = ?,
      features_json = ?,
      details_json = ?,
      display_order = 2,
      status = 'active'
    WHERE name = 'Gold'
  `).run(json(goldServices), json(goldFeatures), JSON.stringify(goldDetails));

  // 3. Diamond Package
  const diamondServices = ['Traditional Video', 'Cinematic Photography', 'Candid Photography', 'Wedding Highlight Video'];
  const diamondFeatures = [
    'Traditional Video',
    'Cinematic Photography',
    'Candid Photography',
    '35-page Album, size 14×40',
    'Cinematic Haldi Reel',
    'Cinematic Mehndi Reel',
    'Cinematic Wedding Teaser',
    'One-Day Drone Shoot for Baraat',
    'Ten Photo Frames, size 2×3 feet',
    'One 64 GB Pendrive',
    'Four Event Days',
    'Gimbal Shoot Video',
    '220–230 Photos in Album',
    'Four Reels',
    'Wedding Highlight Video',
  ];
  const diamondDetails = {
    tier: 'Gold + cinematic/candid photography, more photos, frames, reels & highlight',
    days: 'Four Event Days',
    album: '35-page Album, size 14×40 (220–230 Photos in Album)',
    pendrive: 'One 64 GB Pendrive',
    drone: 'One-Day Drone Shoot for Baraat',
  };

  await db.prepare(`
    UPDATE packages SET
      price = 40000,
      original_price = NULL,
      pricing_mode = 'auto',
      discount_type = 'percentage',
      discount_value = 0,
      discount_amount = NULL,
      discount_percent = NULL,
      discount_enabled = 0,
      price_max = NULL,
      travel_policy = 'Travel charges may apply for event locations more than 30 km from the studio.',
      note = 'Travel charges may apply for event locations more than 30 km from the studio.',
      included_services_json = ?,
      features_json = ?,
      details_json = ?,
      display_order = 3,
      status = 'active'
    WHERE name = 'Diamond'
  `).run(json(diamondServices), json(diamondFeatures), JSON.stringify(diamondDetails));

  const rows = await db.prepare('SELECT id, name, price, original_price, discount_amount, discount_percent, status FROM packages WHERE status = "active" ORDER BY display_order ASC').all();
  console.log('✅ Updated packages in database:', JSON.stringify(rows, null, 2));
}

if (require.main === module) {
  updateStudioPackages()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { updateStudioPackages };
