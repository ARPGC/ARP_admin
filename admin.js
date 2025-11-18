// =============================================
// 1. INITIALIZATION & CONFIG
// =============================================

// Use the Supabase client from the global window object
// REPLACE THESE WITH YOUR ACTUAL PROJECT CREDENTIALS
const SUPABASE_URL = 'https://aggqmjxhnsbmsymwblqg.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ3FtanhobnNibXN5bXdibHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjQ0NTgsImV4cCI6MjA3ODk0MDQ1OH0.YZmrw7-LtIjlvTkU0c7G8qZ2VDNO8PeHudkGVo1PQ8Q';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnia8lb2q/image/upload';
const CLOUDINARY_PRESET = 'EcoBirla_avatars';

let currentUser = null;
let charts = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await checkAdminSession();
});

// Check if user is logged in AND is an admin
async function checkAdminSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        document.getElementById('login-overlay').classList.remove('hidden');
        return;
    }

    // Verify 'admin' role in database
    const { data: user, error } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('auth_user_id', session.user.id)
        .single();

    if (error || user?.role !== 'admin') {
        document.getElementById('login-msg').textContent = "Access Denied: Not an Admin account.";
        await supabase.auth.signOut();
        document.getElementById('login-overlay').classList.remove('hidden');
        return;
    }

    currentUser = user;
    document.getElementById('admin-name-display').textContent = user.full_name;
    document.getElementById('login-overlay').classList.add('hidden');
    
    // Load Initial View
    loadDashboard();
}

// Login Handler
window.handleAdminLogin = async () => {
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-pass').value;
    const msg = document.getElementById('login-msg');
    const button = document.querySelector('button[onclick="handleAdminLogin()"]');

    // UI Loading State
    msg.textContent = "Authenticating...";
    msg.className = "text-gray-500 text-xs mt-4 h-4";
    button.disabled = true;
    button.classList.add('opacity-50', 'cursor-not-allowed');
    
    // Standard Supabase Email Login
    const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email, 
        password: password 
    });
    
    // Reset Button
    button.disabled = false;
    button.classList.remove('opacity-50', 'cursor-not-allowed');

    if (error) {
        console.error("Login Error:", error);
        msg.textContent = error.message; // e.g., "Invalid login credentials"
        msg.className = "text-red-500 text-xs mt-4 h-4 font-bold";
    } else {
        msg.textContent = "Success! Loading Dashboard...";
        msg.className = "text-green-600 text-xs mt-4 h-4 font-bold";
        setTimeout(() => location.reload(), 500);
    }
};

window.handleLogout = async () => {
    await supabase.auth.signOut();
    location.reload();
};

// Navigation Router
window.navTo = (viewId) => {
    // UI Update
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Data Fetching
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
    // 1. Fetch RPC Stats
    const { data: stats } = await supabase.rpc('get_admin_dashboard_stats');
    
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
    }

    // 2. Leaderboard
    const { data: leaders } = await supabase
        .from('users')
        .select('*')
        .order('lifetime_points', { ascending: false })
        .limit(5);

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

    // 3. Render Charts
    renderTrafficChart();
}

