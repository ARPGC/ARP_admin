import { supabase } from './supabase-client.js';

// Global state to hold the currently viewed user
let currentUser = null;

export const renderUsers = (container) => {
    container.innerHTML = `
        <div class="max-w-5xl mx-auto h-full flex flex-col">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div class="mb-4">
                    <h3 class="font-bold text-xl text-gray-800">User Management</h3>
                    <p class="text-xs text-gray-500">Search and manage student profiles, passwords, and points.</p>
                </div>

                <div class="relative">
                    <div class="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50 transition-all bg-gray-50 overflow-hidden">
                        <div class="pl-4 text-gray-400"><i data-lucide="search" class="w-5 h-5"></i></div>
                        <input type="text" id="user-mgmt-search" autocomplete="off"
                            placeholder="Search by Student Name, ID, or Email..." 
                            class="w-full p-4 bg-transparent border-none focus:ring-0 text-gray-800 font-medium placeholder-gray-400 outline-none">
                        
                        <button id="clear-mgmt-search" class="hidden px-4 text-gray-400 hover:text-red-500 transition" onclick="clearUserSearch()">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <div id="user-mgmt-results" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50 divide-y divide-gray-50"></div>
                </div>
            </div>

            <div id="user-profile-view" class="hidden flex-grow space-y-6 animate-fade-in-up">
                
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="h-32 bg-gradient-to-r from-gray-800 to-gray-900 relative">
                        <div class="absolute bottom-0 left-8 transform translate-y-1/2">
                            <img id="u-img" src="" class="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white object-cover">
                        </div>
                    </div>
                    <div class="pt-14 pb-8 px-8">
                        <div class="flex justify-between items-start">
                            <div>
                                <h2 id="u-name" class="text-2xl font-bold text-gray-900"></h2>
                                <div class="flex items-center gap-2 mt-1 text-gray-500 text-sm">
                                    <span id="u-id" class="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold"></span>
                                    <span>•</span>
                                    <span id="u-course" class="uppercase font-bold tracking-wide"></span>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-gray-400 uppercase font-bold tracking-wider">Current Balance</p>
                                <p id="u-points" class="text-4xl font-black text-brand-600"></p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-100">
                            <div>
                                <p class="text-xs text-gray-400 font-bold uppercase mb-1">Email Address</p>
                                <p id="u-email" class="text-sm font-medium text-gray-800 truncate"></p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-400 font-bold uppercase mb-1">Phone Number</p>
                                <p id="u-mobile" class="text-sm font-medium text-gray-800"></p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-400 font-bold uppercase mb-1">Joined Date</p>
                                <p id="u-joined" class="text-sm font-medium text-gray-800"></p>
                            </div>
                        </div>
                        
                        <div class="mt-6 bg-red-50 border border-red-100 rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <p class="text-xs text-red-500 font-bold uppercase mb-1 flex items-center gap-1">
                                    <i data-lucide="lock" class="w-3 h-3"></i> Current Password (Reference)
                                </p>
                                <p id="u-pwd-plain" class="text-lg font-mono font-bold text-red-700 tracking-wider">••••••••</p>
                            </div>
                            <button onclick="togglePasswordVisibility()" class="text-xs font-bold text-red-600 hover:text-red-800 underline">
                                Show / Hide
                            </button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <button onclick="triggerQuickAction('promo')" class="p-5 bg-white border border-green-100 rounded-xl shadow-sm hover:shadow-md hover:border-green-300 transition-all text-left group">
                        <div class="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <i data-lucide="gift" class="w-5 h-5"></i>
                        </div>
                        <h4 class="font-bold text-gray-800 group-hover:text-green-700">Give Points</h4>
                        <p class="text-xs text-gray-400 mt-1">Reward this student</p>
                    </button>

                    <button onclick="triggerQuickAction('revoke')" class="p-5 bg-white border border-red-100 rounded-xl shadow-sm hover:shadow-md hover:border-red-300 transition-all text-left group">
                        <div class="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <i data-lucide="minus-circle" class="w-5 h-5"></i>
                        </div>
                        <h4 class="font-bold text-gray-800 group-hover:text-red-700">Revoke Points</h4>
                        <p class="text-xs text-gray-400 mt-1">Deduct balance</p>
                    </button>

                    <button onclick="triggerQuickAction('history')" class="p-5 bg-white border border-blue-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group">
                        <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <i data-lucide="history" class="w-5 h-5"></i>
                        </div>
                        <h4 class="font-bold text-gray-800 group-hover:text-blue-700">View History</h4>
                        <p class="text-xs text-gray-400 mt-1">Check logs & audits</p>
                    </button>

                    <button onclick="openResetModal()" class="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-400 transition-all text-left group">
                        <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mb-3 group-hover:bg-gray-800 group-hover:text-white transition-colors">
                            <i data-lucide="key" class="w-5 h-5"></i>
                        </div>
                        <h4 class="font-bold text-gray-800">Reset Password</h4>
                        <p class="text-xs text-gray-400 mt-1">Update login creds</p>
                    </button>

                </div>
            </div>

            <div id="user-empty-state" class="flex-grow flex flex-col items-center justify-center text-center p-12 opacity-50">
                <div class="bg-gray-100 p-4 rounded-full mb-4">
                    <i data-lucide="users" class="w-8 h-8 text-gray-400"></i>
                </div>
                <p class="text-gray-500 font-medium">Search for a student above to view details.</p>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();

    // Attach Search Listeners
    const searchInput = document.getElementById('user-mgmt-search');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const q = e.target.value.trim();
        const resultsEl = document.getElementById('user-mgmt-results');
        const clearBtn = document.getElementById('clear-mgmt-search');

        if(q.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');

        if(q.length < 2) {
            resultsEl.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(() => performSearch(q), 300);
    });

    // Close Dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#user-mgmt-search') && !e.target.closest('#user-mgmt-results')) {
            document.getElementById('user-mgmt-results').classList.add('hidden');
        }
    });
};

// --- SEARCH LOGIC ---
const performSearch = async (query) => {
    const resultsEl = document.getElementById('user-mgmt-results');
    resultsEl.innerHTML = '<div class="p-4 text-center text-xs text-gray-400">Searching...</div>';
    resultsEl.classList.remove('hidden');

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or(`full_name.ilike.%${query}%,student_id.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

    if (error || !users || users.length === 0) {
        resultsEl.innerHTML = '<div class="p-4 text-center text-xs text-gray-500 font-bold">No users found.</div>';
        return;
    }

    resultsEl.innerHTML = users.map(u => `
        <div onclick="loadUserProfile('${u.id}')" class="flex items-center gap-3 p-3 hover:bg-brand-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
            <img src="${u.profile_img_url || 'https://placehold.co/100'}" class="w-10 h-10 rounded-full object-cover border border-gray-100">
            <div>
                <h4 class="font-bold text-gray-900 text-sm">${u.full_name}</h4>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span class="font-mono bg-gray-100 px-1 rounded">${u.student_id}</span>
                    <span>${u.email}</span>
                </div>
            </div>
        </div>
    `).join('');
};

