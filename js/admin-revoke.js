import { supabase } from './supabase-client.js';

export const renderRevoke = async (container) => {
    container.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h3 class="font-bold text-xl text-gray-800 mb-6">Revoke User Points</h3>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <label class="block text-xs font-bold text-gray-700 mb-2 uppercase">Find Student</label>
                <div class="flex gap-3">
                    <input type="text" id="revoke-search" placeholder="Enter Student ID (e.g. 2023001) or Email" class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none">
                    <button onclick="searchUserForRevoke()" class="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition">
                        Search
                    </button>
                </div>
                <p id="search-error" class="text-red-500 text-sm mt-2 hidden"></p>
            </div>

            <div id="revoke-result" class="hidden bg-white p-8 rounded-xl shadow-sm border border-red-100 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                
                <div class="flex items-start gap-4 mb-6">
                    <img id="rv-img" src="" class="w-16 h-16 rounded-full object-cover border-2 border-gray-100">
                    <div>
                        <h4 id="rv-name" class="text-xl font-bold text-gray-900"></h4>
                        <p id="rv-id" class="text-gray-500 text-sm font-mono"></p>
                        <p id="rv-course" class="text-gray-400 text-xs mt-1 uppercase font-bold"></p>
                    </div>
                    <div class="ml-auto text-right">
                        <p class="text-xs text-gray-500 uppercase font-bold">Current Balance</p>
                        <p id="rv-points" class="text-3xl font-black text-green-600"></p>
                    </div>
                </div>

                <hr class="border-gray-100 my-6">

                <form id="revoke-form" class="space-y-4">
                    <input type="hidden" id="rv-user-uuid">
                    
                    <div>
                        <label class="block text-xs font-bold text-red-700 mb-1 uppercase">Points to Remove</label>
                        <input type="number" id="rv-amount" class="w-full p-3 border border-red-200 rounded-lg text-red-600 font-bold text-lg focus:ring-2 focus:ring-red-500 focus:outline-none" placeholder="0" required min="1">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Reason for Revocation</label>
                        <textarea id="rv-reason" rows="2" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none" placeholder="e.g. Disciplinary action, Error correction..." required></textarea>
                    </div>

                    <div class="bg-red-50 p-3 rounded text-red-700 text-xs flex items-center gap-2">
                        <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                        <span>This action is irreversible and will be logged in the user's history.</span>
                    </div>

                    <button type="submit" id="btn-revoke-submit" class="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-lg shadow-red-200">
                        Confirm Revocation
                    </button>
                </form>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

window.searchUserForRevoke = async () => {
    const input = document.getElementById('revoke-search').value.trim();
    const errEl = document.getElementById('search-error');
    const resEl = document.getElementById('revoke-result');
    
    if(!input) return;

    errEl.classList.add('hidden');
    resEl.classList.add('hidden');

    // Search by Student ID OR Email
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`student_id.eq.${input},email.eq.${input}`)
        .single();

    if (error || !user) {
        errEl.textContent = "User not found. Please check Student ID or Email.";
        errEl.classList.remove('hidden');
        return;
    }

    // Populate UI
    document.getElementById('rv-user-uuid').value = user.id;
    document.getElementById('rv-img').src = user.profile_img_url || 'https://placehold.co/100';
    document.getElementById('rv-name').textContent = user.full_name;
    document.getElementById('rv-id').textContent = user.student_id;
    document.getElementById('rv-course').textContent = user.course;
    document.getElementById('rv-points').textContent = user.current_points;

    // Show Result
    resEl.classList.remove('hidden');
    resEl.classList.add('animate-fade-in');
};

// Handle Form Submit
setTimeout(() => {
    // We attach the listener here to ensure DOM exists after render
    const form = document.getElementById('revoke-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('btn-revoke-submit');
            const uid = document.getElementById('rv-user-uuid').value;
            const amount = parseInt(document.getElementById('rv-amount').value);
            const reason = document.getElementById('rv-reason').value;

            if (!confirm(`Are you sure you want to deduct ${amount} points from this user?`)) return;

            btn.disabled = true;
            btn.innerText = "Processing...";

            try {
                // Get Admin ID
                const { data: { user } } = await supabase.auth.getUser();
                
                const { data, error } = await supabase.rpc('admin_revoke_points', {
                    p_admin_id: user.id, // Only for logging purposes if needed
                    p_target_user_id: uid,
                    p_amount: amount,
                    p_reason: reason
                });

                if (error) throw error;

                alert(`Success! Points revoked. New Balance: ${data.new_balance}`);
                
                // Reset UI
                document.getElementById('revoke-result').classList.add('hidden');
                document.getElementById('revoke-search').value = '';

            } catch (err) {
                console.error(err);
                alert("Error: " + err.message);
                btn.disabled = false;
                btn.innerText = "Confirm Revocation";
            }
        });
    }
}, 500); // Small delay to ensure render completes
