import { supabase } from './supabase-client.js';

export const renderPromo = async (container) => {
    container.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h3 class="font-bold text-xl text-gray-800 mb-6">Give Promotional Points</h3>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <label class="block text-xs font-bold text-gray-700 mb-2 uppercase">Find Student</label>
                <div class="flex gap-3">
                    <input type="text" id="promo-search" placeholder="Enter Student ID (e.g. 2023001) or Email" class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none">
                    <button id="btn-search-promo" class="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition">
                        Search
                    </button>
                </div>
                <p id="promo-search-error" class="text-red-500 text-sm mt-2 hidden"></p>
            </div>

            <div id="promo-result" class="hidden bg-white p-8 rounded-xl shadow-sm border border-green-100 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                
                <div class="flex items-start gap-4 mb-6">
                    <img id="pr-img" src="" class="w-16 h-16 rounded-full object-cover border-2 border-gray-100">
                    <div>
                        <h4 id="pr-name" class="text-xl font-bold text-gray-900"></h4>
                        <p id="pr-id" class="text-gray-500 text-sm font-mono"></p>
                        <p id="pr-course" class="text-gray-400 text-xs mt-1 uppercase font-bold"></p>
                    </div>
                    <div class="ml-auto text-right">
                        <p class="text-xs text-gray-500 uppercase font-bold">Current Balance</p>
                        <p id="pr-points" class="text-3xl font-black text-green-600"></p>
                    </div>
                </div>

                <hr class="border-gray-100 my-6">

                <div id="promo-error-box" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-bold"></div>

                <form id="promo-form" class="space-y-4">
                    <input type="hidden" id="pr-user-uuid">
                    
                    <div>
                        <label class="block text-xs font-bold text-green-700 mb-1 uppercase">Points to Add</label>
                        <input type="number" id="pr-amount" class="w-full p-3 border border-green-200 rounded-lg text-green-700 font-bold text-lg focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="0" required min="1">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Reason / Campaign Name</label>
                        <textarea id="pr-reason" rows="2" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none" placeholder="e.g. Winner of Art Competition, Volunteer Bonus..." required></textarea>
                    </div>

                    <div class="bg-green-50 p-3 rounded text-green-700 text-xs flex items-center gap-2">
                        <i data-lucide="gift" class="w-4 h-4"></i>
                        <span>Points will be added immediately and logged in history.</span>
                    </div>

                    <button type="submit" id="btn-promo-submit" class="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition shadow-lg shadow-green-200">
                        Grant Points
                    </button>
                </form>
            </div>
        </div>
    `;
    
    if(window.lucide) window.lucide.createIcons();

    // Attach Listeners
    document.getElementById('btn-search-promo').addEventListener('click', searchUserForPromo);
    document.getElementById('promo-form').addEventListener('submit', handlePromoSubmit);
};

const searchUserForPromo = async () => {
    const input = document.getElementById('promo-search').value.trim();
    const errEl = document.getElementById('promo-search-error');
    const resEl = document.getElementById('promo-result');
    
    if(!input) return;

    errEl.classList.add('hidden');
    resEl.classList.add('hidden');

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`student_id.eq.${input},email.eq.${input}`)
        .single();

    if (error || !user) {
        errEl.textContent = "User not found.";
        errEl.classList.remove('hidden');
        return;
    }

    document.getElementById('pr-user-uuid').value = user.id;
    document.getElementById('pr-img').src = user.profile_img_url || 'https://placehold.co/100';
    document.getElementById('pr-name').textContent = user.full_name;
    document.getElementById('pr-id').textContent = user.student_id;
    document.getElementById('pr-course').textContent = user.course;
    document.getElementById('pr-points').textContent = user.current_points;

    resEl.classList.remove('hidden');
};

const handlePromoSubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-promo-submit');
    const errBox = document.getElementById('promo-error-box');
    const uid = document.getElementById('pr-user-uuid').value;
    const amount = parseInt(document.getElementById('pr-amount').value);
    const reason = document.getElementById('pr-reason').value;

    errBox.classList.add('hidden');

    if (!confirm(`Grant ${amount} points to this student?`)) return;

    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Session expired. Please re-login.");

        const { data, error } = await supabase.rpc('admin_give_promo_points', {
            p_admin_id: user.id,
            p_target_user_id: uid,
            p_amount: amount,
            p_reason: reason
        });

        if (error) throw error;

        alert(`Success! Points added.\nNew Balance: ${data.new_balance}`);
        
        // Reset
        document.getElementById('promo-result').classList.add('hidden');
        document.getElementById('promo-search').value = '';

    } catch (err) {
        console.error(err);
        errBox.textContent = "Error: " + err.message;
        errBox.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerText = "Grant Points";
    }
};
