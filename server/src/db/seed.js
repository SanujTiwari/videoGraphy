const bcryptjs = require("bcryptjs");
const { connectDB, db } = require("./database");
const json = (v) => JSON.stringify(v ?? []);
const NOTE_30KM = 'More than 30 km from our studio may incur additional charges.';
// Silver / Gold / Diamond. original_price, discount_amount and discount_percent are
// intentionally null: set them (here or via the admin API) to show strike-through / savings.
const STUDIO_PACKAGES = [
    {
        name: 'Silver',
        badge: 'Entry Package',
        price: 22000,
        price_max: null,
        description: 'Essential traditional wedding coverage with a printed album, delivered beautifully.',
        coverage_hours: 96,
        note: NOTE_30KM,
        included_services: ['Traditional Video', 'Traditional Photo'],
        details: { tier: 'Basic wedding coverage', days: '4 Days Coverage', album: '20 Pages Album, 12×36 (120–130 photos)', pendrive: '1 Pendrive, 32 GB', drone: 'Not included' },
        features: [
            'Traditional Video',
            'Traditional Photo',
            '1 Reel Video / Highlight Video',
            '20 Pages Album, Size 12×36',
            '120–130 Photos in Album',
            'Full HD Video',
            '1 Pendrive, 32 GB',
            '4 Days Coverage',
        ],
    },
    {
        name: 'Gold',
        badge: 'Most Popular',
        price: 30000,
        price_max: null,
        description: 'Cinematic storytelling with gimbal, baraat drone and a larger album.',
        coverage_hours: 96,
        note: NOTE_30KM,
        included_services: ['Traditional Video', 'Traditional Photo', 'Cinematic Teaser'],
        details: { tier: 'Silver + cinematic content, gimbal, drone & larger album', days: '4 Days Coverage', album: '30 Pages Album, 14×40 (180–200 photos)', pendrive: '1 Pendrive, 64 GB', drone: '1 Day Drone Shoot (Baraat)' },
        features: [
            'Traditional Video',
            'Traditional Photo',
            '1 Haldi Reel Video',
            '1 Mehndi Reel Video',
            '1 Cinematic Wedding Teaser',
            '30 Pages Album, Size 14×40',
            '180–200 Photos in Album',
            'Video with Gimbal Shoot',
            '1 Day Drone Shoot (Baraat)',
            '4 Days Coverage',
            '1 Pendrive, 64 GB',
        ],
    },
    {
        name: 'Diamond',
        badge: 'Ultimate Package',
        price: 40000,
        price_max: null,
        description: 'Our most complete collection: cinematic and candid photography, frames and a wedding highlight film.',
        coverage_hours: 96,
        note: null,
        included_services: ['Traditional Video', 'Cinematic Photo', 'Candid Photography', 'Wedding Highlight Video'],
        details: { tier: 'Gold + cinematic/candid photography, more photos, frames, reels & highlight', days: '4 Days Coverage', album: '35 Pages Album, 14×40 (220–230 photos)', pendrive: '1 Pendrive, 64 GB', drone: '1 Day Drone Shoot (Baraat)' },
        features: [
            'Traditional Video',
            'Cinematic Photo',
            'Candid Photography',
            '35 Pages Album, Size 14×40',
            '220–230 Photos in Album',
            'Cinematic Haldi Reel',
            'Cinematic Mehndi Reel',
            'Cinematic Wedding Teaser',
            '4 Reel Videos',
            'Wedding Highlight Video',
            'Gimbal Shoot Video',
            '1 Day Drone Shoot (Baraat)',
            '10 Photo Frames, 2×3 Feet',
            '1 Pendrive, 64 GB',
            '4 Days Coverage',
        ],
    },
];
// One-time migration: replaces legacy packages (Bronze etc.) with the three studio packages.
async function syncStudioPackages() {
    const migrated = await db.prepare(`SELECT COUNT(*) as count FROM packages WHERE details_json IS NOT NULL AND status = 'active'`).get();
    if (migrated.count > 0)
        return;
    await db.prepare(`UPDATE packages SET status = 'archived'`).run();
    const insert = db.prepare(`
    INSERT INTO packages (name, badge, price, price_max, original_price, discount_amount, discount_percent, description, coverage_hours, note, included_services_json, features_json, details_json)
    VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?)
  `);
    for (const p of STUDIO_PACKAGES) {
        await insert.run(p.name, p.badge, p.price, p.price_max, p.description, p.coverage_hours, p.note, json(p.included_services), json(p.features), JSON.stringify(p.details));
    }
    console.log('✅ Silver, Gold & Diamond packages synced');
}
async function seedDatabase() {
    await connectDB();
    await syncStudioPackages();
    console.log('Seeding initial data for Anmol VideoGraphy...');
    const existing = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (existing.count > 0) {
        console.log('✅ Database already populated with seed data.');
        return;
    }
    const salt = bcryptjs.genSaltSync(10);
    const adminPassword = bcryptjs.hashSync('admin123', salt);
    const managerPassword = bcryptjs.hashSync('manager123', salt);
    const customerPassword = bcryptjs.hashSync('customer123', salt);
    const insertUser = db.prepare('INSERT INTO users (email, password_hash, full_name, mobile, role, permissions) VALUES (?, ?, ?, ?, ?, ?)');
    await insertUser.run('sanujvirat@gmail.com', adminPassword, '@Anmol838381', '+91 8383813876', 'owner', json(['all']));
    await insertUser.run('sanujt09@gmail.com', managerPassword, '@Dhananjay838381', '+91 8383813876', 'manager', json(['bookings', 'customers', 'schedule', 'deliveries']));
    await insertUser.run('priya.verma@gmail.com', customerPassword, 'Priya & Rahul Verma', '+91 98123 45678', 'customer', json(['view_bookings']));
    console.log('✅ Users seeded successfully');
    await db.prepare(`
    INSERT INTO studio_settings (name, tagline, email, mobile, whatsapp_number, address, cancellation_policy, tax_rate, advance_percentage, manager_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Anmol VideoGraphy', 'Capturing Eternal Memories with Cinematic Elegance', 'contact@anmolvideography.com', '+91 98765 43210', '+91 98765 43210', '101 Royal Wedding Square, Studio Road, City Center', 'Cancellations before 30 days get 80% advance refund. Within 15-30 days gets 50% refund. Under 15 days, advance is non-refundable.', 18.0, 30.0, 'manager@anmolvideography.com');
    console.log('✅ Studio Settings seeded successfully');
    // Packages are managed by syncStudioPackages() above.
    const services = [
        {
            title: 'Wedding Photography',
            category: 'Photography',
            description: 'Capture raw emotions, magical moments, and royal ritual portraits with our senior candid photographers.',
            starting_price: 25000,
            duration_hours: 8,
            image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
            features: ['High-resolution candid photography', 'Lighting setup', 'Traditional ceremony portraits', 'Color grading'],
            available_add_ons: ['Extra Photographer', 'Same-day Slideshow Display']
        },
        {
            title: 'Wedding Cinematography',
            category: 'Videography',
            description: 'Breathtaking 4K film production with cinema lenses, color grading, custom soundtrack design, and teaser trailers.',
            starting_price: 35000,
            duration_hours: 8,
            image_url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80',
            features: ['4K Cinema Camera Rig', 'Gimbal stabilization', 'Audio recording rigs', 'Color correction & sound mixing'],
            available_add_ons: ['Cinematic Reel (60s)', 'Raw Footage HDD']
        },
        {
            title: 'Pre-Wedding Cinematic Films',
            category: 'Pre-Wedding',
            description: 'Romantic story-driven pre-wedding films shot at scenic heritage resorts, beaches, or royal palaces.',
            starting_price: 30000,
            duration_hours: 10,
            image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
            features: ['Storyboarding & Concept Design', 'Drone shots included', '3 Outfit changes', 'Teaser trailer'],
            available_add_ons: ['Make-up artist', 'Props package']
        },
        {
            title: 'Drone Photography & Videography',
            category: 'Aerial',
            description: 'Stunning 4K aerial drone coverage capturing venue splendour, grand baraat entries, and outdoor aesthetics.',
            starting_price: 15000,
            duration_hours: 4,
            image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
            features: ['Licensed Drone Operator', '4K HDR Video', 'High-altitude panoramic venue shots'],
            available_add_ons: ['Dual Drone Setup', 'Night flight permits']
        },
        {
            title: 'Wedding Live Streaming',
            category: 'Streaming',
            description: 'Seamless multi-camera YouTube / Zoom / Private Web streaming for family and friends watching globally.',
            starting_price: 18000,
            duration_hours: 6,
            image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
            features: ['Multi-Cam Audio Switcher', 'High-speed 5G bonded internet', 'Private protected link'],
            available_add_ons: ['Interactive Guest Chat', 'Full Recording Archive']
        },
        {
            title: 'LED Wall & Screen Services',
            category: 'Display',
            description: 'Ultra-HD P3 LED video walls for live event display, Baraat streams, and instant photo slide playback.',
            starting_price: 22000,
            duration_hours: 6,
            image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
            features: ['8x12 ft P3 HD LED Screen', 'Live Video Switcher', 'Technician on-site'],
            available_add_ons: ['Additional LED screens', 'Custom visual animations']
        }
    ];
    const insertService = db.prepare(`
    INSERT INTO services (title, category, description, starting_price, duration_hours, image_url, features_json, available_add_ons_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    for (const s of services) {
        await insertService.run(s.title, s.category, s.description, s.starting_price, s.duration_hours, s.image_url, json(s.features), json(s.available_add_ons));
    }
    console.log('✅ Services seeded successfully');
    console.log('✅ Anmol VideoGraphy database successfully seeded with initial packages, services & settings!');
}
// Allow running this directly
if (require.main === module) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('❌ Error seeding database:', err);
            process.exit(1);
        });
}

module.exports = { seedDatabase };
