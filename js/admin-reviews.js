import { supabase } from './supabase-client.js';

export const renderReviews = async (container) => {
    // Fetch Pending
    const { data: submissions } = await supabase.from('challenge_submissions').select('*, users(full_name), challenges(title, points_reward)').eq('status', 'pending');

    container.innerHTML = `
        <h3 class="font-bold text-lg mb-4">Pending Challenge Approvals</h3>
        ${submissions.length === 0 ? '<p class="text-gray-500">No pending reviews.</p>' : ''}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${submissions.map(sub => `
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex gap-4">
                    <a href="${sub.submission_url}" target="_blank" class="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden block hover:opacity-80">
                        <img src="${sub.submission_url}" class="w-full h-full object-cover">
                    </a>
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-900">${sub.challenges.title}</h4>
                        <p class="text-sm text-gray-500 mb-1">by ${sub.users.full_name}</p>
                        <div class="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold mb-3">${sub.challenges.points_reward} Pts</div>
                        <div class="flex gap-2">
                            <button onclick="reviewSub('${sub.id}', 'approved')" class="flex-1 bg-green-600 text-white py-1.5 rounded text-xs font-bold hover:bg-green-700">Approve</button>
                            <button onclick="reviewSub('${sub.id}', 'rejected')" class="flex-1 bg-red-100 text-red-600 py-1.5 rounded text-xs font-bold hover:bg-red-200">Reject</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <hr class="my-8">
        
        <div class="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 class="font-bold text-lg text-green-900 mb-2">Log Plastic Waste</h3>
            <p class="text-sm text-green-700 mb-4">Manually log recycled plastic for a user.</p>
            <form id="plastic-form" class="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Student ID (e.g. 1234567)" class="p-2 rounded border" required>
                <input type="number" placeholder="Weight (KG)" class="p-2 rounded border" step="0.1" required>
                <select class="p-2 rounded border"><option>PET Bottles</option><option>Wrappers</option></select>
                <button type="submit" class="bg-green-600 text-white font-bold rounded hover:bg-green-700">Submit Log</button>
            </form>
        </div>
    `;
    
    window.reviewSub = async (id, status) => {
        // Admin ID injection for audit trail would happen here in real auth scenario
        const { error } = await supabase.from('challenge_submissions').update({ status }).eq('id', id);
        if(!error) renderReviews(container);
    };
};

export const renderChallenges = async (container) => {
    // Similar structure to Events: Table of Challenges + Create Button + Edit Modal
    container.innerHTML = `<div class="p-10 text-center text-gray-500">Challenge & Quiz CRUD interfaces would go here following the same pattern as Events.</div>`;
};
