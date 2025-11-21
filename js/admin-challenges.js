import { supabase } from './supabase-client.js';

// =======================
// 1. RENDER MAIN PAGE
// =======================
export const renderChallenges = async (container) => {
    // Fetch Challenges
    const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

    // Fetch Quizzes
    const { data: quizzes } = await supabase
        .from('daily_quizzes')
        .select('*')
        .order('available_date', { ascending: false });

    container.innerHTML = `
        <!-- Tabs -->
        <div class="flex space-x-6 mb-6 border-b border-gray-200">
            <button onclick="switchTab('challenges-tab')" id="btn-challenges-tab" class="tab-btn active pb-3 border-b-2 border-brand-600 font-bold text-brand-600 text-lg">
                Challenges
            </button>
            <button onclick="switchTab('quizzes-tab')" id="btn-quizzes-tab" class="tab-btn pb-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-lg font-medium">
                Daily Quizzes
            </button>
        </div>

        <!-- CHALLENGES TAB -->
        <div id="challenges-tab" class="tab-content">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-xl text-gray-800">Active Challenges</h3>
                <button onclick="openChallengeModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all">
                    <i data-lucide="plus" class="w-4 h-4"></i> Create Challenge
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th class="p-4">Title</th>
                            <th class="p-4">Type</th>
                            <th class="p-4">Reward</th>
                            <th class="p-4">Status</th>
                            <th class="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${challenges.map(c => `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4">
                                    <div class="font-bold text-gray-900">${c.title}</div>
                                    <div class="text-xs text-gray-500 truncate max-w-xs">${c.description || ''}</div>
                                </td>
                                <td class="p-4"><span class="capitalize bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-700">${c.type}</span></td>
                                <td class="p-4 font-bold text-green-600">+${c.points_reward} pts</td>
                                <td class="p-4">
                                    <span class="px-2 py-1 rounded text-xs font-bold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                        ${c.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td class="p-4 text-right flex justify-end gap-2">
                                    <button onclick="openReviewModal('${c.id}', '${c.title}')" class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1">
                                        <i data-lucide="check-circle" class="w-3 h-3"></i> Review
                                    </button>
                                    <button onclick="openChallengeModal('${c.id}')" class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-200 transition">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- QUIZZES TAB -->
        <div id="quizzes-tab" class="tab-content hidden">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-xl text-gray-800">Daily Quizzes</h3>
                <button onclick="openQuizModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all">
                    <i data-lucide="plus" class="w-4 h-4"></i> Create Quiz
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th class="p-4">Date</th>
                            <th class="p-4">Question</th>
                            <th class="p-4">Reward</th>
                            <th class="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${quizzes.map(q => `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4 font-mono text-xs text-gray-500 font-bold">
                                    ${new Date(q.available_date).toLocaleDateString()}
                                </td>
                                <td class="p-4">
                                    <div class="font-medium text-gray-900 truncate max-w-md" title="${q.question}">${q.question}</div>
                                    <div class="text-xs text-gray-400 mt-1">Answer: Option ${q.correct_option_index + 1}</div>
                                </td>
                                <td class="p-4 font-bold text-green-600">+${q.points_reward} pts</td>
                                <td class="p-4 text-right flex justify-end gap-2">
                                    <button onclick="viewQuizResults('${q.id}')" class="bg-purple-50 text-purple-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1">
                                        <i data-lucide="bar-chart-2" class="w-3 h-3"></i> Results
                                    </button>
                                    <button onclick="openQuizModal('${q.id}')" class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-200 transition">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

// Tab Switcher Logic
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('border-brand-600', 'text-brand-600');
        el.classList.add('border-transparent', 'text-gray-500');
    });
    
    const activeBtn = document.getElementById('btn-' + tabId);
    activeBtn.classList.remove('border-transparent', 'text-gray-500');
    activeBtn.classList.add('border-brand-600', 'text-brand-600');
};


// =======================
// 2. CHALLENGE MODALS
// =======================

