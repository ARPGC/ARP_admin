import { supabase } from './supabase-client.js';

export const renderChallenges = async (container) => {
    const { data: challenges } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    const { data: quizzes } = await supabase.from('daily_quizzes').select('*').order('available_date', { ascending: false });

    container.innerHTML = `
        <div class="flex space-x-6 mb-6 border-b border-gray-200">
            <button onclick="switchTab('challenges-tab')" id="btn-challenges-tab" class="tab-btn active pb-3 border-b-2 border-brand-600 font-bold text-brand-600 text-lg">Challenges</button>
            <button onclick="switchTab('quizzes-tab')" id="btn-quizzes-tab" class="tab-btn pb-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-lg font-medium">Daily Quizzes</button>
        </div>

        <div id="challenges-tab" class="tab-content">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-xl text-gray-800">Active Challenges</h3>
                <button onclick="openChallengeModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all"><i data-lucide="plus" class="w-4 h-4"></i> Create</button>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b"><tr><th class="p-4">Title</th><th class="p-4">Reward</th><th class="p-4">Status</th><th class="p-4 text-right">Actions</th></tr></thead>
                    <tbody class="divide-y divide-gray-100">
                        ${(challenges || []).map(c => `
                            <tr>
                                <td class="p-4 font-bold text-gray-900">${c.title}</td>
                                <td class="p-4 font-bold text-green-600">+${c.points_reward} pts</td>
                                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
                                <td class="p-4 text-right"><button onclick="openReviewModal('${c.id}', '${c.title}')" class="text-blue-600 font-bold text-xs mr-3">Review</button><button onclick="openChallengeModal('${c.id}')" class="text-gray-600 font-bold text-xs">Edit</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="quizzes-tab" class="tab-content hidden">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-xl text-gray-800">Daily Quizzes</h3>
                <button onclick="openQuizModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all"><i data-lucide="plus" class="w-4 h-4"></i> Create</button>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b"><tr><th class="p-4">Date</th><th class="p-4">Question</th><th class="p-4">Reward</th><th class="p-4 text-right">Actions</th></tr></thead>
                    <tbody class="divide-y divide-gray-100">
                        ${(quizzes || []).map(q => `
                            <tr>
                                <td class="p-4 font-bold text-gray-500">${q.available_date}</td>
                                <td class="p-4 truncate max-w-xs">${q.question}</td>
                                <td class="p-4 font-bold text-green-600">+${q.points_reward} pts</td>
                                <td class="p-4 text-right"><button onclick="openQuizModal('${q.id}')" class="text-gray-600 font-bold text-xs">Edit</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(el => { el.classList.remove('border-brand-600', 'text-brand-600'); el.classList.add('border-transparent', 'text-gray-500'); });
    document.getElementById('btn-' + tabId).classList.add('border-brand-600', 'text-brand-600');
};

window.openChallengeModal = async (id = null) => {
    let data = { title: '', description: '', type: 'Upload', points_reward: 20, is_active: true };
    if (id) { const { data: existing } = await supabase.from('challenges').select('*').eq('id', id).single(); if(existing) data = existing; }

    const html = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6"><h3 class="text-xl font-bold">${id ? 'Edit' : 'Create'} Challenge</h3><button onclick="closeModal()">X</button></div>
            <form id="challenge-form" class="space-y-4">
                <input type="text" id="ch-title" value="${data.title}" class="w-full border p-2 rounded" placeholder="Title" required>
                <textarea id="ch-desc" class="w-full border p-2 rounded" rows="3" placeholder="Description">${data.description}</textarea>
                <div class="grid grid-cols-2 gap-4">
                    <select id="ch-type" class="border p-2 rounded"><option value="Upload">Photo Upload</option><option value="Standard">Standard</option></select>
                    <input type="number" id="ch-points" value="${data.points_reward}" class="border p-2 rounded" required>
                </div>
                <div class="flex items-center gap-2"><input type="checkbox" id="ch-active" ${data.is_active ? 'checked' : ''}><label>Active</label></div>
                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded mt-4">Save</button>
            </form>
        </div>
    `;
    openModal(html);
    
    document.getElementById('challenge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = { title: document.getElementById('ch-title').value, description: document.getElementById('ch-desc').value, type: document.getElementById('ch-type').value, points_reward: document.getElementById('ch-points').value, is_active: document.getElementById('ch-active').checked };
        const { error } = id ? await supabase.from('challenges').update(payload).eq('id', id) : await supabase.from('challenges').insert(payload);
        if(!error) { closeModal(); renderChallenges(document.getElementById('view-container')); }
    });
};

window.openReviewModal = async (cId, title) => {
    const { data: subs } = await supabase.from('challenge_submissions').select('*, users!user_id(full_name)').eq('challenge_id', cId).eq('status', 'pending');
    
    const html = `
        <div class="p-6 h-full flex flex-col"><div class="flex justify-between mb-4"><h3 class="font-bold">Reviews: ${title}</h3><button onclick="closeModal()">X</button></div>
        <div class="flex-grow overflow-y-auto space-y-4">
            ${(subs || []).length === 0 ? '<p>No pending submissions.</p>' : ''}
            ${(subs || []).map(s => `
                <div class="border p-4 rounded flex gap-4">
                    <a href="${s.submission_url}" target="_blank"><img src="${s.submission_url}" class="w-20 h-20 object-cover bg-gray-100"></a>
                    <div>
                        <p class="font-bold">${s.users?.full_name}</p>
                        <div class="flex gap-2 mt-2"><button onclick="decideSubmission('${s.id}', 'approved')" class="bg-green-600 text-white px-3 py-1 rounded text-xs">Approve</button><button onclick="decideSubmission('${s.id}', 'rejected')" class="bg-gray-200 px-3 py-1 rounded text-xs">Reject</button></div>
                    </div>
                </div>
            `).join('')}
        </div></div>
    `;
    openModal(html);
};

window.decideSubmission = async (id, status) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
    await supabase.from('challenge_submissions').update({ status, admin_id: admin.id }).eq('id', id);
    closeModal();
};

window.openQuizModal = async (id = null) => {
    // Basic Quiz Modal Implementation
    const html = `<div class="p-6"><h3 class="font-bold mb-4">Quiz Editor</h3><p>Use Supabase dashboard for complex quiz edits for now.</p></div>`;
    openModal(html);
};
