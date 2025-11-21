import { supabase } from './supabase-client.js';

// =======================
// 1. RENDER COUPONS LIST
// =======================
export const renderCodes = async (container) => {
    const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching coupons:', error);

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">Coupon Management</h3>
            <button onclick="openCouponModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all">
                <i data-lucide="plus" class="w-4 h-4"></i> Create Coupon
            </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th class="p-4">Code</th>
                            <th class="p-4">Reward</th>
                            <th class="p-4">Usage</th>
                            <th class="p-4">Validity</th>
                            <th class="p-4">Status</th>
                            <th class="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${coupons.map(c => {
                            const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
                            const isFullyRedeemed = c.max_redemptions && c.redeemed_count >= c.max_redemptions;
                            
                            let statusBadge = '';
                            if (!c.is_active) statusBadge = '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Inactive</span>';
                            else if (isExpired) statusBadge = '<span class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">Expired</span>';
                            else if (isFullyRedeemed) statusBadge = '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Depleted</span>';
                            else statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span>';

                            return `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4">
                                    <div class="font-mono font-bold text-gray-800 text-base">${c.code}</div>
                                    <div class="text-xs text-gray-500 truncate max-w-[200px]">${c.description || 'No description'}</div>
                                </td>
                                <td class="p-4">
                                    <div class="font-bold text-green-600">
                                        ${c.points_fixed ? `${c.points_fixed} pts` : `${c.points_min} - ${c.points_max} pts`}
                                    </div>
                                    <div class="text-xs text-gray-400">${c.points_fixed ? 'Fixed' : 'Random Range'}</div>
                                </td>
                                <td class="p-4 text-gray-600">
                                    <span class="font-bold text-gray-900">${c.redeemed_count}</span> / ${c.max_redemptions || '∞'}
                                </td>
                                <td class="p-4 text-xs text-gray-500">
                                    <div>Start: ${c.valid_from ? new Date(c.valid_from).toLocaleDateString() : 'Anytime'}</div>
                                    <div>End: ${c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'Never'}</div>
                                </td>
                                <td class="p-4">${statusBadge}</td>
                                <td class="p-4 text-right">
                                    <button onclick="openCouponModal('${c.id}')" class="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200 transition"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

// =======================
// 2. COUPON MODAL
// =======================
window.openCouponModal = async (couponId = null) => {
    let coupon = { 
        code: '', description: '', points_fixed: 10, points_min: null, points_max: null, 
        max_redemptions: '', per_user_limit: 1, valid_from: '', valid_until: '', is_active: true 
    };
    
    let rewardType = 'fixed'; // Default

    if (couponId) {
        const { data } = await supabase.from('coupons').select('*').eq('id', couponId).single();
        if (data) {
            coupon = data;
            // Convert timestamps to YYYY-MM-DDTHH:MM for input type="datetime-local"
            if(coupon.valid_from) coupon.valid_from = new Date(coupon.valid_from).toISOString().slice(0, 16);
            if(coupon.valid_until) coupon.valid_until = new Date(coupon.valid_until).toISOString().slice(0, 16);
            
            if (coupon.points_min !== null) rewardType = 'random';
        }
    }

    const html = `
        <div class="relative flex flex-col h-full">
            <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h3 class="text-xl font-bold text-gray-800">${couponId ? 'Edit Coupon' : 'Create Coupon'}</h3>
                <button onclick="closeModal()" class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>

            <div class="p-6 overflow-y-auto flex-grow bg-gray-50">
                <form id="coupon-form" class="space-y-6 max-w-3xl mx-auto">
                    
                    <!-- Basic Info -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div class="grid grid-cols-1 gap-6">
                            <div>
                                <label class="label">Coupon Code (Unique)</label>
                                <input type="text" id="c-code" value="${coupon.code}" class="input-field font-mono uppercase tracking-widest" placeholder="SUMMER2025" required>
                            </div>
                            <div>
                                <label class="label">Description</label>
                                <textarea id="c-desc" class="input-field" rows="2" placeholder="What is this coupon for?">${coupon.description || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Points Configuration -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Reward Configuration</h4>
                        
                        <div class="flex gap-6 mb-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="rewardType" value="fixed" ${rewardType === 'fixed' ? 'checked' : ''} onchange="toggleRewardInputs()">
                                <span class="text-sm font-medium">Fixed Amount</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="rewardType" value="random" ${rewardType === 'random' ? 'checked' : ''} onchange="toggleRewardInputs()">
                                <span class="text-sm font-medium">Random Range</span>
                            </label>
                        </div>

                        <div id="fixed-input-group" class="${rewardType === 'fixed' ? '' : 'hidden'}">
                            <label class="label">Points Amount</label>
                            <input type="number" id="c-points-fixed" value="${coupon.points_fixed || 10}" class="input-field w-1/2 font-bold text-green-600">
                        </div>

                        <div id="random-input-group" class="grid grid-cols-2 gap-4 ${rewardType === 'random' ? '' : 'hidden'}">
                            <div>
                                <label class="label">Min Points</label>
                                <input type="number" id="c-points-min" value="${coupon.points_min || 5}" class="input-field">
                            </div>
                            <div>
                                <label class="label">Max Points</label>
                                <input type="number" id="c-points-max" value="${coupon.points_max || 50}" class="input-field">
                            </div>
                        </div>
                    </div>

                    <!-- Limits & Validity -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Limits & Validity</h4>
                        <div class="grid grid-cols-2 gap-6 mb-4">
                            <div>
                                <label class="label">Total Max Redemptions</label>
                                <input type="number" id="c-max-total" value="${coupon.max_redemptions || ''}" class="input-field" placeholder="Unlimited">
                            </div>
                            <div>
                                <label class="label">Limit Per User</label>
                                <input type="number" id="c-max-user" value="${coupon.per_user_limit || 1}" class="input-field" placeholder="1">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="label">Valid From</label>
                                <input type="datetime-local" id="c-valid-from" value="${coupon.valid_from}" class="input-field text-sm">
                            </div>
                            <div>
                                <label class="label">Valid Until</label>
                                <input type="datetime-local" id="c-valid-until" value="${coupon.valid_until}" class="input-field text-sm">
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 p-4 bg-gray-100 rounded-lg border border-gray-200">
                        <input type="checkbox" id="c-active" ${coupon.is_active ? 'checked' : ''} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer">
                        <label for="c-active" class="font-medium text-gray-700 cursor-pointer select-none">Coupon is Active</label>
                    </div>
                </form>
            </div>

            <div class="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                <button id="save-coupon-btn" class="w-full bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-700 shadow-lg transition-all">
                    ${couponId ? 'Update Coupon' : 'Create Coupon'}
                </button>
            </div>
        </div>
        <style>
            .label { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; margin-bottom: 0.4rem; }
            .input-field { width: 100%; border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.9rem; transition: all 0.2s; }
            .input-field:focus { outline: none; border-color: #16a34a; ring: 2px solid #dcfce7; }
        </style>
    `;
    openModal(html);

    // Save Logic
    document.getElementById('save-coupon-btn').addEventListener('click', async () => {
        const btn = document.getElementById('save-coupon-btn');
        btn.disabled = true; btn.innerText = 'Processing...';

        try {
            const type = document.querySelector('input[name="rewardType"]:checked').value;
            const code = document.getElementById('c-code').value.toUpperCase().trim();
            
            if(!code) throw new Error("Coupon Code is required");

            const payload = {
                code: code,
                description: document.getElementById('c-desc').value,
                max_redemptions: document.getElementById('c-max-total').value || null,
                per_user_limit: document.getElementById('c-max-user').value || 1,
                valid_from: document.getElementById('c-valid-from').value || null,
                valid_until: document.getElementById('c-valid-until').value || null,
                is_active: document.getElementById('c-active').checked,
                // Logic for Fixed vs Random
                points_fixed: type === 'fixed' ? document.getElementById('c-points-fixed').value : null,
                points_min: type === 'random' ? document.getElementById('c-points-min').value : null,
                points_max: type === 'random' ? document.getElementById('c-points-max').value : null,
            };

            let error;
            if (couponId) {
                ({ error } = await supabase.from('coupons').update(payload).eq('id', couponId));
            } else {
                ({ error } = await supabase.from('coupons').insert(payload));
            }

            if (error) throw error;

            closeModal();
            renderCodes(document.getElementById('view-container'));

        } catch (err) {
            console.error(err);
            alert('Error saving coupon: ' + err.message);
            btn.disabled = false; btn.innerText = 'Retry';
        }
    });
};

// Helper to toggle UI inputs
window.toggleRewardInputs = () => {
    const type = document.querySelector('input[name="rewardType"]:checked').value;
    if (type === 'fixed') {
        document.getElementById('fixed-input-group').classList.remove('hidden');
        document.getElementById('random-input-group').classList.add('hidden');
    } else {
        document.getElementById('fixed-input-group').classList.add('hidden');
        document.getElementById('random-input-group').classList.remove('hidden');
    }
};
