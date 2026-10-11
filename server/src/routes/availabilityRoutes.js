const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const { checkAvailability, APPROVED_STATUSES } = require("../services/availabilityService");

const router = Router();

// GET /api/availability - Public availability calendar check
router.get('/', async (req, res) => {
    const blockedDates = await db.prepare('SELECT * FROM availability_blocks ORDER BY date ASC').all();
    const studio = await db.prepare('SELECT daily_booking_capacity FROM studio_settings LIMIT 1').get() || {};
    const maxCapacity = studio.daily_booking_capacity || 3;

    // Both approved and pending bookings for public transparency / capacity calculations
    const approvedMarks = APPROVED_STATUSES.map(() => '?').join(',');
    const bookedEvents = await db.prepare(`
        SELECT id, event_date, event_start_time, event_end_time, booking_ref, event_type, package_name, booking_status
        FROM bookings
        WHERE booking_status IN (${approvedMarks})
        ORDER BY event_date ASC, event_start_time ASC
    `).all(...APPROVED_STATUSES);

    return res.json({
        blocked_dates: blockedDates,
        booked_events: bookedEvents,
        daily_capacity: maxCapacity,
    });
});

// GET /api/availability/check - Real-time slot & resource availability checker
router.get('/check', async (req, res) => {
    try {
        const { date, start_time, end_time, package_id } = req.query;
        if (!date) return res.status(400).json({ error: 'Date is required.' });

        const result = await checkAvailability({
            date,
            startTime: start_time || '10:00',
            endTime: end_time || '22:00',
            packageId: package_id ? Number(package_id) : null,
        });

        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ---------------- ADMIN ENDPOINTS (Owner / Manager) ----------------

// GET /api/availability/admin/overview - Full admin view with teams, equipment, blocks, and detailed bookings
router.get('/admin/overview', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const teams = await db.prepare('SELECT * FROM studio_teams ORDER BY id ASC').all();
    const equipment = await db.prepare('SELECT * FROM equipment ORDER BY category ASC, id ASC').all();
    const blocks = await db.prepare(`
        SELECT ab.*, 
               st.name as target_team_name, 
               eq.name as target_equipment_name, eq.asset_id as target_equipment_asset
        FROM availability_blocks ab
        LEFT JOIN studio_teams st ON ab.target_team_id = st.id
        LEFT JOIN equipment eq ON ab.target_equipment_id = eq.id
        ORDER BY ab.date ASC, ab.id DESC
    `).all();

    const studio = await db.prepare('SELECT daily_booking_capacity, buffer_hours, studio_timezone FROM studio_settings LIMIT 1').get() || {};

    const bookings = await db.prepare(`
        SELECT b.id, b.booking_ref, b.customer_name, b.customer_mobile, b.event_type, 
               b.package_name, b.event_date, b.event_start_time, b.event_end_time, 
               b.venue, b.total_amount, b.booking_status, b.payment_status,
               COALESCE((
                 SELECT json_agg(json_build_object(
                   'resource_type', bra.resource_type,
                   'resource_id', bra.resource_id,
                   'resource_name', bra.resource_name
                 ))
                 FROM booking_resource_allocations bra
                 WHERE bra.booking_id = b.id AND bra.status = 'allocated'
               ), '[]'::json) as allocated_resources
        FROM bookings b
        WHERE b.booking_status != 'cancelled'
        ORDER BY b.event_date ASC, b.event_start_time ASC
    `).all();

    return res.json({
        teams,
        equipment,
        blocks,
        bookings,
        settings: {
            daily_booking_capacity: studio.daily_booking_capacity || 3,
            buffer_hours: studio.buffer_hours || 1.0,
            timezone: studio.studio_timezone || 'Asia/Kolkata',
        },
    });
});

// --- TEAM MANAGEMENT ---

// POST /api/availability/admin/teams - Create new team
router.post('/admin/teams', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, team_type, leader_name, leader_mobile, member_count, notes } = req.body;
    if (!name || !team_type) return res.status(400).json({ error: 'Team name and team type are required.' });

    try {
        const stmt = db.prepare(`
            INSERT INTO studio_teams (name, team_type, leader_name, leader_mobile, member_count, status, notes)
            VALUES (?, ?, ?, ?, ?, 'active', ?)
        `);
        const result = await stmt.run(name, team_type, leader_name || null, leader_mobile || null, Number(member_count) || 2, notes || null);
        return res.status(201).json({ message: 'Team created successfully', id: Number(result.lastInsertRowid) });
    } catch (err) {
        return res.status(400).json({ error: err.message.includes('unique') ? 'Team name already exists.' : err.message });
    }
});

// PATCH /api/availability/admin/teams/:id - Update team
router.patch('/admin/teams/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, team_type, leader_name, leader_mobile, member_count, status, notes } = req.body;
    await db.prepare(`
        UPDATE studio_teams SET
            name = COALESCE(?, name),
            team_type = COALESCE(?, team_type),
            leader_name = COALESCE(?, leader_name),
            leader_mobile = COALESCE(?, leader_mobile),
            member_count = COALESCE(?, member_count),
            status = COALESCE(?, status),
            notes = COALESCE(?, notes)
        WHERE id = ?
    `).run(name, team_type, leader_name, leader_mobile, member_count ? Number(member_count) : null, status, notes, req.params.id);

    return res.json({ message: 'Team updated successfully' });
});