async function renderTrafficChart() {
    // Fetch analytics data
    const { data: views } = await supabase.from('page_analytics').select('viewed_at');
    
    // Process data (group by date)
    const counts = {};
    views?.forEach(v => {
        const date = new Date(v.viewed_at).toLocaleDateString();
        counts[date] = (counts[date] || 0) + 1;
    });

    const ctx = document.getElementById('dashTrafficChart').getContext('2d');
    if (charts.traffic) charts.traffic.destroy();

    charts.traffic = new Chart(ctx, {
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
    let query = supabase.from('users').select('*, user_impact(total_plastic_kg)').order('created_at', { ascending: false });

    if (search) {
        query = query.or(`student_id.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users } = await query;
    
    document.getElementById('users-table-body').innerHTML = users.map(u => `
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
    
    await supabase.from('users').update(updates).eq('id', id);
    closeModal('user-modal');
    loadUsers();
});

window.deleteUser = async (id) => {
    if (confirm('Are you sure? This will delete all their history.')) {
        await supabase.from('users').delete().eq('id', id);
        loadUsers();
    }
};

// =============================================
// 4. STORE & CLOUDINARY UPLOAD
// =============================================

async function loadStore() {
    const { data: products } = await supabase.from('products').select('*, stores(name)');
    
    // Pre-fetch stores for the modal dropdown
    const { data: stores } = await supabase.from('stores').select('*');
    const storeSelect = document.getElementById('p-store');
    storeSelect.innerHTML = stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    document.getElementById('products-grid').innerHTML = products.map(p => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div class="h-32 bg-gray-100 bg-cover bg-center" style="background-image: url('${p.metadata?.image || 'https://placehold.co/300'}')"></div>
            <div class="p-4 flex-1 flex flex-col">
                <div class="mb-auto">
                    <p class="text-xs text-gray-500 mb-1">${p.stores?.name}</p>
                    <h4 class="font-bold text-gray-800">${p.name}</h4>
                </div>
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <span class="text-green-600 font-bold">${p.ecopoints_cost} Pts</span>
                    <button onclick="deleteProduct('${p.id}')" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Cloudinary Logic
document.getElementById('p-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById('p-upload-text').textContent = "Uploading...";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        
        document.getElementById('p-img-url').value = data.secure_url;
        document.getElementById('p-img-preview').style.backgroundImage = `url('${data.secure_url}')`;
        document.getElementById('p-img-preview').classList.remove('hidden');
        document.getElementById('p-upload-text').textContent = "Upload Complete!";
    } catch (err) {
        console.error(err);
        document.getElementById('p-upload-text').textContent = "Upload Failed";
    }
});

window.saveProduct = async () => {
    const product = {
        store_id: document.getElementById('p-store').value,
        name: document.getElementById('p-name').value,
        ecopoints_cost: parseInt(document.getElementById('p-cost').value),
        original_price: parseInt(document.getElementById('p-price').value) || 0,
        description: document.getElementById('p-desc').value,
        metadata: { image: document.getElementById('p-img-url').value },
        is_active: true
    };
    
    await supabase.from('products').insert(product);
    closeModal('product-modal');
    loadStore();
};

window.deleteProduct = async (id) => {
    if(confirm('Delete this product?')) {
        await supabase.from('products').delete().eq('id', id);
        loadStore();
    }
};

// =============================================
// 5. EVENTS, RSVPS & PDF
// =============================================

async function loadEvents() {
    const { data: events } = await supabase.from('events').select('*').order('start_at', { ascending: false });
    
    document.getElementById('events-grid').innerHTML = events.map(e => `
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div class="flex justify-between items-start mb-2">
                 <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">
                    ${new Date(e.start_at).toLocaleDateString()}
                 </span>
                 <button onclick="deleteEvent('${e.id}')" class="text-gray-400 hover:text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </div>
            <h4 class="font-bold text-gray-800 text-lg mb-1">${e.title}</h4>
            <p class="text-sm text-gray-500 mb-4 flex-1 line-clamp-2">${e.description}</p>
            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <span class="text-green-600 font-bold text-sm">+${e.points_reward} Pts</span>
                <button onclick="openRSVPModal('${e.id}', '${e.title}')" class="text-blue-600 text-sm font-medium hover:underline">Manage RSVP</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

window.openRSVPModal = async (eventId, title) => {
    document.getElementById('rsvp-event-title').textContent = title;
    document.getElementById('rsvp-modal').classList.remove('hidden');
    
    // Fetch RSVPs
    const { data: rsvps } = await supabase
        .from('event_attendance')
        .select('*, users(full_name, student_id)')
        .eq('event_id', eventId);

    document.getElementById('rsvp-list-body').innerHTML = rsvps.map(r => `
        <tr class="border-b border-gray-50">
            <td class="p-3 font-mono text-xs text-gray-500">${r.users?.student_id}</td>
            <td class="p-3 font-bold text-gray-800 text-sm">${r.users?.full_name}</td>
            <td class="p-3">
                <span class="px-2 py-1 rounded text-xs font-bold ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                    ${r.status.toUpperCase()}
                </span>
            </td>
            <td class="p-3 text-right">
                ${r.status !== 'confirmed' ? 
                    `<button onclick="markPresent('${r.id}')" class="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-700">Confirm</button>` : 
                    '<i data-lucide="check-circle" class="w-5 h-5 text-green-500 inline"></i>'
                }
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
};

window.markPresent = async (attendanceId) => {
    // This triggers the SQL Trigger to award points automatically
    const { error } = await supabase
        .from('event_attendance')
        .update({ status: 'confirmed', admin_id: currentUser.id })
        .eq('id', attendanceId);
        
    if(!error) {
        alert('Attendance confirmed & points awarded!');
        // Refresh modal (dirty but effective)
        const title = document.getElementById('rsvp-event-title').textContent;
        // We need eventId, but simpler to just hide/show for this demo or reload page
        closeModal('rsvp-modal'); 
        loadEvents(); 
    }
};

window.downloadAttendancePDF = () => {
    const element = document.getElementById('rsvp-table');
    const title = document.getElementById('rsvp-event-title').textContent;
    html2pdf().from(element).save(`${title}_Attendance_Report.pdf`);
};

window.saveEvent = async () => {
    const event = {
        title: document.getElementById('e-title').value,
        start_at: document.getElementById('e-start').value,
        points_reward: document.getElementById('e-points').value,
        description: document.getElementById('e-desc').value,
        location: document.getElementById('e-loc').value
    };
    await supabase.from('events').insert(event);
    closeModal('event-modal');
    loadEvents();
};

window.deleteEvent = async (id) => {
    if(confirm("Delete event?")) {
        await supabase.from('events').delete().eq('id', id);
        loadEvents();
    }
};

// =============================================
// 6. APPROVALS & COUPONS
// =============================================

async function loadApprovals() {
    // 1. Challenges
    const { data: challenges } = await supabase
        .from('challenge_submissions')
        .select('*, users(full_name), challenges(title, points_reward)')
        .eq('status', 'pending');

    document.getElementById('approvals-challenges-list').innerHTML = challenges.length ? challenges.map(c => `
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
    `).join('') : '<p class="text-gray-400 text-sm italic">No pending photos.</p>';

    // 2. Orders
    const { data: orders } = await supabase
        .from('orders')
        .select('*, users(full_name), stores(name)')
        .eq('status', 'pending');

    document.getElementById('approvals-orders-list').innerHTML = orders.length ? orders.map(o => `
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
    `).join('') : '<p class="text-gray-400 text-sm italic">No pending orders.</p>';
}

window.processChallenge = async (id, status) => {
    await supabase.from('challenge_submissions').update({ status, admin_id: currentUser.id }).eq('id', id);
    loadApprovals();
};

window.processOrder = async (id, status) => {
    await supabase.from('orders').update({ status, approved_by: currentUser.id }).eq('id', id);
    loadApprovals();
};

// Coupons
window.generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i=0; i<8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('c-code').value = code;
};

window.saveCoupon = async () => {
    const data = {
        code: document.getElementById('c-code').value,
        points_fixed: document.getElementById('c-points').value,
        max_redemptions: document.getElementById('c-limit').value
    };
    await supabase.from('coupons').insert(data);
    closeModal('coupon-modal');
    loadCoupons();
};

async function loadCoupons() {
    const { data: coupons } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    document.getElementById('coupons-table-body').innerHTML = coupons.map(c => `
        <tr class="border-b border-gray-50 hover:bg-gray-50">
            <td class="p-3 font-mono font-bold text-gray-800">${c.code}</td>
            <td class="p-3 font-bold text-green-600">${c.points_fixed} pts</td>
            <td class="p-3 text-sm">${c.max_redemptions}</td>
            <td class="p-3 text-sm">${c.redeemed_count}</td>
            <td class="p-3 text-right"><span class="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span></td>
        </tr>
    `).join('');
}

// =============================================
// 7. LOGS & UTILS
// =============================================

async function loadLogs() {
    const { data: logs } = await supabase
        .from('user_activity_log')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);
        
    document.getElementById('logs-list').innerHTML = logs.map(l => `
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
}

async function loadAnalytics() {
    // Log Analytics Chart
    const { data: logs } = await supabase.from('user_activity_log').select('action_type');
    const counts = {};
    logs?.forEach(l => counts[l.action_type] = (counts[l.action_type]||0)+1 );
    
    const ctx = document.getElementById('analyticsActionChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{ label: 'Actions', data: Object.values(counts), backgroundColor: '#3B82F6' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Modals
window.openUserModal = () => document.getElementById('user-modal').classList.remove('hidden');
window.openEventModal = () => document.getElementById('event-modal').classList.remove('hidden');
window.openProductModal = () => document.getElementById('product-modal').classList.remove('hidden');
window.openCouponModal = () => { generateCouponCode(); document.getElementById('coupon-modal').classList.remove('hidden'); };
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
