import { supabase } from './supabase-client.js';

export const renderCodes = async (container) => {
    const { data: coupons } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6"><h3 class="font-bold text-xl">Coupon Management</h3><button onclick="openCouponModal()" class="bg-brand-600 text-white px-4 py-2 rounded font-bold">Create Coupon</button></div>
        <div class="bg-white rounded border overflow-hidden"><table class="w-full text-sm text-left"><thead class="bg-gray-50 border-b"><tr><th class="p-4">Code</th><th class="p-4">Reward</th><th class="p-4">Redeemed</th><th class="p-4">Status</th></tr></thead>
        <tbody>${(coupons || []).map(c => `<tr><td class="p-4 font-mono font-bold">${c.code}</td><td class="p-4 text-green-600 font-bold">${c.points_fixed} pts</td><td class="p-4">${c.redeemed_count}/${c.max_redemptions || '∞'}</td><td class="p-4">${c.is_active ? 'Active' : 'Inactive'}</td></tr>`).join('')}</tbody></table></div>
    `;
};

window.openCouponModal = async () => {
    const html = `
        <div class="p-6"><h3 class="font-bold mb-4">Create Coupon</h3>
        <form id="coupon-form" class="space-y-4">
            <input type="text" id="c-code" class="w-full border p-2 rounded" placeholder="CODE (e.g. WELCOME)" required>
            <input type="number" id="c-points" class="w-full border p-2 rounded" placeholder="Points" required>
            <input type="number" id="c-max" class="w-full border p-2 rounded" placeholder="Max Redemptions">
            <button type="submit" class="w-full bg-brand-600 text-white font-bold py-2 rounded">Create</button>
        </form></div>
    `;
    openModal(html);
    document.getElementById('coupon-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = { code: document.getElementById('c-code').value.toUpperCase(), points_fixed: document.getElementById('c-points').value, max_redemptions: document.getElementById('c-max').value || null };
        await supabase.from('coupons').insert(payload);
        closeModal(); renderCodes(document.getElementById('view-container'));
    });
};