window.clearUserSearch = () => {
    document.getElementById('user-mgmt-search').value = '';
    document.getElementById('user-mgmt-results').classList.add('hidden');
    document.getElementById('clear-mgmt-search').classList.add('hidden');
    // Don't clear profile, let them keep looking at the last loaded user
};

// --- LOAD PROFILE ---
window.loadUserProfile = async (userId) => {
    // Hide Search Results
    document.getElementById('user-mgmt-results').classList.add('hidden');
    document.getElementById('user-empty-state').classList.add('hidden');
    
    const profileView = document.getElementById('user-profile-view');
    profileView.classList.remove('hidden');
    profileView.classList.add('opacity-50'); // Loading state

    const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if(error || !user) {
        alert("Error fetching user details.");
        return;
    }

    currentUser = user; // Save to global state

    // Populate UI
    document.getElementById('u-img').src = user.profile_img_url || 'https://placehold.co/100';
    document.getElementById('u-name').textContent = user.full_name;
    document.getElementById('u-id').textContent = user.student_id;
    document.getElementById('u-course').textContent = user.course || 'Student';
    document.getElementById('u-points').textContent = user.current_points;
    document.getElementById('u-email').textContent = user.email || '-';
    document.getElementById('u-mobile').textContent = user.mobile || '-';
    document.getElementById('u-joined').textContent = new Date(user.created_at).toLocaleDateString();
    
    // Password Logic
    const pwdEl = document.getElementById('u-pwd-plain');
    if(user.password_plain) {
        pwdEl.dataset.plain = user.password_plain; // Store real pwd in data attribute
        pwdEl.textContent = "••••••••"; // Default hidden
    } else {
        pwdEl.dataset.plain = "Not Set";
        pwdEl.textContent = "Not Set";
    }

    // Done Loading
    profileView.classList.remove('opacity-50');
    
    // Update Search Bar with Name for context
    document.getElementById('user-mgmt-search').value = `${user.full_name} (${user.student_id})`;
};

