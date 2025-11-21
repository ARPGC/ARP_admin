import { supabase } from './supabase-client.js';

export const renderOrders = async (container) => {
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            *,
            users (full_name, student_id),
            order_items (
                quantity,
                products (name)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching orders:', error);

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">Order Management</h3>
            <div class="flex gap-2">
                <button class="px-3 py-1 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Filter</button>
                <button class="px-3 py-1 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Export</button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th class="p-4">Order ID</th>
                            <th class="p-4">Student</th>
                            <th class="p-4">Items</th>
                            <th class="p-4">Total</th>
                            <th class="p-4">Status</th>
                            <th class="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${orders.map(o => {
                            const itemsSummary = o.order_items.map(i => `${i.quantity}x ${i.products?.name}`).join(', ');
                            return `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4 font-mono text-xs text-gray-500">#${o.id.slice(0, 8)}</td>
                                <td class="p-4">
                                    <div class="font-bold text-gray-900">${o.users?.full_name || 'Unknown'}</div>
                                    <div class="text-xs text-gray-500">${o.users?.student_id || ''}</div>
                                </td>
                                <td class="p-4 text-gray-700 truncate max-w-xs" title="${itemsSummary}">${itemsSummary}</td>
                                <td class="p-4">
                                    <div class="font-bold text-gray-900">₹${o.total_price}</div>
                                    <div class="text-xs text-green-600 font-medium">${o.total_points} pts</div>
                                </td>
                                <td class="p-4">
                                    <span class="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide 
                                        ${o.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                          o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}">
                                        ${o.status}
                                    </span>
                                </td>
                                <td class="p-4 text-right">
                                    ${o.status === 'pending' ? `
                                        <button onclick="updateOrderStatus('${o.id}', 'confirmed')" class="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 transition">Complete</button>
                                    ` : `<span class="text-gray-400 text-xs">No Action</span>`}
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

window.updateOrderStatus = async (orderId, status) => {
    if (!confirm(`Are you sure you want to mark this order as ${status}?`)) return;
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) alert('Error updating order');
    else {
        // Simple UI feedback: fade out the row
        const btn = document.querySelector(`button[onclick*="${orderId}"]`);
        if(btn) {
            const row = btn.closest('tr');
            row.style.opacity = '0.5';
            btn.disabled = true;
            btn.innerText = 'Updated';
        }
    }
};
