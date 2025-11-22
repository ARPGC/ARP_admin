import { supabase } from './supabase-client.js';

const TICK_ICONS = {
    blue: 'https://i.ibb.co/kgJpMCHr/blue.png',
    silver: 'https://i.ibb.co/gLJLF9Z2/silver.png',
    gold: 'https://i.ibb.co/Q2C7MrM/gold.png',
    black: 'https://i.ibb.co/zVNSNzrK/black.png',
    green: 'https://i.ibb.co/SXGL4Nq0/green.png'
};

export const renderUsers = async (container) => {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', {ascending: false});

    if(error) console.error(error);

    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 class="font-bold text-gray-700">User Management</h3>
                <span class="text-sm text-gray-500">${users.length} Students Registered</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-100 text-gray-600 uppercase font-bold text-xs">
                        <tr>
                            <th class="p-4">Student</th>
                            <th class="p-4">Course</th>
                            <th class="p-4">Points</th>
                            <th class="p-4">Joined</th>
                            <th class="p-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${users.map(u => {
                            const tickUrl = u.tick_type ? TICK_ICONS[u.tick_type.toLowerCase()] : null;
                            const tickHtml = tickUrl ? `<img src="${tickUrl}" class="w-4 h-4 inline ml-1 align-middle" title="${u.tick_type}">` : '';
                            
                            return `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4 flex items-center gap-3">
                                    <img src="${u.profile_img_url || 'https://placehold.co/40'}" class="w-10 h-10 rounded-full object-cover border">
                                    <div>
                                        <div class="font-bold text-gray-900 flex items-center">${u.full_name} ${tickHtml}</div>
                                        <div class="text-xs text-gray-500">${u.student_id}</div>
                                    </div>
                                </td>
                                <td class="p-4 font-medium">${u.course}</td>
                                <td class="p-4 font-bold text-green-600">${u.current_points}</td>
                                <td class="p-4 text-gray-500">${new Date(u.joined_at).toLocaleDateString()}</td>
                                <td class="p-4 text-center">
                                    <button onclick="openUserDetail('${u.id}')" class="bg-brand-50 text-brand-600 border border-brand-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-brand-100 transition">View</button>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// Global function to open user detail modal
window.openUserDetail = async (userId) => {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    const { data: logs } = await supabase.from('user_activity_log').select('*').eq('user_id', userId).order('created_at', {ascending: false}).limit(5);
    const { data: txs } = await supabase.from('points_ledger').select('*').eq('user_id', userId).order('created_at', {ascending: false}).limit(5);
    
    const tickUrl = user.tick_type ? TICK_ICONS[user.tick_type.toLowerCase()] : null;

    const modalHtml = `
        <div class="relative flex flex-col h-full bg-gray-50">
            <!-- Header -->
            <div class="bg-white p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 z-10">
                <div class="flex gap-4">
                    <img src="${user.profile_img_url || 'https://placehold.co/80'}" class="w-16 h-16 rounded-full border-2 border-gray-200 object-cover">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            ${user.full_name} 
                            ${tickUrl ? `<img src="${tickUrl}" class="w-5 h-5">` : ''}
                        </h2>
                        <p class="text-gray-500 text-sm">${user.student_id} | ${user.course}</p>
                        <div class="mt-2 flex gap-2">
                            <span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">${user.current_points} pts</span>
                            <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold capitalize">${user.role}</span>
                        </div>
                    </div>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>

            <!-- Scrollable Content -->
            <div class="p-6 overflow-y-auto space-y-6">
                
                <!-- Security Actions -->
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <h4 class="font-bold text-gray-800">Security Actions</h4>
                        <p class="text-xs text-gray-500">Reset user password to default 'student'.</p>
                    </div>
                    <button onclick="resetUserPassword('${user.id}')" class="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition">
                        Reset Password
                    </button>
                </div>

                <!-- Revoke Points Section (NEW) -->
                <div class="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
                    <h4 class="font-bold text-red-800 mb-2 flex items-center gap-2"><i data-lucide="alert-triangle" class="w-4 h-4"></i> Revoke Points</h4>
                    <p class="text-xs text-red-600 mb-4">Deduct points earned by unethical means. This will be logged.</p>
                    <div class="grid grid-cols-3 gap-3">
                        <input type="number" id="revoke-amount-${user.id}" placeholder="Points (e.g. 50)" class="border border-red-200 p-2 rounded text-sm focus:ring-red-500 focus:border-red-500">
                        <input type="text" id="revoke-reason-${user.id}" placeholder="Reason (e.g. Fake Photo)" class="border border-red-200 p-2 rounded text-sm focus:ring-red-500 focus:border-red-500 col-span-2">
                    </div>
                    <button onclick="revokeUserPoints('${user.id}')" class="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition">
                        Revoke Points
                    </button>
                </div>

                <!-- Transactions -->
                <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-gray-800">Recent Transactions</h3>
                        <button onclick="viewAllTransactions('${user.id}', '${user.full_name}')" class="text-brand-600 text-xs font-bold hover:underline">View All</button>
                    </div>
                    <div class="space-y-3">
                        ${txs.length > 0 ? txs.map(t => `
                            <div class="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                                <div>
                                    <p class="font-medium text-gray-800">${t.description || 'Transaction'}</p>
                                    <p class="text-xs text-gray-400">${new Date(t.created_at).toLocaleDateString()}</p>
                                </div>
                                <span class="${t.points_delta > 0 ? 'text-green-600' : 'text-red-600'} font-bold">
                                    ${t.points_delta > 0 ? '+' : ''}${t.points_delta}
                                </span>
                            </div>
                        `).join('') : '<p class="text-gray-400 text-xs">No recent transactions.</p>'}
                    </div>
                </div>

                <!-- Activity Logs -->
                <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-gray-800">Activity Logs</h3>
                        <button onclick="viewAllLogs('${user.id}', '${user.full_name}')" class="text-brand-600 text-xs font-bold hover:underline">View All</button>
                    </div>
                    <div class="space-y-3">
                        ${logs.length > 0 ? logs.map(l => `
                            <div class="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                                <div>
                                    <p class="font-medium text-gray-800">${l.action_type}</p>
                                    <p class="text-xs text-gray-500 truncate max-w-[250px]">${l.description || '-'}</p>
                                </div>
                                <span class="text-xs text-gray-400">${new Date(l.created_at).toLocaleDateString()}</span>
                            </div>
                        `).join('') : '<p class="text-gray-400 text-xs">No activity logs.</p>'}
                    </div>
                </div>

                <!-- User Data Raw -->
                <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 class="font-bold text-gray-800 mb-4">Edit Profile</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold text-gray-500">Profile Image URL</label>
                            <input type="text" id="edit-avatar-${user.id}" value="${user.profile_img_url || ''}" class="w-full border p-2 rounded text-sm mt-1">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-gray-500">Tick Type</label>
                            <select id="edit-tick-${user.id}" class="w-full border p-2 rounded text-sm mt-1">
                                <option value="">None</option>
                                <option value="blue" ${user.tick_type === 'blue' ? 'selected' : ''}>Blue</option>
                                <option value="silver" ${user.tick_type === 'silver' ? 'selected' : ''}>Silver</option>
                                <option value="gold" ${user.tick_type === 'gold' ? 'selected' : ''}>Gold</option>
                                <option value="black" ${user.tick_type === 'black' ? 'selected' : ''}>Black</option>
                                <option value="green" ${user.tick_type === 'green' ? 'selected' : ''}>Green</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <button onclick="updateUserProfile('${user.id}')" class="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-900">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    openModal(modalHtml);
};

