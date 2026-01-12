import { supabase } from './supabase-client.js';
import { uploadToCloudinary } from './cloudinary-service.js';

const PLASTIC_TYPES = {
    'PET': 1.60, 'HDPE': 1.25, 'PVC': 0.90, 'LDPE': 1.10, 'PP': 1.45, 'PS': 1.15, 'Other': 0.75
};

// State to track selected user
let currentSelectedUser = null;

export const renderPlasticLogs = async (container) => {
    container.innerHTML = `
        <div class="max-w-6xl mx-auto h-full flex flex-col">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 relative z-20">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h3 class="font-bold text-xl text-gray-800">Plastic Recycling Logs</h3>
                        <p class="text-xs text-gray-500">Search students directly to manage their records</p>
                    </div>
                    <button onclick="openLogModal()" class="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-lg shadow-brand-200 transition-all">
                        <i data-lucide="plus" class="w-5 h-5"></i> New Log entry
                    </button>
                </div>

                <div class="relative w-full">
                    <div class="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50 transition-all bg-gray-50 overflow-hidden">
                        <div class="pl-4 text-gray-400">
                            <i data-lucide="search" class="w-5 h-5"></i>
                        </div>
                        <input type="text" id="smart-user-search" autocomplete="off"
                            placeholder="Start typing Student Name or ID (e.g. Mohit... or 520...)" 
                            class="w-full p-4 bg-transparent border-none focus:ring-0 text-gray-800 font-medium placeholder-gray-400 outline-none">
                        
                        <button id="clear-search-btn" class="hidden px-4 text-gray-400 hover:text-red-500 transition" onclick="clearSearch()">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div id="search-dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50 divide-y divide-gray-50">
                        </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex-grow flex flex-col overflow-hidden relative z-10">
                
                <div id="active-filter-banner" class="hidden bg-blue-50 border-b border-blue-100 p-3 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <img id="filter-user-img" src="" class="w-8 h-8 rounded-full border border-white shadow-sm">
                        <div>
                            <p class="text-xs font-bold text-blue-600 uppercase">Filtered View</p>
                            <p id="filter-user-name" class="text-sm font-bold text-gray-900"></p>
                        </div>
                    </div>
                    <button onclick="clearSearch()" class="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline">Clear Filter</button>
                </div>

                <div class="overflow-x-auto flex-grow">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200 sticky top-0">
                            <tr>
                                <th class="p-4">Student</th>
                                <th class="p-4">Weight / Type</th>
                                <th class="p-4">CO₂ Saved</th>
                                <th class="p-4">Proof</th>
                                <th class="p-4">Date</th>
                                <th class="p-4">Status</th>
                                <th class="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="plastic-table-body" class="divide-y divide-gray-100">
                            <tr><td colspan="7" class="p-12 text-center text-gray-400">Loading recent logs...</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 text-center">
                    <span id="logs-status-text">Showing recent 50 entries</span>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();

    // --- SETUP SMART SEARCH LISTENERS ---
    const searchInput = document.getElementById('smart-user-search');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            document.getElementById('search-dropdown').classList.add('hidden');
            return;
        }

        // Wait 300ms before querying database to save resources
        debounceTimer = setTimeout(() => performUserSearch(query), 300);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#smart-user-search') && !e.target.closest('#search-dropdown')) {
            document.getElementById('search-dropdown').classList.add('hidden');
        }
    });

    // Initial Load (All Recent)
    loadLogs(null);
};

// --- 1. SEARCH USERS DIRECTLY ---
const performUserSearch = async (query) => {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.innerHTML = '<div class="p-4 text-center text-gray-400 text-xs">Searching database...</div>';
    dropdown.classList.remove('hidden');

    // Search USERS table directly
    const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name, student_id, course, profile_img_url')
        .or(`full_name.ilike.%${query}%,student_id.ilike.%${query}%`)
        .limit(10); // Show top 10 matches

    if (error || !users || users.length === 0) {
        dropdown.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-gray-800 font-bold text-sm">No student found</p>
                <p class="text-xs text-gray-400 mt-1">Try a different name or ID</p>
            </div>`;
        return;
    }

    // Render Results
    dropdown.innerHTML = users.map(user => `
        <div onclick="selectUserForLogs('${user.id}', '${user.full_name}', '${user.student_id}', '${user.profile_img_url || ''}')" 
             class="flex items-center gap-3 p-3 hover:bg-brand-50 cursor-pointer transition-colors group">
            
            <img src="${user.profile_img_url || 'https://placehold.co/100'}" class="w-10 h-10 rounded-full object-cover border border-gray-100 group-hover:border-brand-200">
            
            <div class="flex-1">
                <h4 class="font-bold text-gray-900 group-hover:text-brand-700 text-sm">${user.full_name}</h4>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span class="font-mono bg-gray-100 px-1.5 rounded">${user.student_id}</span>
                    <span>•</span>
                    <span class="uppercase">${user.course || 'Student'}</span>
                </div>
            </div>
            
            <div class="text-gray-300 group-hover:text-brand-500">
                <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </div>
        </div>
    `).join('');

    if(window.lucide) window.lucide.createIcons();
};