// DELETE /api/availability/admin/teams/:id - Delete team
router.delete('/admin/teams/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        await db.prepare("DELETE FROM studio_teams WHERE id = ?").run(req.params.id);
        return res.json({ message: 'Team deleted successfully' });
    } catch (err) {
        // If referenced by past allocation, mark inactive safely
        await db.prepare("UPDATE studio_teams SET status = 'inactive' WHERE id = ?").run(req.params.id);
        return res.json({ message: 'Team marked inactive' });
    }
});

// --- EQUIPMENT MANAGEMENT ---

// POST /api/availability/admin/equipment - Add equipment asset
router.post('/admin/equipment', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { asset_id, name, category, quantity, condition, availability, assigned_team_id, notes } = req.body;
    if (!asset_id || !name || !category) return res.status(400).json({ error: 'Asset ID, name, and category are required.' });

    try {
        const stmt = db.prepare(`
            INSERT INTO equipment (asset_id, name, category, quantity, condition, availability, assigned_team_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = await stmt.run(
            asset_id,
            name,
            category,
            Number(quantity) || 1,
            condition || 'excellent',
            availability || 'available',
            assigned_team_id ? Number(assigned_team_id) : null,
            notes || null
        );
        return res.status(201).json({ message: 'Equipment added successfully', id: Number(result.lastInsertRowid) });
    } catch (err) {
        return res.status(400).json({ error: err.message.includes('unique') ? 'Asset ID already exists.' : err.message });
    }
});

// PATCH /api/availability/admin/equipment/:id - Update equipment asset
router.patch('/admin/equipment/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, category, quantity, condition, availability, assigned_team_id, notes } = req.body;
    await db.prepare(`
        UPDATE equipment SET
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            quantity = COALESCE(?, quantity),
            condition = COALESCE(?, condition),
            availability = COALESCE(?, availability),
            assigned_team_id = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
    `).run(
        name,
        category,
        quantity ? Number(quantity) : null,
        condition,
        availability,
        assigned_team_id !== undefined ? (assigned_team_id ? Number(assigned_team_id) : null) : null,
        notes,
        req.params.id
    );

    return res.json({ message: 'Equipment updated successfully' });
});

// DELETE /api/availability/admin/equipment/:id - Delete equipment asset
router.delete('/admin/equipment/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        await db.prepare("DELETE FROM equipment WHERE id = ?").run(req.params.id);
        return res.json({ message: 'Equipment kit deleted successfully' });
    } catch (err) {
        // If referenced by past allocation, mark retired
        await db.prepare("UPDATE equipment SET availability = 'maintenance' WHERE id = ?").run(req.params.id);
        return res.json({ message: 'Equipment kit marked in maintenance' });
    }
});

// --- MANUAL BLOCKS (Date, Time Slot, Team, Equipment, Capacity) ---

// POST /api/availability/admin/blocks - Create manual block
router.post('/admin/blocks', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { date, block_type, start_time, end_time, target_team_id, target_equipment_id, max_capacity, reason } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required (YYYY-MM-DD).' });

    const type = block_type || 'date';
    try {
        const stmt = db.prepare(`
            INSERT INTO availability_blocks (
                date, reason, created_by, block_type, start_time, end_time, 
                target_team_id, target_equipment_id, max_capacity
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await stmt.run(
            date,
            reason || 'Studio Block',
            req.user?.full_name || 'Manager',
            type,
            start_time || null,
            end_time || null,
            target_team_id ? Number(target_team_id) : null,
            target_equipment_id ? Number(target_equipment_id) : null,
            max_capacity !== undefined && max_capacity !== '' ? Number(max_capacity) : null
        );

        return res.status(201).json({ message: `Manual block created successfully on ${date}.` });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// DELETE /api/availability/admin/blocks/:id - Delete manual block
router.delete('/admin/blocks/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    await db.prepare('DELETE FROM availability_blocks WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Manual block removed successfully.' });
});

// PATCH /api/availability/admin/settings - Update capacity and buffer settings
router.patch('/admin/settings', authenticateToken, requireRole(['owner']), async (req, res) => {
    const { daily_booking_capacity, buffer_hours, studio_timezone } = req.body;
    await db.prepare(`
        UPDATE studio_settings SET
            daily_booking_capacity = COALESCE(?, daily_booking_capacity),
            buffer_hours = COALESCE(?, buffer_hours),
            studio_timezone = COALESCE(?, studio_timezone)
        WHERE id = 1
    `).run(
        daily_booking_capacity ? Number(daily_booking_capacity) : null,
        buffer_hours ? Number(buffer_hours) : null,
        studio_timezone || null
    );

    return res.json({ message: 'Studio scheduling settings updated successfully.' });
});

module.exports = router;
