import { supabase } from './supabase-client.js';

export const renderStores = async (container) => {
    const { data: stores } = await supabase.from('stores').select('*');
    container.innerHTML = `
        <div class="flex justify-between mb-6"><h3 class="font-bold text-xl">Stores</h3><button onclick="openStoreModal()" class="bg-brand-600 text-white px-4 py-2 rounded font-bold">Add Store</button></div>
        <div class="bg-white rounded border"><table class="w-full text-sm text-left"><thead class="bg-gray-50 border-b"><tr><th class="p-4">Name</th><th class="p-4">Status</th><th class="p-4 text-right">Action</th></tr></thead>
        <tbody>${(stores || []).map(s => `<tr><td class="p-4 font-bold">${s.name}</td><td class="p-4">${s.is_active ? 'Active' : 'Inactive'}</td><td class="p-4 text-right"><button onclick="openStoreModal('${s.id}')" class="text-blue-600">Edit</button></td></tr>`).join('')}</tbody></table></div>
    `;
};

window.openStoreModal = async (id = null) => {
    let store = { name: '', description: '', is_active: true };
    if (id) { const { data } = await supabase.from('stores').select('*').eq('id', id).single(); store = data; }
    
    const html = `
        <div class="p-6"><h3 class="font-bold mb-4">${id ? 'Edit' : 'Add'} Store</h3>
        <form id="store-form" class="space-y-4">
            <input type="text" id="s-name" value="${store.name}" class="w-full border p-2 rounded" placeholder="Store Name" required>
            <textarea id="s-desc" class="w-full border p-2 rounded" placeholder="Description">${store.description || ''}</textarea>
            <div class="flex items-center gap-2"><input type="checkbox" id="s-active" ${store.is_active ? 'checked' : ''}><label>Active</label></div>
            <button type="submit" class="w-full bg-brand-600 text-white font-bold py-2 rounded">Save</button>
        </form></div>
    `;
    openModal(html);
    document.getElementById('store-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = { name: document.getElementById('s-name').value, description: document.getElementById('s-desc').value, is_active: document.getElementById('s-active').checked };
        id ? await supabase.from('stores').update(payload).eq('id', id) : await supabase.from('stores').insert(payload);
        closeModal(); renderStores(document.getElementById('view-container'));
    });
};