// Revoke Points Function
window.revokeUserPoints = async (userId) => {
    const amount = document.getElementById(`revoke-amount-${userId}`).value;
    const reason = document.getElementById(`revoke-reason-${userId}`).value;

    if (!amount || amount <= 0) { alert("Please enter a valid amount."); return; }
    if (!reason) { alert("Please enter a reason for revoking points."); return; }

    if (!confirm(`Are you sure you want to revoke ${amount} points from this user?`)) return;

    // 1. Get current Admin ID
    const { data: { user } } = await supabase.auth.getUser();
    const { data: adminUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

    // 2. Insert Negative Record into Points Ledger
    // The SQL Trigger will automatically update the User's balance
    const { error } = await supabase.from('points_ledger').insert({
        user_id: userId,
        source_type: 'admin_revoke',
        points_delta: -1 * Math.abs(amount), // Ensure it's negative
        description: `Revoked: ${reason}`,
        created_by: adminUser?.id
    });

    if (error) {
        alert("Error revoking points: " + error.message);
    } else {
        alert(`Successfully revoked ${amount} points.`);
        openUserDetail(userId); // Refresh Modal
        renderUsers(document.getElementById('view-container')); // Refresh List
    }
};

// Reset Password Logic (Calls SQL RPC)
window.resetUserPassword = async (userId) => {
    if(!confirm("This will reset the Auth password to 'student'. Continue?")) return;

    const { error } = await supabase.rpc('admin_reset_password', { 
        target_user_id: userId, 
        new_password: 'student' 
    });
    
    if(error) {
        console.error(error);
        alert("Error resetting password: " + error.message);
    } else {
        alert("Password successfully reset to 'student'.");
    }
};

// Update Profile Logic
window.updateUserProfile = async (userId) => {
    const avatar = document.getElementById(`edit-avatar-${userId}`).value;
    const tick = document.getElementById(`edit-tick-${userId}`).value || null;

    const { error } = await supabase.from('users').update({
        profile_img_url: avatar,
        tick_type: tick
    }).eq('id', userId);

    if(error) alert('Error: ' + error.message);
    else {
        alert('Profile updated!');
        openUserDetail(userId);
        renderUsers(document.getElementById('view-container'));
    }
};

// View All Transactions Screen
window.viewAllTransactions = async (userId, userName) => {
    const { data: txs } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

    const html = `
        <div class="flex flex-col h-full bg-white">
            <div class="p-4 border-b flex items-center gap-3 sticky top-0 bg-white z-10">
                <button onclick="openUserDetail('${userId}')" class="p-2 hover:bg-gray-100 rounded-full"><i data-lucide="arrow-left" class="w-5 h-5"></i></button>
                <div>
                    <h3 class="font-bold text-lg">Transactions</h3>
                    <p class="text-xs text-gray-500">for ${userName}</p>
                </div>
            </div>
            <div class="flex-grow overflow-y-auto p-4">
                <div class="border rounded-lg overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="p-3 text-left">Date</th>
                                <th class="p-3 text-left">Description</th>
                                <th class="p-3 text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${txs.map(t => `
                                <tr>
                                    <td class="p-3 text-gray-500 whitespace-nowrap">${new Date(t.created_at).toLocaleString()}</td>
                                    <td class="p-3 font-medium text-gray-800">${t.description || '-'}</td>
                                    <td class="p-3 text-right font-bold ${t.points_delta > 0 ? 'text-green-600' : 'text-red-600'}">
                                        ${t.points_delta > 0 ? '+' : ''}${t.points_delta}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    openModal(html);
};

// View All Logs Screen
window.viewAllLogs = async (userId, userName) => {
    const { data: logs } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

    const html = `
        <div class="flex flex-col h-full bg-white">
            <div class="p-4 border-b flex items-center gap-3 sticky top-0 bg-white z-10">
                <button onclick="openUserDetail('${userId}')" class="p-2 hover:bg-gray-100 rounded-full"><i data-lucide="arrow-left" class="w-5 h-5"></i></button>
                <div>
                    <h3 class="font-bold text-lg">Activity Logs</h3>
                    <p class="text-xs text-gray-500">for ${userName}</p>
                </div>
            </div>
            <div class="flex-grow overflow-y-auto p-4">
                <div class="border rounded-lg overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="p-3 text-left">Time</th>
                                <th class="p-3 text-left">Action</th>
                                <th class="p-3 text-left">Details</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${logs.map(l => `
                                <tr>
                                    <td class="p-3 text-gray-500 whitespace-nowrap">${new Date(l.created_at).toLocaleString()}</td>
                                    <td class="p-3 font-bold text-gray-800">${l.action_type}</td>
                                    <td class="p-3 text-gray-600">${l.description || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    openModal(html);
};
