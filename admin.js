// =============================================
// 1. CONFIGURATION & INIT
// =============================================

// REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT DETAILS
const SUPABASE_URL = 'https://aggqmjxhnsbmsymwblqg.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ3FtanhobnNibXN5bXdibHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjQ0NTgsImV4cCI6MjA3ODk0MDQ1OH0.YZmrw7-LtIjlvTkU0c7G8qZ2VDNO8PeHudkGVo1PQ8Q';

// FIX: Use a different variable name to avoid conflict with the global 'supabase' library
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnia8lb2q/image/upload';
const CLOUDINARY_PRESET = 'EcoBirla_avatars';

// Global State
let currentUser = null;
let charts = { traffic: null, actions: null, distribution: null };

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await checkAdminSession();
});

// Check Session
async function checkAdminSession() {
    const { data: { session } } = await sbClient.auth.getSession();
    
    if (!session) {
        document.getElementById('login-overlay').classList.remove('hidden');
        return;
    }

    // Verify Admin Role
    const { data: user, error } = await sbClient
        .from('users')
        .select('role, full_name')
        .eq('auth_user_id', session.user.id)
        .single();

    if (error || user?.role !== 'admin') {
        console.error("Auth Error:", error);
        document.getElementById('login-msg').textContent = "Access Denied: Not an Admin account.";
        await sbClient.auth.signOut();
        document.getElementById('login-overlay').classList.remove('hidden');
        return;
    }

    currentUser = user;
    document.getElementById('admin-name-display').textContent = user.full_name;
    document.getElementById('login-overlay').classList.add('hidden');
    
    // Load Initial Data
    loadDashboard();
}

// Login Logic
window.handleAdminLogin = async () => {
    const input = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-pass').value;
    const msg = document.getElementById('login-msg');

    msg.textContent = "Verifying...";
    
    // Auto-convert Student ID to Email if needed
    let email = input;
    if (/^\d+$/.test(input)) {
        email = `${input}@ecobirla.edu`; 
    }

    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        msg.textContent = error.message;
        msg.classList.add("text-red-500");
    } else {
        location.reload();
    }
};

window.handleLogout = async () => {
    await sbClient.auth.signOut();
    location.reload();
};

// Navigation Router
window.navTo = (viewId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if (viewId === 'dashboard') loadDashboard();
    if (viewId === 'users') loadUsers();
    if (viewId === 'events') loadEvents();
    if (viewId === 'store') loadStore();
    if (viewId === 'coupons') loadCoupons();
    if (viewId === 'logs') loadLogs();
    if (viewId === 'approvals') loadApprovals();
    if (viewId === 'analytics') loadAnalytics();
};

// =============================================
// 2. DASHBOARD & CHARTS
// =============================================