// --- 2. SELECT USER & FILTER LOGS ---
window.selectUserForLogs = (id, name, studentId, imgUrl) => {
    // 1. Update State
    currentSelectedUser = { id, name, studentId };

    // 2. Update UI
    document.getElementById('smart-user-search').value = `${name} (${studentId})`;
    document.getElementById('search-dropdown').classList.add('hidden');
    document.getElementById('clear-search-btn').classList.remove('hidden');

    // 3. Show Filter Banner
    const banner = document.getElementById('active-filter-banner');
    document.getElementById('filter-user-name').textContent = `${name} (${studentId})`;
    document.getElementById('filter-user-img').src = imgUrl || 'https://placehold.co/100';
    banner.classList.remove('hidden');

    // 4. Load SPECIFIC Logs
    loadLogs(id);
};

window.clearSearch = () => {
    currentSelectedUser = null;
    document.getElementById('smart-user-search').value = '';
    document.getElementById('search-dropdown').classList.add('hidden');
    document.getElementById('active-filter-banner').classList.add('hidden');
    document.getElementById('clear-search-btn').classList.add('hidden');
    loadLogs(null); // Load all
};

// --- 3. FETCH LOGS (Smart) ---
window.loadLogs = async (specificUserId = null) => {
    const tbody = document.getElementById('plastic-table-body');
    if(!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="p-12 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div></td></tr>`;

    let dbQuery = supabase
        .from('plastic_submissions')
        .select('id, weight_kg, plastic_type, status, created_at, submission_url, users!user_id(full_name, student_id)')
        .order('created_at', { ascending: false });

    // FILTER LOGIC
    if (specificUserId) {
        dbQuery = dbQuery.eq('user_id', specificUserId); // Strict ID Filter
        document.getElementById('logs-status-text').textContent = "Displaying complete history for selected student";
    } else {
        dbQuery = dbQuery.limit(50); // Default Limit
        document.getElementById('logs-status-text').textContent = "Showing recent 50 entries across all students";
    }

    const { data: logs, error } = await dbQuery;

    if (error) {
        console.error("Log Fetch Error:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500 font-bold">Error loading data.</td></tr>`;
        return;
    }

    if (!logs || logs.length === 0) {
        if(specificUserId) {
            tbody.innerHTML = `
                <tr><td colspan="7" class="p-12 text-center">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <div class="bg-gray-100 p-3 rounded-full"><i data-lucide="inbox" class="w-8 h-8 text-gray-400"></i></div>
                        <p class="text-gray-800 font-bold">No logs found for this student.</p>
                        <button onclick="openLogModal('${specificUserId}')" class="text-brand-600 hover:underline text-sm font-bold">Add first log entry</button>
                    </div>
                </td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-400 italic">No activity yet.</td></tr>`;
        }
        if(window.lucide) window.lucide.createIcons();
        return;
    }

    // RENDER ROWS
    tbody.innerHTML = logs.map(log => {
        const co2 = (log.weight_kg * (PLASTIC_TYPES[log.plastic_type] || 0.75)).toFixed(2);
        const points = Math.ceil(log.weight_kg * 100);
        const dateStr = new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });

        return `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
            <td class="p-4">
                <div class="font-bold text-gray-900">${log.users?.full_name || 'Unknown'}</div>
                <div class="text-xs text-gray-500">${log.users?.student_id || '-'}</div>
            </td>
            <td class="p-4">
                <div class="font-bold text-gray-800">${log.weight_kg} kg</div>
                <span class="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">${log.plastic_type || 'Other'}</span>
            </td>
            <td class="p-4">
                <div class="text-green-600 font-bold">${co2} kg</div>
                <div class="text-xs text-gray-400">Value: ${points} pts</div>
            </td>
            <td class="p-4">
                ${log.submission_url 
                    ? `<a href="${log.submission_url}" target="_blank" class="text-blue-600 hover:underline text-xs flex items-center gap-1"><i data-lucide="image" class="w-3 h-3"></i> View</a>` 
                    : '<span class="text-gray-400 text-xs">No Image</span>'}
            </td>
            <td class="p-4 text-xs text-gray-500">
                ${dateStr}
            </td>
            <td class="p-4">
                <span class="px-2 py-1 rounded text-xs font-bold uppercase ${
                    log.status === 'verified' ? 'bg-green-100 text-green-700' :
                    log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                }">${log.status}</span>
            </td>
            <td class="p-4 text-right">
                ${log.status === 'pending' ? `
                    <button onclick="verifyLog('${log.id}', ${log.weight_kg}, '${log.plastic_type || 'Other'}')" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition">Verify</button>
                    <button onclick="rejectLog('${log.id}')" class="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 ml-1 transition">Reject</button>
                ` : '<span class="text-gray-400 text-xs italic opacity-60">Locked</span>'}
            </td>
        </tr>
    `}).join('');

    if(window.lucide) window.lucide.createIcons();
};

