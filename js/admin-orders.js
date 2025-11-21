import { supabase } from './supabase-client.js';

export const renderOrders = async (container) => {
    // FIX: Explicitly linked 'users' via 'user_id' to avoid ambiguity with 'approved_by'
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            *,
            users!user_id (full_name, student_id),
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
                                <td class="p-4 text-right flex justify-end gap-2">
                                    ${o.status === 'pending' ? `
                                        <button onclick="updateOrderStatus('${o.id}', 'confirmed')" class="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 transition">Mark Redeemed</button>
                                        <button onclick="updateOrderStatus('${o.id}', 'cancelled')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-200 transition">Cancel</button>
                                    ` : `<span class="text-gray-400 text-xs font-medium">Completed</span>`}
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
    const action = status === 'confirmed' ? 'Mark as Redeemed' : 'Cancel Order';
    if (!confirm(`Are you sure you want to ${action}?`)) return;
    
    // Update query with approved_by admin ID
    const { data: { user } } = await supabase.auth.getUser(); // Get current admin ID
    const adminId = user ? (await supabase.from('users').select('id').eq('auth_user_id', user.id).single()).data?.id : null;

    const { error } = await supabase
        .from('orders')
        .update({ 
            status: status, 
            approved_by: adminId,
            approved_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (error) {
        console.error(error);
        alert('Error updating order: ' + error.message);
    } else {
        // Refresh the list or UI update
        renderOrders(document.getElementById('view-container'));
    }
};
