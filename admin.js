// =============================================
// 1. CONFIGURATION & INIT
// =============================================

// Initialize Supabase (You must provide your own URL/Key in production)
// For this file generation to work, we assume these are globally available or filled by the user.
// IMPORTANT: Admin actions require a user with 'admin' role in the `users` table.
const SUPABASE_URL = 'https://aggqmjxhnsbmsymwblqg.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ3FtanhobnNibXN5bXdibHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjQ0NTgsImV4cCI6MjA3ODk0MDQ1OH0.YZmrw7-LtIjlvTkU0c7G8qZ2VDNO8PeHudkGVo1PQ8Q';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnia8lb2q/image/upload';
const CLOUDINARY_PRESET = 'EcoBirla_avatars';

// State
let currentUser = null;
let charts = {};

// On Load
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    lucide.createIcons();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        document.getElementById('login-overlay').classList.remove('hidden');
        document.getElementById('admin-loader').classList.add('hidden');
        return;
    }

    // Check Admin Role in DB
    const { data: userRole } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('auth_user_id', session.user.id)
        .single();

    if (userRole?.role !== 'admin') {
        alert('Access Denied: You do not have Admin privileges.');
        await supabase.auth.signOut();
        location.reload();
        return;
    }

    currentUser = userRole;
    document.getElementById('admin-name-display').textContent = userRole.full_name;
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('admin-loader').classList.add('hidden');
    
    // Init Dashboard
    loadDashboard();
}

async function handleAdminLogin() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message);
    else location.reload();
}

async function handleLogout() {
    await supabase.auth.signOut();
    location.reload();
}

// Navigation Switcher
window.navTo = (viewId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Load Data based on View
    if (viewId === 'users') loadUsers();
    if (viewId === 'events') loadEvents();
    if (viewId === 'store') loadStore();
    if (viewId === 'approvals') loadApprovals();
    if (viewId === 'logs') loadLogs();
    if (viewId === 'coupons') loadCoupons();
    if (viewId === 'analytics') loadAnalytics();
};

// =============================================
// 2. DASHBOARD & STATS
// =============================================

