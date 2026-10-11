const { types, Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();
// Return BIGINT (COUNT/SUM) and NUMERIC as JS numbers instead of strings
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => parseFloat(v));
let pool = null;
function getPool() {
    if (!pool) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            console.error('❌ DATABASE_URL is missing in the .env file');
            throw new Error('Neon PostgreSQL connection string (DATABASE_URL) is not configured');
        }
        pool = new Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 15000 });
        pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error:', err.message));
    }
    return pool;
}
// Translate the SQLite-style SQL used by the routes into PostgreSQL
function toPg(sql) {
    let i = 0;
    return sql
        .replace(/"([^"]*)"/g, "'$1'")
        .replace(/\bLIKE\b/gi, 'ILIKE')
        .replace(/\?/g, () => `$${++i}`);
}
const clean = (params) => params.map((p) => (p === undefined ? null : p));
const db = {
    prepare(sql) {
        const text = toPg(sql);
        return {
            async get(...params) {
                const r = await getPool().query(text, clean(params));
                return r.rows[0];
            },
            async all(...params) {
                const r = await getPool().query(text, clean(params));
                return r.rows;
            },
            async run(...params) {
                const isInsert = /^\s*INSERT/i.test(text) && !/\bRETURNING\b/i.test(text);
                const r = await getPool().query(isInsert ? `${text} RETURNING id` : text, clean(params));
                return { lastInsertRowid: r.rows[0]?.id, changes: r.rowCount ?? 0 };
            },
        };
    },
};
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  permissions TEXT,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS studio_settings (
  id SERIAL PRIMARY KEY,
  name TEXT DEFAULT 'Anmol VideoGraphy',
  tagline TEXT DEFAULT 'Capturing Eternal Memories with Cinematic Elegance',
  email TEXT DEFAULT 'contact@anmolvideography.com',
  mobile TEXT DEFAULT '+91 98765 43210',
  whatsapp_number TEXT DEFAULT '+91 98765 43210',
  address TEXT DEFAULT '101 Royal Wedding Square, Studio Road, City Center',
  cancellation_policy TEXT,
  tax_rate DOUBLE PRECISION DEFAULT 18,
  advance_percentage DOUBLE PRECISION DEFAULT 30,
  manager_email TEXT DEFAULT 'manager@anmolvideography.com'
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  starting_price DOUBLE PRECISION NOT NULL,
  duration_hours DOUBLE PRECISION DEFAULT 6,
  image_url TEXT NOT NULL,
  features_json TEXT,
  available_add_ons_json TEXT,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  badge TEXT,
  price DOUBLE PRECISION NOT NULL,
  original_price DOUBLE PRECISION,
  description TEXT NOT NULL,
  coverage_hours DOUBLE PRECISION NOT NULL,
  included_services_json TEXT,
  features_json TEXT,
  is_customizable INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

ALTER TABLE packages ADD COLUMN IF NOT EXISTS price_max DOUBLE PRECISION;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_percent DOUBLE PRECISION;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS details_json TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS pricing_mode TEXT DEFAULT 'auto';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_value DOUBLE PRECISION DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_enabled INTEGER DEFAULT 1;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_start_date TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_end_date TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS travel_policy TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS extra_travel_charge TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS advance_percentage DOUBLE PRECISION DEFAULT 30;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS add_ons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  unit_name TEXT DEFAULT 'per session',
  description TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_ref TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  event_type TEXT NOT NULL,
  package_id INTEGER,
  package_name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_start_time TEXT DEFAULT '10:00',
  event_end_time TEXT DEFAULT '22:00',
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  guest_count INTEGER,
  special_requirements TEXT,
  total_amount DOUBLE PRECISION NOT NULL,
  advance_amount DOUBLE PRECISION NOT NULL,
  remaining_amount DOUBLE PRECISION NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  booking_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DOUBLE PRECISION NOT NULL,
  total_price DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by_name TEXT DEFAULT 'System',
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  target TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  extra TEXT,
  attempts INTEGER DEFAULT 0,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Wedding',
  image_url TEXT NOT NULL,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_email TEXT;
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;

CREATE TABLE IF NOT EXISTS availability_blocks (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT 'Fully Booked / Studio Closed',
  created_by TEXT DEFAULT 'Manager'
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_ref TEXT NOT NULL UNIQUE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  payment_method TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  notes TEXT,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  advance_paid DOUBLE PRECISION NOT NULL,
  balance_due DOUBLE PRECISION NOT NULL,
  tax_amount DOUBLE PRECISION DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued',
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT NOT NULL,
  role TEXT NOT NULL,
  skills_json TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS staff_assignments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role_assigned TEXT NOT NULL,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'excellent',
  availability TEXT DEFAULT 'available',
  purchase_date TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  price DOUBLE PRECISION NOT NULL,
  supplier TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'new_booking',
  is_read INTEGER DEFAULT 0,
  payload_json TEXT,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'delivered',
  attempt_count INTEGER DEFAULT 1,
  last_error TEXT,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER,
  customer_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL,
  comment TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_featured INTEGER DEFAULT 0,
  reply TEXT,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL,
  discount_value DOUBLE PRECISION NOT NULL,
  min_booking_value DOUBLE PRECISION DEFAULT 0,
  start_date TEXT,
  expiry_date TEXT,
  max_uses INTEGER DEFAULT 100,
  current_uses INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS media_deliveries (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  media_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  access_token TEXT NOT NULL UNIQUE,
  expires_at TEXT,
  download_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
);
`;
async function connectDB() {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await getPool().query(SCHEMA);
            console.log('✅ Connected to Neon PostgreSQL and verified schema');
            return;
        }
        catch (err) {
            if (!process.env.DATABASE_URL)
                throw err;
            console.error(`❌ PostgreSQL connection failed (attempt ${attempt}/${maxRetries}):`, err.message);
            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }
    throw new Error('Could not connect to Neon PostgreSQL after 3 attempts. Check DATABASE_URL.');
}
// Alias for backward compatibility

module.exports = { connectDB, initDatabase: connectDB, db };