// --- 4. MODAL & ACTIONS (Pre-fills selected user) ---
window.openLogModal = async (preSelectedId = null) => {
    // If opened from the "Add First Log" button, use that ID. Otherwise, check global state.
    const targetId = preSelectedId || currentSelectedUser?.id;

    // Fetch Admin ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: adminUser } = await supabase.from('users').select('id').eq('auth_user_id', currentUser.id).single();

    // Fetch All Users for dropdown (in case they want to change)
    const { data: users } = await supabase.from('users').select('id, full_name, student_id').order('full_name');

    const html = `
        <div class="p-6 h-full flex flex-col relative">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-800">Log Plastic Waste</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            
            <form id="plastic-form" class="space-y-5 flex-grow overflow-y-auto p-1">
                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Select Student</label>
                    <select id="pl-user" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" required>
                        <option value="">-- Select User --</option>
                        <option value="${adminUser?.id}" class="font-bold bg-gray-100">★ Record for Myself (Admin)</option>
                        ${users.map(u => `<option value="${u.id}" ${u.id === targetId ? 'selected' : ''}>${u.full_name} (${u.student_id})</option>`).join('')}
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Weight (kg)</label>
                        <input type="number" id="pl-weight" step="0.01" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="0.00" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Plastic Type</label>
                        <select id="pl-type" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" required>
                            ${Object.keys(PLASTIC_TYPES).map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p class="text-xs text-blue-600 uppercase font-bold">Points</p>
                        <p class="text-2xl font-bold text-blue-800" id="calc-points">0</p>
                    </div>
                    <div>
                        <p class="text-xs text-blue-600 uppercase font-bold">CO₂ Saved</p>
                        <p class="text-2xl font-bold text-green-700" id="calc-co2">0.00 kg</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Proof (Optional)</label>
                    <input type="file" id="pl-file" class="w-full p-2 border border-gray-300 rounded-lg text-sm" accept="image/*">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Location</label>
                    <input type="text" id="pl-location" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Canteen">
                </div>

                <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <input type="checkbox" id="pl-verify" class="w-5 h-5 text-green-600 rounded cursor-pointer">
                    <div>
                        <label for="pl-verify" class="font-bold text-green-800 text-sm cursor-pointer">Verify Immediately</label>
                        <p class="text-xs text-green-600">Check this if you have physically verified the waste.</p>
                    </div>
                </div>

                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 shadow-md mt-4 transition">Submit Log</button>
            </form>
        </div>
    `;
    openModal(html);

    // Calc Logic
    const weightInput = document.getElementById('pl-weight');
    const typeInput = document.getElementById('pl-type');
    
    const updateCalc = () => {
        const w = parseFloat(weightInput.value) || 0;
        const type = typeInput.value;
        const co2Rate = PLASTIC_TYPES[type] || 0.75;
        document.getElementById('calc-points').textContent = Math.ceil(w * 100);
        document.getElementById('calc-co2').textContent = (w * co2Rate).toFixed(2) + ' kg';
    };

    weightInput.addEventListener('input', updateCalc);
    typeInput.addEventListener('change', updateCalc);

    // Submit Logic
    document.getElementById('plastic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = 'Submitting...';

        try {
            let imageUrl = null;
            const fileInput = document.getElementById('pl-file');
            if (fileInput.files.length > 0) {
                btn.innerText = 'Uploading Image...';
                imageUrl = await uploadToCloudinary(fileInput.files[0]);
            }

            const isAutoVerify = document.getElementById('pl-verify').checked;
            const userId = document.getElementById('pl-user').value;

            const payload = {
                user_id: userId,
                weight_kg: parseFloat(document.getElementById('pl-weight').value),
                plastic_type: document.getElementById('pl-type').value,
                location: document.getElementById('pl-location').value,
                submission_url: imageUrl, 
                status: isAutoVerify ? 'verified' : 'pending',
                verified_by: isAutoVerify ? adminUser?.id : null,
                verified_at: isAutoVerify ? new Date().toISOString() : null,
                created_by: adminUser?.id
            };

            const { error } = await supabase.from('plastic_submissions').insert(payload);
            if (error) throw error;

            closeModal();
            // Refresh logs for the currently selected user (or all if none selected)
            loadLogs(currentSelectedUser?.id || null);

        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
            btn.disabled = false; btn.innerText = 'Retry';
        }
    });
};

window.verifyLog = async (logId, weight, type) => {
    if (!confirm(`Confirm verification of ${weight}kg ${type}? Points will be awarded.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

    const { error } = await supabase
        .from('plastic_submissions')
        .update({ status: 'verified', verified_by: admin?.id, verified_at: new Date().toISOString() })
        .eq('id', logId);

    if (error) alert('Verification failed: ' + error.message);
    else loadLogs(currentSelectedUser?.id || null);
};

window.rejectLog = async (logId) => {
    if (!confirm("Are you sure you want to reject this log?")) return;
    const { error } = await supabase.from('plastic_submissions').update({ status: 'rejected' }).eq('id', logId);
    if (!error) loadLogs(currentSelectedUser?.id || null);
};
