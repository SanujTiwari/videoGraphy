import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Camera, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Filter, 
  Sliders
} from 'lucide-react';
import { apiRequest } from '../api';

const box = 'bg-white border border-gold-300/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6';
const inputClass = 'rounded-xl border border-gold-300/60 bg-white px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gold-400';
const labelClass = 'text-xs font-semibold text-charcoal-700 block mb-1';
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const AvailabilityManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('calendar'); // 'resources' | 'calendar' | 'blocks'
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'week'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);

  // Forms
  const [newTeam, setNewTeam] = useState({ name: '', team_type: 'photography', leader_name: '', leader_mobile: '', member_count: 2, notes: '' });
  const [newEquip, setNewEquip] = useState({ asset_id: '', name: '', category: 'camera', quantity: 1, condition: 'excellent', availability: 'available', notes: '', assigned_team_id: '' });
  const [newBlock, setNewBlock] = useState({ date: new Date().toISOString().split('T')[0], block_type: 'date', start_time: '10:00', end_time: '22:00', target_team_id: '', target_equipment_id: '', max_capacity: '', reason: '' });
  const [settingsForm, setSettingsForm] = useState({ daily_booking_capacity: 3, buffer_hours: 1.0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/availability/admin/overview');
      setOverview(data);
      if (data.settings) {
        setSettingsForm({
          daily_booking_capacity: data.settings.daily_booking_capacity || 3,
          buffer_hours: data.settings.buffer_hours || 1.0,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load availability overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- ACTIONS ---

  // Add Team
  const handleAddTeam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiRequest('/availability/admin/teams', { method: 'POST', body: JSON.stringify(newTeam) });
      setSuccess('Team registered successfully! ✓');
      setNewTeam({ name: '', team_type: 'photography', leader_name: '', leader_mobile: '', member_count: 2, notes: '' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle Team Status
  const handleToggleTeamStatus = async (team) => {
    try {
      const nextStatus = team.status === 'active' ? 'inactive' : 'active';
      await apiRequest(`/availability/admin/teams/${team.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add Equipment
  const handleAddEquipment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiRequest('/availability/admin/equipment', { method: 'POST', body: JSON.stringify(newEquip) });
      setSuccess('Equipment kit added successfully! ✓');
      setNewEquip({ asset_id: '', name: '', category: 'camera', quantity: 1, condition: 'excellent', availability: 'available', notes: '', assigned_team_id: '' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle Equipment Status
  const handleToggleEquipStatus = async (eq) => {
    try {
      const nextAvail = eq.availability === 'available' ? 'maintenance' : 'available';
      await apiRequest(`/availability/admin/equipment/${eq.id}`, { method: 'PATCH', body: JSON.stringify({ availability: nextAvail }) });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add Manual Block
  const handleAddBlock = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiRequest('/availability/admin/blocks', { method: 'POST', body: JSON.stringify(newBlock) });
      setSuccess('Manual block recorded successfully! ✓');
      setNewBlock({ date: selectedCalendarDate, block_type: 'date', start_time: '10:00', end_time: '22:00', target_team_id: '', target_equipment_id: '', max_capacity: '', reason: '' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete Block
  const handleDeleteBlock = async (id) => {
    try {
      await apiRequest(`/availability/admin/blocks/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Save Scheduling Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiRequest('/availability/admin/settings', { method: 'PATCH', body: JSON.stringify(settingsForm) });
      setSuccess('Capacity and buffer settings saved! ✓');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Calendar Calculations
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const curYear = currentMonth.getFullYear();
  const curMonthIdx = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(curYear, curMonthIdx);
  const firstDay = getFirstDayOfMonth(curYear, curMonthIdx); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format ISO YYYY-MM-DD
  const formatIsoDate = (d) => {
    const year = curYear;
    const month = String(curMonthIdx + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dateStats = (isoDate) => {
    if (!overview) return { approved: 0, pending: 0, isBlocked: false, remainingCap: 3 };

    const bookings = overview.bookings.filter((b) => b.event_date === isoDate);
    const approved = bookings.filter((b) => ['confirmed', 'in_progress', 'completed'].includes(b.booking_status));
    const pending = bookings.filter((b) => ['pending', 'under_review'].includes(b.booking_status));

    const isFullDayBlocked = overview.blocks.some((bl) => bl.date === isoDate && (bl.block_type === 'date' || !bl.block_type));
    const capBlock = overview.blocks.find((bl) => bl.date === isoDate && bl.block_type === 'capacity');
    const maxCap = capBlock?.max_capacity !== undefined && capBlock?.max_capacity !== null ? capBlock.max_capacity : (overview.settings.daily_booking_capacity || 3);
    const remainingCap = Math.max(0, maxCap - approved.length);

    return { approved: approved.length, pending: pending.length, isBlocked: isFullDayBlocked, remainingCap, maxCap, bookings };
  };

  if (loading && !overview) {
    return <p className="text-sm text-charcoal-500 py-8 text-center">Loading availability and resource system...</p>;
  }

  const selectedStats = dateStats(selectedCalendarDate);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold-200 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-charcoal-900">
            Resource-Based Availability Management
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Manage photography &amp; videography teams, camera/drone assets, multi-booking capacity, and manual blocks.
          </p>
        </div>

        <div className="flex bg-gold-50 border border-gold-300/60 rounded-full p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('calendar')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold transition ${
              activeSubTab === 'calendar' ? 'gold-gradient-bg text-white shadow-sm' : 'text-charcoal-700 hover:text-gold-700'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Availability Calendar
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('resources')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold transition ${
              activeSubTab === 'resources' ? 'gold-gradient-bg text-white shadow-sm' : 'text-charcoal-700 hover:text-gold-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Resource Management
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('blocks')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold transition ${
              activeSubTab === 'blocks' ? 'gold-gradient-bg text-white shadow-sm' : 'text-charcoal-700 hover:text-gold-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Manual Blocks &amp; Rules
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* ========================================================
          SUB-TAB A: RESOURCE MANAGEMENT
         ======================================================== */}
      {activeSubTab === 'resources' && (
        <div className="space-y-8">
          {/* 1. Teams Section */}
          <div className={box}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200/60 pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-charcoal-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold-600" /> Studio Production Teams
                </h3>
                <p className="text-xs text-charcoal-500">
                  Configured photography, videography, and aerial drone units.
                </p>
              </div>
            </div>

            {/* Teams Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.teams.map((team) => (
                <div key={team.id} className="bg-white border border-gold-300/50 rounded-2xl p-4 shadow-sm space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        team.team_type === 'photography' ? 'bg-blue-100 text-blue-800' :
                        team.team_type === 'videography' ? 'bg-purple-100 text-purple-800' :
                        team.team_type === 'drone' ? 'bg-amber-100 text-amber-800' : 'bg-gold-100 text-gold-800'
                      }`}>
                        {team.team_type}
                      </span>
                      <h4 className="font-serif font-bold text-charcoal-900 text-base mt-1">{team.name}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleTeamStatus(team)}
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        team.status === 'active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-charcoal-50 border-charcoal-200 text-charcoal-500'
                      }`}
                    >
                      {team.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="text-xs text-charcoal-600 space-y-1">
                    <p><b>Lead:</b> {team.leader_name || 'Unassigned'} ({team.leader_mobile || 'No Phone'})</p>
                    <p><b>Team Size:</b> {team.member_count} Crew members</p>
                    {team.notes && <p className="text-charcoal-500 italic text-[11px]">{team.notes}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Team Form */}
            <form onSubmit={handleAddTeam} className="bg-gold-50/40 border border-gold-200/60 rounded-2xl p-5 space-y-3">
              <h4 className="font-serif font-bold text-sm text-charcoal-900">Add New Production Team</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className={labelClass}>Team Name</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Gamma Photo Team"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Specialization</label>
                  <select
                    className={inputClass}
                    value={newTeam.team_type}
                    onChange={(e) => setNewTeam({ ...newTeam, team_type: e.target.value })}
                  >
                    <option value="photography">Photography</option>
                    <option value="videography">Videography</option>
                    <option value="drone">Drone Pilot Unit</option>
                    <option value="hybrid">Hybrid (Both)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Team Leader</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Rajesh Kumar"
                    value={newTeam.leader_name}
                    onChange={(e) => setNewTeam({ ...newTeam, leader_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Mobile No.</label>
                  <input
                    type="tel"
                    className={inputClass}
                    placeholder="+91 98765 00000"
                    value={newTeam.leader_mobile}
                    onChange={(e) => setNewTeam({ ...newTeam, leader_mobile: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 gold-gradient-bg text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Team
                </button>
              </div>
            </form>
          </div>

          {/* 2. Equipment Section */}
          <div className={box}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200/60 pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-charcoal-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gold-600" /> Equipment &amp; Kits Inventory
                </h3>
                <p className="text-xs text-charcoal-500">
                  Exclusive camera rigs, drone combos, and gimbals. Avoid double-booking across overlapping events.
                </p>
              </div>
            </div>

            {/* Equipment Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-charcoal-900 text-gold-300 uppercase">
                  <tr>
                    <th className="p-3">Asset ID</th>
                    <th className="p-3">Equipment Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Assigned Team</th>
                    <th className="p-3">Availability</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100 bg-white">
                  {overview.equipment.map((eq) => {
                    const assignedTeam = overview.teams.find((t) => t.id === eq.assigned_team_id);
                    return (
                      <tr key={eq.id} className="hover:bg-gold-50/40">
                        <td className="p-3 font-mono font-bold text-charcoal-800">{eq.asset_id}</td>
                        <td className="p-3 font-semibold text-charcoal-900">
                          {eq.name}
                          {eq.notes && <p className="text-[10px] text-charcoal-400 font-normal">{eq.notes}</p>}
                        </td>
                        <td className="p-3 capitalize font-medium">{eq.category}</td>
                        <td className="p-3 font-bold">{eq.quantity}</td>
                        <td className="p-3 text-charcoal-600">
                          {assignedTeam ? <span className="text-gold-700 font-semibold">{assignedTeam.name}</span> : 'Shared Studio Pool'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            eq.availability === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {eq.availability}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleEquipStatus(eq)}
                            className="text-xs text-gold-700 hover:underline font-semibold"
                          >
                            {eq.availability === 'available' ? 'Mark Maintenance' : 'Set Available'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Equipment Form */}
            <form onSubmit={handleAddEquipment} className="bg-gold-50/40 border border-gold-200/60 rounded-2xl p-5 space-y-3">
              <h4 className="font-serif font-bold text-sm text-charcoal-900">Add New Gear / Kit</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div>
                  <label className={labelClass}>Asset Tag / ID</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    placeholder="e.g. CAM-005"
                    value={newEquip.asset_id}
                    onChange={(e) => setNewEquip({ ...newEquip, asset_id: e.target.value })}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className={labelClass}>Gear / Kit Name</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Sony FX3 Rig B with Prime Lenses"
                    value={newEquip.name}
                    onChange={(e) => setNewEquip({ ...newEquip, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    className={inputClass}
                    value={newEquip.category}
                    onChange={(e) => setNewEquip({ ...newEquip, category: e.target.value })}
                  >
                    <option value="camera">Camera Kit</option>
                    <option value="drone">Aerial Drone</option>
                    <option value="gimbal">Gimbal Rig</option>
                    <option value="audio">Audio Setup</option>
                    <option value="lighting">Lighting Kit</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Dedicated Team (opt)</label>
                  <select
                    className={inputClass}
                    value={newEquip.assigned_team_id}
                    onChange={(e) => setNewEquip({ ...newEquip, assigned_team_id: e.target.value })}
                  >
                    <option value="">Shared Pool (All Teams)</option>
                    {overview.teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 gold-gradient-bg text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Kit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB B: AVAILABILITY CALENDAR VIEW
         ======================================================== */}
      {activeSubTab === 'calendar' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Monthly / Weekly Grid */}
          <div className={`lg:col-span-2 ${box}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200 pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-full hover:bg-gold-50 text-charcoal-700 border border-gold-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="font-serif text-xl font-bold text-charcoal-900">
                  {monthNames[curMonthIdx]} {curYear}
                </h3>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-full hover:bg-gold-50 text-charcoal-700 border border-gold-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Partially Booked
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Full / Blocked
                </span>
              </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-charcoal-400 py-2 border-b border-gold-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {/* Blank cells before 1st day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 rounded-xl bg-ivory-50/50"></div>
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const iso = formatIsoDate(dayNum);
                const stats = dateStats(iso);
                const isSelected = selectedCalendarDate === iso;

                let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                if (stats.isBlocked || stats.remainingCap === 0) {
                  badgeColor = 'bg-red-50 text-red-800 border-red-200';
                } else if (stats.approved > 0) {
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                }

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedCalendarDate(iso)}
                    className={`h-22 p-2 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'ring-2 ring-gold-500 border-gold-500 shadow-md bg-gold-50/30'
                        : 'border-gold-200/50 hover:bg-gold-50/40 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${isSelected ? 'text-gold-900' : 'text-charcoal-900'}`}>
                        {dayNum}
                      </span>
                      {stats.isBlocked ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                          Closed
                        </span>
                      ) : (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${badgeColor}`}>
                          {stats.remainingCap} slots
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 text-[10px]">
                      {stats.approved > 0 && (
                        <p className="font-semibold text-emerald-700 truncate">
                          ✓ {stats.approved} confirmed
                        </p>
                      )}
                      {stats.pending > 0 && (
                        <p className="font-semibold text-amber-600 truncate">
                          ⏳ {stats.pending} pending
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Col: Selected Date Timeline & Resource Breakdown */}
          <div className={box}>
            <div className="border-b border-gold-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-600">Date Inspector</span>
              <h3 className="font-serif text-2xl font-bold text-charcoal-900 mt-1">
                {selectedCalendarDate}
              </h3>
              <p className="text-xs text-charcoal-500">
                {selectedStats.isBlocked
                  ? 'This date is completely closed by admin block.'
                  : `${selectedStats.remainingCap} of ${selectedStats.maxCap} booking capacity available.`}
              </p>
            </div>

            {/* Bookings on this date */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Events on this Date ({selectedStats.bookings.length})
              </h4>

              {selectedStats.bookings.length === 0 ? (
                <p className="text-xs text-charcoal-400 italic py-4">No events booked on this date.</p>
              ) : (
                <div className="space-y-2.5">
                  {selectedStats.bookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookingModal(b)}
                      className="cursor-pointer p-3 rounded-2xl border border-gold-200 bg-gold-50/20 hover:bg-gold-50/60 transition space-y-1.5"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs font-bold text-gold-800">{b.booking_ref}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          ['confirmed', 'in_progress', 'completed'].includes(b.booking_status)
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.booking_status}
                        </span>
                      </div>
                      <p className="font-bold text-charcoal-900 text-xs">{b.customer_name} ({b.event_type})</p>
                      <p className="text-[11px] text-charcoal-600">
                        🕒 {b.event_start_time || '10:00'} - {b.event_end_time || '22:00'} · 📍 {b.venue}
                      </p>
                      {b.allocated_resources && b.allocated_resources.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {b.allocated_resources.map((res, i) => (
                            <span key={i} className="text-[9px] bg-white border border-gold-300/60 px-1.5 py-0.5 rounded font-medium text-charcoal-700">
                              {res.resource_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Block on this date */}
            <div className="pt-3 border-t border-gold-200 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setNewBlock((prev) => ({ ...prev, date: selectedCalendarDate, block_type: 'date' }));
                  setActiveSubTab('blocks');
                }}
                className="w-full py-2.5 rounded-xl border border-gold-400 text-gold-700 hover:bg-gold-50 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Block this Date / Time Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB C: MANUAL BLOCKS & STUDIO RULES
         ======================================================== */}
      {activeSubTab === 'blocks' && (
        <div className="space-y-8">
          {/* Scheduling Rules & Capacity */}
          <div className={box}>
            <h3 className="font-serif text-xl font-bold text-charcoal-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-gold-600" /> Studio Capacity &amp; Booking Buffer Rules
            </h3>
            <form onSubmit={handleSaveSettings} className="grid sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className={labelClass}>Default Daily Bookings Limit</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className={inputClass}
                  value={settingsForm.daily_booking_capacity}
                  onChange={(e) => setSettingsForm({ ...settingsForm, daily_booking_capacity: e.target.value })}
                />
                <p className="text-[11px] text-charcoal-500 mt-1">Allows multi-booking up to this limit per day.</p>
              </div>
              <div>
                <label className={labelClass}>Setup &amp; Travel Buffer (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className={inputClass}
                  value={settingsForm.buffer_hours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, buffer_hours: e.target.value })}
                />
                <p className="text-[11px] text-charcoal-500 mt-1">Buffer time required between events for teams/gear.</p>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 gold-gradient-bg text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Save Scheduling Rules
              </button>
            </form>
          </div>

          {/* Manual Blocks Management */}
          <div className={box}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200/60 pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-charcoal-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-gold-600" /> Active Manual Blocks
                </h3>
                <p className="text-xs text-charcoal-500">
                  Blocks remain persistent and independent of booking cancellations.
                </p>
              </div>
            </div>

            {/* Existing Blocks List */}
            <div className="space-y-2.5">
              {overview.blocks.length === 0 ? (
                <p className="text-xs text-charcoal-400 py-3 italic">No manual blocks active.</p>
              ) : (
                overview.blocks.map((bl) => (
                  <div key={bl.id} className="p-3 rounded-2xl border border-gold-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-charcoal-900">📅 {bl.date}</span>
                        <span className="px-2 py-0.5 rounded-full bg-gold-100 text-gold-800 font-semibold uppercase text-[10px]">
                          {bl.block_type || 'Full Date'}
                        </span>
                        {bl.start_time && bl.end_time && (
                          <span className="text-charcoal-500">({bl.start_time} - {bl.end_time})</span>
                        )}
                        {bl.target_team_name && (
                          <span className="text-purple-700 font-semibold">Team: {bl.target_team_name}</span>
                        )}
                        {bl.target_equipment_name && (
                          <span className="text-blue-700 font-semibold">Kit: {bl.target_equipment_name}</span>
                        )}
                        {bl.max_capacity !== null && bl.max_capacity !== undefined && (
                          <span className="text-amber-700 font-semibold">Cap Limit: {bl.max_capacity}</span>
                        )}
                      </div>
                      <p className="text-charcoal-600 text-[11px] mt-1">Reason: {bl.reason || 'Not specified'}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(bl.id)}
                      className="px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-xs"
                    >
                      Remove Block
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Create Manual Block Form */}
            <form onSubmit={handleAddBlock} className="bg-gold-50/40 border border-gold-200/60 rounded-2xl p-5 space-y-4">
              <h4 className="font-serif font-bold text-sm text-charcoal-900">Add New Manual Block</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <label className={labelClass}>Target Date</label>
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={newBlock.date}
                    onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Block Type</label>
                  <select
                    className={inputClass}
                    value={newBlock.block_type}
                    onChange={(e) => setNewBlock({ ...newBlock, block_type: e.target.value })}
                  >
                    <option value="date">Full Day Closed</option>
                    <option value="time_slot">Specific Time Slot</option>
                    <option value="team">Individual Team Block</option>
                    <option value="equipment">Particular Equipment Kit</option>
                    <option value="capacity">Custom Daily Capacity Limit</option>
                  </select>
                </div>

                {newBlock.block_type === 'time_slot' && (
                  <>
                    <div>
                      <label className={labelClass}>Start Time</label>
                      <input
                        type="time"
                        className={inputClass}
                        value={newBlock.start_time}
                        onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>End Time</label>
                      <input
                        type="time"
                        className={inputClass}
                        value={newBlock.end_time}
                        onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {newBlock.block_type === 'team' && (
                  <div>
                    <label className={labelClass}>Select Team</label>
                    <select
                      className={inputClass}
                      value={newBlock.target_team_id}
                      onChange={(e) => setNewBlock({ ...newBlock, target_team_id: e.target.value })}
                    >
                      <option value="">Choose Team</option>
                      {overview.teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newBlock.block_type === 'equipment' && (
                  <div>
                    <label className={labelClass}>Select Equipment</label>
                    <select
                      className={inputClass}
                      value={newBlock.target_equipment_id}
                      onChange={(e) => setNewBlock({ ...newBlock, target_equipment_id: e.target.value })}
                    >
                      <option value="">Choose Gear Kit</option>
                      {overview.equipment.map((eq) => (
                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.asset_id})</option>
                      ))}
                    </select>
                  </div>
                )}

                {newBlock.block_type === 'capacity' && (
                  <div>
                    <label className={labelClass}>Max Capacity for this Date</label>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      placeholder="e.g. 1"
                      value={newBlock.max_capacity}
                      onChange={(e) => setNewBlock({ ...newBlock, max_capacity: e.target.value })}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className={labelClass}>Reason / Note</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Festival, VIP Private Booking, Gear Servicing"
                    value={newBlock.reason}
                    onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 gold-gradient-bg text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Inspector Modal */}
      {selectedBookingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedBookingModal(null)}
        >
          <div
            className="bg-white border border-gold-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-gold-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-gold-800">
                  {selectedBookingModal.booking_ref}
                </span>
                <h3 className="font-serif text-xl font-bold text-charcoal-900 mt-1">
                  {selectedBookingModal.customer_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingModal(null)}
                className="text-charcoal-400 hover:text-charcoal-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 text-charcoal-700 bg-gold-50/40 p-4 rounded-2xl border border-gold-200">
              <p><b>Event:</b> {selectedBookingModal.event_type} ({selectedBookingModal.package_name})</p>
              <p><b>Date &amp; Time:</b> {selectedBookingModal.event_date} ({selectedBookingModal.event_start_time || '10:00'} - {selectedBookingModal.event_end_time || '22:00'})</p>
              <p><b>Venue:</b> {selectedBookingModal.venue}</p>
              <p><b>Contact:</b> {selectedBookingModal.customer_mobile}</p>
              <p><b>Status:</b> <span className="font-bold capitalize">{selectedBookingModal.booking_status}</span></p>
            </div>

            {selectedBookingModal.allocated_resources && selectedBookingModal.allocated_resources.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-charcoal-700">Assigned Studio Resources</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedBookingModal.allocated_resources.map((r, i) => (
                    <div key={i} className="p-2 rounded-xl bg-charcoal-50 border border-charcoal-200 text-charcoal-800">
                      <span className="text-[10px] uppercase font-bold text-gold-600 block">{r.resource_type}</span>
                      <span className="font-semibold">{r.resource_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-right pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingModal(null)}
                className="px-5 py-2 rounded-full border border-gold-300 text-xs font-bold text-charcoal-700 hover:bg-gold-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
