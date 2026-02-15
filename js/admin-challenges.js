import { supabase } from './supabase-client.js';

// Global state
let pendingSubmissions = [];
let currentSubmissionIndex = 0;

export const renderChallenges = async (container) => {
    container.innerHTML = `
        <div class="h-[calc(100vh-100px)] flex flex-col max-w-7xl mx-auto">
            
            <div class="flex justify-between items-center mb-4 shrink-0 px-2">
                <div>
                    <h3 class="font-bold text-xl text-gray-800">Challenge Management</h3>
                    <p class="text-xs text-gray-500">Manage challenges and review student proof</p>
                </div>
                <div class="flex gap-2">
                     <button onclick="loadView('challenges')" class="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 text-sm">
                        <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i> Refresh
                    </button>
                    <button onclick="openChallengeModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 text-sm flex items-center gap-2 shadow-sm">
                        <i data-lucide="plus" class="w-4 h-4"></i> Create Challenge
                    </button>
                </div>
            </div>

            <div class="flex gap-6 border-b border-gray-200 mb-4 shrink-0 px-2">
                <button id="tab-review" onclick="switchTab('review')" class="pb-2 text-sm font-bold text-brand-600 border-b-2 border-brand-600">
                    Review Submissions
                </button>
                <button id="tab-manage" onclick="switchTab('manage')" class="pb-2 text-sm font-bold text-gray-500 hover:text-gray-700">
                    Active Challenges
                </button>
            </div>

            <div id="view-review" class="flex-grow flex gap-6 overflow-hidden min-h-0 pb-4">
                
                <div class="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div class="p-4 border-b border-gray-100 bg-gray-50 font-bold text-xs text-gray-500 uppercase flex justify-between">
                        <span>Pending Queue</span>
                        <span id="queue-count" class="bg-brand-100 text-brand-700 px-2 rounded-full">0</span>
                    </div>
                    <div id="submission-list" class="flex-grow overflow-y-auto divide-y divide-gray-100">
                        <div class="p-8 text-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
                        </div>
                    </div>
                </div>

                <div class="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
                    <div id="submission-preview" class="h-full flex flex-col">
                        <div class="h-full flex flex-col items-center justify-center text-gray-400">
                            <i data-lucide="layout" class="w-12 h-12 mb-2 opacity-20"></i>
                            <p>Select a submission to review</p>
                        </div>
                    </div>
                </div>
            </div>

            <div id="view-manage" class="hidden flex-grow overflow-y-auto">
                <div id="challenges-list" class="space-y-4 pb-8">
                    </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();

    fetchPendingSubmissions();
    fetchActiveChallenges();
};

// --- TABS LOGIC ---
window.switchTab = (tab) => {
    const reviewView = document.getElementById('view-review');
    const manageView = document.getElementById('view-manage');
    const reviewTab = document.getElementById('tab-review');
    const manageTab = document.getElementById('tab-manage');

    if (tab === 'review') {
        reviewView.classList.remove('hidden');
        reviewView.classList.add('flex');
        manageView.classList.add('hidden');
        
        reviewTab.classList.add('text-brand-600', 'border-brand-600');
        reviewTab.classList.remove('text-gray-500');
        
        manageTab.classList.remove('text-brand-600', 'border-brand-600');
        manageTab.classList.add('text-gray-500');
    } else {
        reviewView.classList.add('hidden');
        reviewView.classList.remove('flex');
        manageView.classList.remove('hidden');

        manageTab.classList.add('text-brand-600', 'border-brand-600');
        manageTab.classList.remove('text-gray-500');

        reviewTab.classList.remove('text-brand-600', 'border-brand-600');
        reviewTab.classList.add('text-gray-500');
    }
};

// ==========================================
// 1. REVIEW QUEUE LOGIC
// ==========================================

const fetchPendingSubmissions = async () => {
    const listEl = document.getElementById('submission-list');
    
    const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`
            id, submission_url, status, created_at, points_awarded,
            challenges ( title, points_reward ),
            users!user_id ( full_name, student_id, course )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Queue Load Error:", error);
        listEl.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">Error loading queue. Check console.</div>`;
        return;
    }

    pendingSubmissions = data || [];
    updateQueueCount();

    if (pendingSubmissions.length === 0) {
        listEl.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <i data-lucide="check-circle" class="w-10 h-10 mb-2 text-green-500 opacity-50"></i>
                <p class="font-bold text-gray-600">All caught up!</p>
                <p class="text-xs">No pending submissions.</p>
            </div>`;
        renderPreviewEmpty();
        if(window.lucide) window.lucide.createIcons();
        return;
    }

    renderSubmissionList();
    selectSubmission(0);
};

const updateQueueCount = () => {
    const el = document.getElementById('queue-count');
    if(el) el.textContent = pendingSubmissions.length;
};

const renderSubmissionList = () => {
    const listEl = document.getElementById('submission-list');
    
    listEl.innerHTML = pendingSubmissions.map((sub, index) => `
        <div onclick="selectSubmission(${index})" id="sub-item-${index}" class="p-4 cursor-pointer hover:bg-blue-50 transition border-l-4 border-transparent hover:border-blue-400 group">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-gray-800 text-sm truncate w-3/4">${sub.users?.full_name || 'Unknown'}</span>
                <span class="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">${sub.users?.student_id || '-'}</span>
            </div>
            <p class="text-xs text-brand-600 font-medium mb-1 truncate">${sub.challenges?.title || 'Untitled'}</p>
            <p class="text-[10px] text-gray-400">${new Date(sub.created_at).toLocaleDateString()}</p>
        </div>
    `).join('');
};

window.selectSubmission = (index) => {
    currentSubmissionIndex = index;
    const sub = pendingSubmissions[index];

    document.querySelectorAll('#submission-list > div').forEach(el => {
        el.classList.remove('bg-blue-50', 'border-blue-600');
        el.classList.add('border-transparent');
    });
    const activeEl = document.getElementById(`sub-item-${index}`);
    if(activeEl) {
        activeEl.classList.add('bg-blue-50', 'border-blue-600');
        activeEl.classList.remove('border-transparent');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderPreview(sub);
};

const renderPreview = (sub) => {
    const previewEl = document.getElementById('submission-preview');
    if (!sub) return renderPreviewEmpty();

    const challengePoints = sub.challenges?.points_reward || 0;

    previewEl.innerHTML = `
        <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                    ${sub.users?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                    <h3 class="font-bold text-gray-900 leading-tight">${sub.users?.full_name}</h3>
                    <p class="text-xs text-gray-500">${sub.users?.course} • ${sub.users?.student_id}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xs text-gray-400 uppercase font-bold">Reward</p>
                <p class="text-xl font-black text-brand-600">${challengePoints} pts</p>
            </div>
        </div>

        <div class="flex-grow bg-gray-900 flex items-center justify-center overflow-hidden relative group">
            <a href="${sub.submission_url}" target="_blank" class="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm opacity-0 group-hover:opacity-100 transition">
                Open Original
            </a>
            <img src="${sub.submission_url}" class="max-w-full max-h-full object-contain">
        </div>

        <div class="p-6 border-t border-gray-100 bg-white">
            <div class="mb-4">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Challenge</p>
                <p class="text-gray-800 font-medium">${sub.challenges?.title}</p>
            </div>
            
            <div class="flex gap-3">
                <button onclick="processSubmission('${sub.id}', 'rejected')" class="flex-1 bg-white border-2 border-red-100 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 hover:border-red-200 transition flex items-center justify-center gap-2">
                    <i data-lucide="x-circle" class="w-5 h-5"></i> Reject
                </button>
                <button onclick="processSubmission('${sub.id}', 'approved')" class="flex-[2] bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-200 transition flex items-center justify-center gap-2">
                    <i data-lucide="check-circle" class="w-5 h-5"></i> Approve & Award ${challengePoints} pts
                </button>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

const renderPreviewEmpty = () => {
    document.getElementById('submission-preview').innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-gray-400">
            <i data-lucide="inbox" class="w-16 h-16 mb-4 opacity-20"></i>
            <p class="text-lg font-medium">No submission selected</p>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

// --- ACTION LOGIC (UPDATED WITH ADMIN ID) ---
window.processSubmission = async (id, status) => {
    const sub = pendingSubmissions.find(s => s.id === id);
    if (!sub) return;

    const btnContainer = document.querySelector('#submission-preview .flex.gap-3');
    btnContainer.innerHTML = `<div class="w-full text-center py-3 font-bold ${status === 'approved' ? 'text-green-600' : 'text-red-500'}">Processing...</div>`;

    try {
        // 1. Get Current Admin ID
        const { data: { user } } = await supabase.auth.getUser();
        const { data: adminUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

        // 2. Update Database (With Admin ID and Points)
        const { error } = await supabase
            .from('challenge_submissions')
            .update({ 
                status: status,
                points_awarded: status === 'approved' ? (sub.challenges?.points_reward || 0) : 0,
                admin_id: adminUser?.id || null, // Capture who approved it
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // 3. Advance Queue
        pendingSubmissions = pendingSubmissions.filter(s => s.id !== id);
        updateQueueCount();
        renderSubmissionList();

        if (pendingSubmissions.length > 0) {
            if (currentSubmissionIndex >= pendingSubmissions.length) {
                currentSubmissionIndex = pendingSubmissions.length - 1;
            }
            selectSubmission(currentSubmissionIndex);
        } else {
            renderSubmissionList();
        }

    } catch (error) {
        alert("Error: " + error.message);
        renderPreview(sub); // Revert UI
    }
};


// ==========================================
// 2. MANAGE CHALLENGES (CRUD)
// ==========================================

const fetchActiveChallenges = async () => {
    const listContainer = document.getElementById('challenges-list');
    
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    if (!challenges.length) {
        listContainer.innerHTML = `<div class="text-center text-gray-400 italic py-8">No challenges created yet.</div>`;
        return;
    }

    listContainer.innerHTML = challenges.map(c => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
            <div class="flex-grow">
                <div class="flex items-center gap-3 mb-1">
                    <h4 class="font-bold text-gray-900 text-lg">${c.title}</h4>
                    <span class="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">${c.points_reward} pts</span>
                    ${c.is_active 
                        ? '<span class="bg-green-100 text-green-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Active</span>'
                        : '<span class="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Inactive</span>'
                    }
                </div>
                <p class="text-sm text-gray-600 line-clamp-1">${c.description || 'No description'}</p>
            </div>
            
            <div class="flex items-center gap-3 self-end md:self-auto">
                <button onclick="toggleChallengeStatus('${c.id}', ${c.is_active})" 
                    class="px-3 py-1.5 rounded-lg text-xs font-bold border transition ${c.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}">
                    ${c.is_active ? 'Disable' : 'Enable'}
                </button>
                
                <button onclick="openChallengeModal('${c.id}')" class="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition" title="Edit">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                
                <button onclick="deleteChallenge('${c.id}')" class="text-red-400 hover:text-red-600 p-2 transition" title="Delete">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    if(window.lucide) window.lucide.createIcons();
};

window.toggleChallengeStatus = async (id, currentStatus) => {
    const { error } = await supabase
        .from('challenges')
        .update({ is_active: !currentStatus })
        .eq('id', id);

    if (error) alert("Error updating status: " + error.message);
    else fetchActiveChallenges();
};

// --- MODAL WITH CLOSE BUTTON ---
window.openChallengeModal = async (id = null) => {
    let challengeData = { title: '', points_reward: 20, description: '', image_url: '' };
    
    if (id) {
        const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
        if (error) return alert("Error fetching challenge details");
        challengeData = data;
    }

    const html = `
        <div class="p-6 relative">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
            
            <h3 class="text-xl font-bold text-gray-800 mb-4">${id ? 'Edit' : 'Create'} Challenge</h3>
            <form id="challenge-form" class="space-y-4">
                <input type="hidden" id="ch-id" value="${id || ''}">
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Title</label>
                    <input type="text" id="ch-title" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value="${challengeData.title}" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Points Reward</label>
                    <input type="number" id="ch-points" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value="${challengeData.points_reward}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                    <textarea id="ch-desc" rows="3" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">${challengeData.description || ''}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Banner Image URL (Optional)</label>
                    <input type="url" id="ch-img" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://..." value="${challengeData.image_url || ''}">
                </div>
                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 shadow-md">
                    ${id ? 'Update Challenge' : 'Create Challenge'}
                </button>
            </form>
        </div>
    `;
    window.openModal(html);
    if(window.lucide) window.lucide.createIcons();

    document.getElementById('challenge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.innerText = "Saving...";

        const cid = document.getElementById('ch-id').value;
        const payload = {
            title: document.getElementById('ch-title').value,
            points_reward: parseInt(document.getElementById('ch-points').value),
            description: document.getElementById('ch-desc').value,
            image_url: document.getElementById('ch-img').value
        };

        let error;
        if (cid) {
            // Update
            const { error: err } = await supabase.from('challenges').update(payload).eq('id', cid);
            error = err;
        } else {
            // Insert
            payload.created_by = (await supabase.auth.getUser()).data.user.id;
            payload.is_active = true;
            const { error: err } = await supabase.from('challenges').insert(payload);
            error = err;
        }

        if (!error) {
            closeModal();
            fetchActiveChallenges();
            if(!cid) switchTab('manage');
        } else {
            alert("Error: " + error.message);
            btn.disabled = false;
        }
    });
};

window.deleteChallenge = async (id) => {
    if(!confirm("Delete this challenge? This cannot be undone.")) return;
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (error) alert("Error deleting: " + error.message);
    else fetchActiveChallenges();
};