async function loadDashboard() {
    // 1. Stats RPC
    const { data: stats, error } = await sbClient.rpc('get_admin_dashboard_stats');
    
    if (stats) {
        document.getElementById('dash-distributed').textContent = stats.distributed.toLocaleString();
        document.getElementById('dash-redeemed').textContent = stats.redeemed.toLocaleString();
        document.getElementById('dash-balance').textContent = stats.balance.toLocaleString();
        document.getElementById('dash-impact').textContent = parseFloat(stats.plastic_kg).toFixed(1);
        
        if (stats.pending > 0) {
            const badge = document.getElementById('sidebar-badge');
            badge.textContent = stats.pending;
            badge.classList.remove('hidden');
        }
    } else if (error) {
        console.error("Stats Error:", error);
    }

    // 2. Leaderboard
    const { data: leaders } = await sbClient
        .from('users')
        .select('*')
        .order('lifetime_points', { ascending: false })
        .limit(5);

    if (leaders) {
        document.getElementById('dash-leaderboard').innerHTML = leaders.map((u, i) => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-full ${i===0?'bg-yellow-400':i===1?'bg-gray-300':'bg-orange-300'} flex items-center justify-center text-white font-bold text-xs shadow-sm">${i+1}</div>
                    <img src="${u.profile_img_url || 'https://placehold.co/40'}" class="w-8 h-8 rounded-full object-cover border border-gray-200">
                    <div>
                        <p class="font-bold text-sm text-gray-800 leading-tight">${u.full_name}</p>
                        <p class="text-[10px] text-gray-500 uppercase font-semibold">${u.course}</p>
                    </div>
                </div>
                <span class="font-bold text-green-600 text-sm">${u.lifetime_points} pts</span>
            </div>
        `).join('');
    }

    renderTrafficChart();
}

async function renderTrafficChart() {
    // Use dummy data if table empty for visual check
    const { data: views } = await sbClient.from('page_analytics').select('viewed_at');
    const counts = {};
    
    if (views && views.length > 0) {
        views.forEach(v => {
            const date = new Date(v.viewed_at).toLocaleDateString();
            counts[date] = (counts[date] || 0) + 1;
        });
    } else {
        // Fallback dummy data for UI testing
        counts['Mon'] = 12; counts['Tue'] = 19; counts['Wed'] = 3;
    }

    const ctx = document.getElementById('dashTrafficChart');
    if (!ctx) return;
    
    if (charts.traffic) {
        charts.traffic.destroy();
        charts.traffic = null;
    }

    charts.traffic = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: 'Page Views',
                data: Object.values(counts),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// =============================================
// 3. USER MANAGEMENT
// =============================================

async function loadUsers() {
    const search = document.getElementById('user-search').value;
    let query = sbClient.from('users').select('*, user_impact(total_plastic_kg)').order('created_at', { ascending: false });

    if (search) {
        query = query.or(`student_id.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    
    if (error) { console.error("Load Users Error:", error); return; }

    const tbody = document.getElementById('users-table-body');
    if (users && users.length > 0) {
        tbody.innerHTML = users.map(u => `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50">
                <td class="p-4 flex items-center gap-3">
                    <img src="${u.profile_img_url || 'https://placehold.co/40'}" class="w-10 h-10 rounded-full object-cover border">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${u.full_name}</p>
                        <p class="text-xs text-gray-500">${u.email}</p>
                    </div>
                </td>
                <td class="p-4 text-sm">
                    <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono mr-1">${u.student_id}</span>
                    ${u.course}
                </td>
                <td class="p-4 font-bold text-green-600 text-sm">${u.current_points}</td>
                <td class="p-4 text-sm text-gray-600">${parseFloat(u.user_impact?.total_plastic_kg || 0).toFixed(2)} kg</td>
                <td class="p-4 text-right">
                    <button onclick='editUser(${JSON.stringify(u)})' class="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">Edit</button>
                    <button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">No students found.</td></tr>`;
    }
}

window.editUser = (user) => {
    document.getElementById('u-id').value = user.id;
    document.getElementById('u-name').value = user.full_name;
    document.getElementById('u-std-id').value = user.student_id;
    document.getElementById('u-course').value = user.course;
    document.getElementById('u-email').value = user.email;
    document.getElementById('u-mobile').value = user.mobile || '';
    
    document.getElementById('user-modal').classList.remove('hidden');
};

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('u-id').value;
    const updates = {
        full_name: document.getElementById('u-name').value,
        course: document.getElementById('u-course').value,
        email: document.getElementById('u-email').value,
        mobile: document.getElementById('u-mobile').value
    };
    
    await sbClient.from('users').update(updates).eq('id', id);
    closeModal('user-modal');
    loadUsers();
});

window.deleteUser = async (id) => {
    if (confirm('Are you sure? This will delete all their history.')) {
        await sbClient.from('users').delete().eq('id', id);
        loadUsers();
    }
};

// =============================================
// 4. APPROVALS & ORDERS
// =============================================

async function loadApprovals() {
    // Challenges
    const { data: challenges, error: cError } = await sbClient
        .from('challenge_submissions')
        .select('*, users(full_name), challenges(title, points_reward)')
        .eq('status', 'pending');
    
    if (cError) console.error("Challenges Error:", cError);

    const cList = document.getElementById('approvals-challenges-list');
    if (challenges && challenges.length > 0) {
        cList.innerHTML = challenges.map(c => `
            <div class="p-4 border rounded-lg flex gap-4 items-start hover:bg-gray-50">
                <a href="${c.submission_url}" target="_blank">
                    <img src="${c.submission_url}" class="w-20 h-20 object-cover rounded bg-gray-100">
                </a>
                <div class="flex-1">
                    <h4 class="font-bold text-sm text-gray-800">${c.challenges?.title}</h4>
                    <p class="text-xs text-gray-500">Student: ${c.users?.full_name}</p>
                    <p class="text-green-600 font-bold text-xs mt-1">Reward: ${c.challenges?.points_reward} Pts</p>
                    <div class="flex gap-2 mt-2">
                        <button onclick="processChallenge('${c.id}', 'approved')" class="px-3 py-1 bg-green-600 text-white text-xs rounded font-bold">Approve</button>
                        <button onclick="processChallenge('${c.id}', 'rejected')" class="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded font-bold">Reject</button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        cList.innerHTML = '<p class="text-gray-400 text-sm italic text-center p-4">No pending photos.</p>';
    }

    // Orders
    const { data: orders, error: oError } = await sbClient
        .from('orders')
        .select('*, users(full_name), stores(name)')
        .eq('status', 'pending');

    if (oError) console.error("Orders Error:", oError);

    const oList = document.getElementById('approvals-orders-list');
    if (orders && orders.length > 0) {
        oList.innerHTML = orders.map(o => `
            <div class="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50">
                <div>
                    <h4 class="font-bold text-sm text-gray-800">Order from ${o.stores?.name}</h4>
                    <p class="text-xs text-gray-500">Student: ${o.users?.full_name}</p>
                    <p class="text-xs font-bold mt-1">Total: ${o.total_points} Pts</p>
                </div>
                 <div class="flex gap-2">
                    <button onclick="processOrder('${o.id}', 'confirmed')" class="px-3 py-1 bg-green-600 text-white text-xs rounded font-bold">Confirm</button>
                    <button onclick="processOrder('${o.id}', 'cancelled')" class="px-3 py-1 bg-red-100 text-red-600 text-xs rounded font-bold">Cancel</button>
                </div>
            </div>
        `).join('');
    } else {
        oList.innerHTML = '<p class="text-gray-400 text-sm italic text-center p-4">No pending orders.</p>';
    }
}

window.processChallenge = async (id, status) => {
    await sbClient.from('challenge_submissions').update({ status, admin_id: currentUser.id }).eq('id', id);
    loadApprovals();
};

window.processOrder = async (id, status) => {
    await sbClient.from('orders').update({ status, approved_by: currentUser.id }).eq('id', id);
    loadApprovals();
};

// =============================================
// 5. LOGS & ANALYTICS
// =============================================

async function loadLogs() {
    const { data: logs, error } = await sbClient
        .from('user_activity_log')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);
        
    if (error) { console.error("Logs Error:", error); return; }

    const container = document.getElementById('logs-list');
    if (logs && logs.length > 0) {
        container.innerHTML = logs.map(l => `
            <div class="p-4 flex items-start gap-3 hover:bg-gray-50">
                <div class="mt-1.5 w-2 h-2 rounded-full bg-blue-500"></div>
                <div class="flex-1">
                    <p class="text-sm text-gray-800"><span class="font-bold">${l.action_type}:</span> ${l.description}</p>
                    <div class="flex justify-between mt-1">
                        <p class="text-xs text-gray-500">User: ${l.users?.full_name || 'System'}</p>
                        <p class="text-xs text-gray-400">${new Date(l.created_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="p-4 text-gray-400 text-center">No logs found.</p>';
    }
}

async function loadAnalytics() {
    const { data: logs } = await sbClient.from('user_activity_log').select('action_type');
    const counts = {};
    if (logs) logs.forEach(l => counts[l.action_type] = (counts[l.action_type]||0)+1 );
    
    const ctx = document.getElementById('analyticsActionChart');
    if (!ctx) return;

    if (charts.actions) { charts.actions.destroy(); charts.actions = null; }

    charts.actions = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: Object.keys(counts).length ? Object.keys(counts) : ['No Data'],
            datasets: [{ 
                label: 'Actions', 
                data: Object.values(counts).length ? Object.values(counts) : [0], 
                backgroundColor: '#3B82F6' 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// =============================================
// 6. EVENTS, PRODUCTS & UTILS
// =============================================

// ... (Events, Store, Coupon logic remains the same, just replace `supabase` with `sbClient`)
// For brevity, assuming you apply the 'sbClient' rename to the rest of the file functions 
// (loadEvents, saveProduct, etc.) similar to above.

// Modals
window.openUserModal = () => document.getElementById('user-modal').classList.remove('hidden');
window.openEventModal = () => document.getElementById('event-modal').classList.remove('hidden');
window.openProductModal = () => document.getElementById('product-modal').classList.remove('hidden');
window.openCouponModal = () => { 
    // Generate code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i=0; i<8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('c-code').value = code;
    document.getElementById('coupon-modal').classList.remove('hidden'); 
};
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