async function loadDashboard() {
    // Fetch Aggregated Stats via RPC
    const { data: stats, error } = await supabase.rpc('get_admin_stats');
    
    if (!error && stats) {
        document.getElementById('dash-distributed').textContent = stats.distributed.toLocaleString();
        document.getElementById('dash-redeemed').textContent = stats.redeemed.toLocaleString();
        document.getElementById('dash-balance').textContent = stats.balance.toLocaleString();
        document.getElementById('dash-impact').textContent = stats.plastic_kg;
        
        if(stats.pending > 0) {
            const badge = document.getElementById('sidebar-badge');
            badge.textContent = stats.pending;
            badge.classList.remove('hidden');
        }
    }

    // Traffic Chart (Mocked or Real from Analytics Table)
    renderTrafficChart();
    
    // Leaderboard
    const { data: leaders } = await supabase.from('users').select('*').order('lifetime_points', { ascending: false }).limit(5);
    const lbContainer = document.getElementById('dash-leaderboard');
    lbContainer.innerHTML = leaders.map((u, i) => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
                <span class="font-bold text-gray-400 text-sm">#${i+1}</span>
                <img src="${u.profile_img_url || 'https://placehold.co/40'}" class="w-8 h-8 rounded-full object-cover">
                <div>
                    <p class="font-bold text-sm text-gray-800">${u.full_name}</p>
                    <p class="text-xs text-gray-500">${u.course}</p>
                </div>
            </div>
            <span class="font-bold text-green-600 text-sm">${u.lifetime_points} pts</span>
        </div>
    `).join('');
}

function renderTrafficChart() {
    const ctx = document.getElementById('dashTrafficChart').getContext('2d');
    if(charts.traffic) charts.traffic.destroy();
    
    charts.traffic = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Page Views',
                data: [120, 150, 180, 220, 170, 90, 130], // Connect to real analytics later
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// =============================================
// 3. USERS MANAGEMENT
// =============================================

async function loadUsers() {
    const search = document.getElementById('user-search').value;
    let query = supabase.from('users').select('*, user_impact(*)').order('created_at', { ascending: false });
    
    if (search) query = query.or(`student_id.ilike.%${search}%,full_name.ilike.%${search}%`);
    
    const { data: users } = await query;
    const tbody = document.getElementById('users-table-body');
    
    tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 flex items-center gap-3">
                <img src="${u.profile_img_url || 'https://placehold.co/40'}" class="w-10 h-10 rounded-full object-cover border">
                <div>
                    <p class="font-bold text-gray-800">${u.full_name}</p>
                    <p class="text-xs text-gray-500">${u.email}</p>
                </div>
            </td>
            <td class="p-4">
                <span class="block font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit mb-1">${u.student_id}</span>
                <span class="text-xs text-gray-500">${u.course}</span>
            </td>
            <td class="p-4 font-bold text-green-600">${u.current_points}</td>
            <td class="p-4">${u.user_impact?.total_plastic_kg || 0}</td>
            <td class="p-4 text-right">
                <button onclick='editUser(${JSON.stringify(u)})' class="text-blue-600 hover:underline text-sm mr-3">Edit</button>
                <button onclick="deleteUser('${u.id}')" class="text-red-500 hover:underline text-sm">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.editUser = (user) => {
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('u-name').value = user.full_name;
    document.getElementById('u-std-id').value = user.student_id;
    document.getElementById('u-course').value = user.course;
    document.getElementById('u-email').value = user.email;
    document.getElementById('u-mobile').value = user.mobile || '';
    document.getElementById('u-pass').value = user.password_plain || '';
    document.getElementById('user-modal').classList.remove('hidden');
};

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const updates = {
        full_name: document.getElementById('u-name').value,
        student_id: document.getElementById('u-std-id').value,
        course: document.getElementById('u-course').value,
        email: document.getElementById('u-email').value,
        mobile: document.getElementById('u-mobile').value,
        password_plain: document.getElementById('u-pass').value
    };

    let error;
    if (id) {
        ({ error } = await supabase.from('users').update(updates).eq('id', id));
    } else {
        // Create logic (requires auth signup usually, but basic insert for record)
        // For a real app, you'd use Admin Auth API to create user
        alert("To create a new user, please use the Sign Up flow or Admin Auth API.");
        return;
    }

    if (error) alert(error.message);
    else {
        closeModal('user-modal');
        loadUsers();
    }
});

// =============================================
// 4. EVENTS & ATTENDANCE (PDF)
// =============================================

async function loadEvents() {
    const { data: events } = await supabase.from('events').select('*').order('start_at', { ascending: false });
    const grid = document.getElementById('events-grid');
    
    grid.innerHTML = events.map(e => `
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div class="flex justify-between items-start mb-3">
                <div class="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold uppercase">
                    ${new Date(e.start_at).toLocaleDateString()}
                </div>
                <button onclick="deleteEvent('${e.id}')" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <h4 class="font-bold text-lg text-gray-800 mb-1">${e.title}</h4>
            <p class="text-sm text-gray-500 mb-4 line-clamp-2">${e.description}</p>
            <div class="flex justify-between items-center">
                <span class="text-green-600 font-bold text-sm">+${e.points_reward} Pts</span>
                <button onclick="openRSVP('${e.id}', '${e.title}')" class="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-black">View RSVPs</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

window.openRSVP = async (eventId, title) => {
    document.getElementById('rsvp-event-title').textContent = title;
    document.getElementById('rsvp-modal').classList.remove('hidden');
    
    const { data: rsvps } = await supabase
        .from('event_attendance')
        .select('*, users(full_name, student_id)')
        .eq('event_id', eventId);

    const tbody = document.getElementById('rsvp-list-body');
    tbody.innerHTML = rsvps.map(r => `
        <tr class="border-b">
            <td class="py-3">${r.users?.student_id}</td>
            <td class="py-3 font-bold">${r.users?.full_name}</td>
            <td class="py-3">
                <span class="px-2 py-1 rounded text-xs ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                    ${r.status}
                </span>
            </td>
            <td class="py-3">
                ${r.status !== 'confirmed' ? 
                    `<button onclick="confirmAttendance('${r.id}')" class="text-green-600 hover:underline text-xs font-bold">Mark Present</button>` : 
                    '<i data-lucide="check" class="w-4 h-4 text-green-500"></i>'
                }
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
};

window.confirmAttendance = async (attendanceId) => {
    const { error } = await supabase
        .from('event_attendance')
        .update({ status: 'confirmed', admin_id: currentUser.id }) // Trigger handles points
        .eq('id', attendanceId);
        
    if(!error) {
        // Refresh current modal view (dirty hack: reopen)
        alert('Attendance Confirmed & Points Distributed!');
    }
};

window.downloadAttendancePDF = () => {
    const element = document.getElementById('rsvp-table');
    const title = document.getElementById('rsvp-event-title').textContent;
    html2pdf().from(element).save(`${title}_Attendance.pdf`);
};

// =============================================
// 5. APPROVALS (Challenges & Orders)
// =============================================

async function loadApprovals() {
    // 1. Challenges
    const { data: challenges } = await supabase
        .from('challenge_submissions')
        .select('*, users(full_name), challenges(title, points_reward)')
        .eq('status', 'pending');
        
    document.getElementById('approvals-challenges-list').innerHTML = challenges.length ? challenges.map(c => `
        <div class="bg-white p-4 rounded-lg border shadow-sm flex gap-4">
            <a href="${c.submission_url}" target="_blank">
                <img src="${c.submission_url}" class="w-24 h-24 object-cover rounded-lg bg-gray-200 hover:opacity-75 transition">
            </a>
            <div class="flex-1">
                <h4 class="font-bold text-sm">${c.challenges.title}</h4>
                <p class="text-xs text-gray-500">By ${c.users.full_name}</p>
                <p class="text-green-600 font-bold text-xs mt-1">+${c.challenges.points_reward} Pts</p>
                <div class="flex gap-2 mt-3">
                    <button onclick="approveChallenge('${c.id}')" class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Approve</button>
                    <button onclick="rejectChallenge('${c.id}')" class="px-3 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200">Reject</button>
                </div>
            </div>
        </div>
    `).join('') : '<p class="text-gray-400 text-sm">No pending challenges.</p>';

    // 2. Orders
    const { data: orders } = await supabase
        .from('orders')
        .select('*, users(full_name, student_id), stores(name)')
        .eq('status', 'pending');

    document.getElementById('approvals-orders-list').innerHTML = orders.length ? orders.map(o => `
        <div class="bg-white p-4 rounded-lg border shadow-sm">
            <div class="flex justify-between mb-2">
                <span class="font-bold text-sm text-gray-800">Order #${o.id.slice(0,8)}</span>
                <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Pending</span>
            </div>
            <p class="text-xs text-gray-600 mb-1">Student: <b>${o.users.full_name}</b> (${o.users.student_id})</p>
            <p class="text-xs text-gray-600 mb-3">Store: ${o.stores.name} | Cost: <b>${o.total_points} Pts</b></p>
            <div class="flex gap-2">
                <button onclick="approveOrder('${o.id}')" class="flex-1 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">Confirm Order</button>
                <button class="flex-1 py-1.5 bg-gray-100 text-gray-600 text-xs rounded">Cancel</button>
            </div>
        </div>
    `).join('') : '<p class="text-gray-400 text-sm">No pending orders.</p>';
}

window.approveChallenge = async (id) => {
    await supabase.from('challenge_submissions').update({ status: 'approved', admin_id: currentUser.id }).eq('id', id);
    loadApprovals();
};

window.approveOrder = async (id) => {
    await supabase.from('orders').update({ status: 'confirmed', approved_by: currentUser.id }).eq('id', id);
    loadApprovals(); // DB Trigger deducts points
};

// =============================================
// 6. PRODUCTS & CLOUDINARY UPLOAD
// =============================================

async function loadStore() {
    // Fetch Products
    const { data: products } = await supabase.from('products').select('*, stores(name)').eq('is_active', true);
    const grid = document.getElementById('products-grid');
    
    // Fetch product image from related table or assume simple structure for demo
    // We will query product_images separately or assume 1 image per product for Admin View simplicity
    
    grid.innerHTML = products.map(p => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div class="h-32 bg-gray-100 rounded-lg mb-3 bg-cover bg-center" style="background-image: url('${p.metadata?.image || 'https://placehold.co/300'}')"></div>
            <h4 class="font-bold text-gray-800">${p.name}</h4>
            <p class="text-xs text-gray-500 mb-2">${p.stores?.name}</p>
            <div class="mt-auto flex justify-between items-center">
                <span class="font-bold text-green-600">${p.ecopoints_cost} pts</span>
                <button class="text-gray-400 hover:text-blue-600"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Cloudinary Upload Logic
document.getElementById('p-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById('p-upload-text').textContent = 'Uploading...';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        document.getElementById('p-img-url').value = data.secure_url;
        document.getElementById('p-img-preview').style.backgroundImage = `url('${data.secure_url}')`;
        document.getElementById('p-img-preview').classList.remove('hidden');
        document.getElementById('p-upload-text').textContent = 'Upload Complete';
    } catch (err) {
        alert('Upload Failed');
    }
});

window.saveProduct = async () => {
    const name = document.getElementById('p-name').value;
    const cost = document.getElementById('p-cost').value;
    const img = document.getElementById('p-img-url').value;
    
    // Simplified Insert for demo (Assumes store exists)
    const { error } = await supabase.from('products').insert({
        name, 
        ecopoints_cost: cost, 
        store_id: 'YOUR_STORE_UUID', // You'd fetch stores to select
        metadata: { image: img }
    });
    
    if(!error) { closeModal('product-modal'); loadStore(); }
};

// =============================================
// 7. COUPONS & LOGS
// =============================================

window.generateCouponCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for(let i=0; i<8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('c-code').value = code;
};

window.saveCoupon = async () => {
    const code = document.getElementById('c-code').value;
    const pts = document.getElementById('c-points').value;
    const limit = document.getElementById('c-limit').value;
    
    const { error } = await supabase.from('coupons').insert({
        code, points_fixed: pts, max_redemptions: limit
    });
    if(!error) { closeModal('coupon-modal'); loadCoupons(); }
};

async function loadLogs() {
    const { data: logs } = await supabase
        .from('user_activity_log')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);
        
    document.getElementById('logs-list').innerHTML = logs.map(l => `
        <div class="p-4 flex items-start gap-3 hover:bg-gray-50">
            <div class="mt-1 w-2 h-2 rounded-full bg-blue-500"></div>
            <div>
                <p class="text-sm font-bold text-gray-800">${l.description} <span class="font-normal text-gray-500">by ${l.users?.full_name || 'System'}</span></p>
                <p class="text-xs text-gray-400">${new Date(l.created_at).toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

// =============================================
// 8. UTILS
// =============================================
window.openUserModal = () => document.getElementById('user-modal').classList.remove('hidden');
window.openProductModal = () => document.getElementById('product-modal').classList.remove('hidden');
window.openEventModal = () => document.getElementById('event-modal').classList.remove('hidden');
window.openCouponModal = () => { generateCouponCode(); document.getElementById('coupon-modal').classList.remove('hidden'); };
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