// Create/Edit Challenge
window.openChallengeModal = async (id = null) => {
    let data = { title: '', description: '', type: 'Upload', points_reward: 20, is_active: true };
    if (id) {
        const { data: existing } = await supabase.from('challenges').select('*').eq('id', id).single();
        if(existing) data = existing;
    }

    const html = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-800">${id ? 'Edit Challenge' : 'Create Challenge'}</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <form id="challenge-form" class="space-y-4">
                <div>
                    <label class="label">Title</label>
                    <input type="text" id="ch-title" value="${data.title}" class="input-field" required>
                </div>
                <div>
                    <label class="label">Description</label>
                    <textarea id="ch-desc" class="input-field" rows="3" required>${data.description || ''}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="label">Type</label>
                        <select id="ch-type" class="input-field">
                            <option value="Upload" ${data.type === 'Upload' ? 'selected' : ''}>Photo Upload</option>
                            <option value="Standard" ${data.type === 'Standard' ? 'selected' : ''}>Standard</option>
                        </select>
                    </div>
                    <div>
                        <label class="label">Points Reward</label>
                        <input type="number" id="ch-points" value="${data.points_reward}" class="input-field font-bold text-green-600" required>
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-2 bg-gray-50 p-3 rounded">
                    <input type="checkbox" id="ch-active" ${data.is_active ? 'checked' : ''} class="w-5 h-5 text-brand-600 rounded">
                    <label for="ch-active" class="text-sm font-bold text-gray-700">Challenge is Active</label>
                </div>
                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 mt-4">
                    ${id ? 'Update Challenge' : 'Create Challenge'}
                </button>
            </form>
        </div>
        <style>
            .label { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; margin-bottom: 4px; uppercase; }
            .input-field { width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; }
        </style>
    `;
    openModal(html);

    document.getElementById('challenge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById('ch-title').value,
            description: document.getElementById('ch-desc').value,
            type: document.getElementById('ch-type').value,
            points_reward: parseInt(document.getElementById('ch-points').value),
            is_active: document.getElementById('ch-active').checked
        };

        const { error } = id 
            ? await supabase.from('challenges').update(payload).eq('id', id)
            : await supabase.from('challenges').insert(payload);

        if (error) alert('Error: ' + error.message);
        else { closeModal(); renderChallenges(document.getElementById('view-container')); }
    });
};

// Review Submissions
window.openReviewModal = async (challengeId, title) => {
    const { data: subs } = await supabase
        .from('challenge_submissions')
        .select('*, users(full_name, student_id)')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

    const html = `
        <div class="flex flex-col h-full bg-gray-50">
            <div class="p-6 border-b bg-white sticky top-0 z-10 flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Review Submissions</h3>
                    <p class="text-xs text-gray-500">for "${title}"</p>
                </div>
                <button onclick="closeModal()" class="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div class="p-6 overflow-y-auto space-y-4">
                ${subs.length === 0 ? '<p class="text-center text-gray-500">No submissions found.</p>' : ''}
                ${subs.map(s => `
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-start">
                        ${s.submission_url 
                            ? `<a href="${s.submission_url}" target="_blank" class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden block border hover:opacity-80 flex-shrink-0">
                                 <img src="${s.submission_url}" class="w-full h-full object-cover">
                               </a>`
                            : `<div class="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs flex-shrink-0">No Image</div>`
                        }
                        <div class="flex-1">
                            <div class="flex justify-between">
                                <div>
                                    <h4 class="font-bold text-gray-900">${s.users.full_name}</h4>
                                    <p class="text-xs text-gray-500">${s.users.student_id}</p>
                                </div>
                                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                    s.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }">${s.status}</span>
                            </div>
                            
                            <p class="text-xs text-gray-400 mt-2 mb-3">Submitted: ${new Date(s.created_at).toLocaleString()}</p>
                            
                            ${s.status === 'pending' ? `
                                <div class="flex gap-2">
                                    <button onclick="decideSubmission('${s.id}', 'approved', '${challengeId}', '${title}')" class="bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-green-700">Approve</button>
                                    <button onclick="decideSubmission('${s.id}', 'rejected', '${challengeId}', '${title}')" class="bg-red-100 text-red-600 px-4 py-1.5 rounded text-xs font-bold hover:bg-red-200">Reject</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    openModal(html);
};

window.decideSubmission = async (subId, status, cId, cTitle) => {
    if (!confirm(`Mark this submission as ${status}?`)) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    // Get admin ID from public.users
    const { data: adminUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

    const { error } = await supabase
        .from('challenge_submissions')
        .update({ status: status, admin_id: adminUser?.id })
        .eq('id', subId);

    if (error) alert('Error: ' + error.message);
    else openReviewModal(cId, cTitle); // Refresh modal
};


// =======================
// 3. QUIZ MODALS
// =======================

window.openQuizModal = async (id = null) => {
    let data = { 
        question: '', 
        options: ['','','',''], 
        correct_option_index: 0, 
        points_reward: 15, 
        available_date: new Date().toISOString().split('T')[0] 
    };

    if (id) {
        const { data: existing } = await supabase.from('daily_quizzes').select('*').eq('id', id).single();
        if(existing) {
            data = existing;
            // Parse options if stored as JSON string, or use directly if JSONB
            if (typeof data.options === 'string') data.options = JSON.parse(data.options);
        }
    }

    const html = `
        <div class="p-6 h-full flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-800">${id ? 'Edit Quiz' : 'Create Quiz'}</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <form id="quiz-form" class="space-y-4 flex-grow overflow-y-auto p-1">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="label">Available Date</label>
                        <input type="date" id="q-date" value="${data.available_date}" class="input-field" required>
                    </div>
                    <div>
                        <label class="label">Points Reward</label>
                        <input type="number" id="q-points" value="${data.points_reward}" class="input-field font-bold text-green-600" required>
                    </div>
                </div>
                <div>
                    <label class="label">Question</label>
                    <textarea id="q-question" class="input-field" rows="2" required>${data.question}</textarea>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label class="label mb-2">Options</label>
                    <div class="space-y-3">
                        ${[0, 1, 2, 3].map(i => `
                            <div class="flex items-center gap-2">
                                <input type="radio" name="correct_option" value="${i}" ${data.correct_option_index === i ? 'checked' : ''} title="Select as Correct Answer">
                                <input type="text" class="input-field q-option" value="${data.options[i] || ''}" placeholder="Option ${i+1}" required>
                            </div>
                        `).join('')}
                    </div>
                    <p class="text-xs text-gray-400 mt-2">Select the radio button next to the correct answer.</p>
                </div>

                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 mt-4">
                    ${id ? 'Update Quiz' : 'Create Quiz'}
                </button>
            </form>
        </div>
        <style>
            .label { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; margin-bottom: 4px; uppercase; }
            .input-field { width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; }
        </style>
    `;
    openModal(html);

    document.getElementById('quiz-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Collect Options
        const optionInputs = document.querySelectorAll('.q-option');
        const options = Array.from(optionInputs).map(inp => inp.value);
        
        // Get Correct Index
        const correctIndex = parseInt(document.querySelector('input[name="correct_option"]:checked').value);

        const payload = {
            question: document.getElementById('q-question').value,
            options: options, // JSONB handles array automatically
            correct_option_index: correctIndex,
            points_reward: parseInt(document.getElementById('q-points').value),
            available_date: document.getElementById('q-date').value
        };

        const { error } = id 
            ? await supabase.from('daily_quizzes').update(payload).eq('id', id)
            : await supabase.from('daily_quizzes').insert(payload);

        if (error) alert('Error: ' + error.message);
        else { closeModal(); renderChallenges(document.getElementById('view-container')); }
    });
};

// View Quiz Results
window.viewQuizResults = async (quizId) => {
    const { data: results } = await supabase
        .from('quiz_submissions')
        .select('*, users(full_name, student_id)')
        .eq('quiz_id', quizId)
        .order('submitted_at', { ascending: false });

    const html = `
        <div class="flex flex-col h-full bg-white">
            <div class="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                <h3 class="text-xl font-bold text-gray-800">Quiz Results</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div class="p-0 flex-grow overflow-y-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                            <th class="p-4">Student</th>
                            <th class="p-4">Result</th>
                            <th class="p-4 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${results.length === 0 ? '<tr><td colspan="3" class="p-4 text-center text-gray-500">No attempts yet.</td></tr>' : ''}
                        ${results.map(r => `
                            <tr>
                                <td class="p-4">
                                    <div class="font-bold text-gray-900">${r.users.full_name}</div>
                                    <div class="text-xs text-gray-500">${r.users.student_id}</div>
                                </td>
                                <td class="p-4">
                                    <span class="px-2 py-1 rounded text-xs font-bold ${r.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                        ${r.is_correct ? 'Correct' : 'Wrong'}
                                    </span>
                                </td>
                                <td class="p-4 text-right text-gray-500 text-xs">
                                    ${new Date(r.submitted_at).toLocaleTimeString()}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    openModal(html);
};