window.togglePasswordVisibility = () => {
    const el = document.getElementById('u-pwd-plain');
    if(el.textContent === "••••••••") {
        el.textContent = el.dataset.plain;
        el.classList.add('text-red-600');
    } else {
        el.textContent = "••••••••";
        el.classList.remove('text-red-600');
    }
};

// --- QUICK ACTIONS HANDLER ---
window.triggerQuickAction = (action) => {
    if(!currentUser) return;

    // Use sessionStorage to pass data to other views
    sessionStorage.setItem('admin_target_user', JSON.stringify(currentUser));

    switch(action) {
        case 'promo':
            // Go to Give Points page
            loadView('promo');
            // Give it a moment to load, then trigger the search/select logic
            setTimeout(() => {
                if(window.selectUserForPromo) { 
                    // Assuming admin-promo.js exposes this, or we rely on sessionStorage check inside promo
                    // For now, simpler: user has to search again OR we update promo.js to check storage
                    // Let's assume we update promo.js to check sessionStorage on load!
                }
            }, 100);
            break;
            
        case 'revoke':
            loadView('revoke');
            break;
            
        case 'history':
            loadView('plastic');
            // Logic to auto-filter logs is best handled by `admin-plastic.js` checking sessionStorage
            break;
    }
};

// --- RESET PASSWORD MODAL ---
window.openResetModal = () => {
    if(!currentUser) return;

    const html = `
        <div class="p-6 text-center">
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <i data-lucide="key" class="w-6 h-6"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Reset Password</h3>
            <p class="text-sm text-gray-500 mb-6">Enter a new password for <span class="font-bold text-gray-800">${currentUser.full_name}</span>. This will update their login immediately.</p>
            
            <form id="reset-pwd-form" class="text-left space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">New Password</label>
                    <input type="text" id="new-pwd" class="w-full p-3 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-red-500 outline-none" placeholder="Enter new password" required minlength="6">
                    <p class="text-xs text-gray-400 mt-1">Must be at least 6 characters.</p>
                </div>
                
                <button type="submit" class="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 shadow-md">
                    Confirm Reset
                </button>
            </form>
        </div>
    `;
    
    openModal(html);
    
    document.getElementById('reset-pwd-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const newPwd = document.getElementById('new-pwd').value.trim();

        if(newPwd.length < 6) {
            alert("Password too short.");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Updating...";

        try {
            // Call the SQL Function we created
            const { error } = await supabase.rpc('admin_reset_password', {
                p_target_user_id: currentUser.id,
                p_new_password: newPwd
            });

            if (error) throw error;

            alert("Success! Password has been updated.");
            closeModal();
            // Refresh Profile to show new password in reference field
            loadUserProfile(currentUser.id);

        } catch (err) {
            console.error(err);
            alert("Failed: " + err.message);
            btn.disabled = false;
            btn.innerText = "Confirm Reset";
        }
    });
};
