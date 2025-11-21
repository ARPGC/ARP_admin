import { supabase } from './supabase-client.js';
import { uploadToCloudinary } from './cloudinary-service.js';

export const renderStores = async (container) => {
    const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching stores:', error);

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">All Stores</h3>
            <button onclick="openStoreModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Store
            </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                    <tr>
                        <th class="p-4">Logo</th>
                        <th class="p-4">Store Name</th>
                        <th class="p-4">Description</th>
                        <th class="p-4">Status</th>
                        <th class="p-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${stores.map(s => `
                        <tr class="hover:bg-gray-50 transition">
                            <td class="p-4">
                                <img src="${s.logo_url || 'https://placehold.co/40'}" class="w-10 h-10 rounded-full object-cover border">
                            </td>
                            <td class="p-4 font-bold text-gray-900">${s.name}</td>
                            <td class="p-4 text-gray-500 max-w-xs truncate">${s.description || '-'}</td>
                            <td class="p-4">
                                <span class="px-2 py-1 rounded-full text-xs font-bold ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                    ${s.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td class="p-4 text-right">
                                <button onclick="openStoreModal('${s.id}')" class="text-brand-600 hover:bg-brand-50 p-2 rounded"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

window.openStoreModal = async (storeId = null) => {
    let store = { name: '', description: '', logo_url: '', is_active: true };
    
    if (storeId) {
        const { data } = await supabase.from('stores').select('*').eq('id', storeId).single();
        if (data) store = data;
    }

    const html = `
        <div class="relative">
            <div class="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 class="text-xl font-bold text-gray-800">${storeId ? 'Edit Store' : 'Create New Store'}</h3>
                <button onclick="closeModal()" class="p-2 hover:bg-gray-100 rounded-full text-gray-500"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div class="p-6">
                <form id="store-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Store Name</label>
                        <input type="text" id="store-name" value="${store.name}" class="w-full border p-2 rounded mt-1" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="store-desc" class="w-full border p-2 rounded mt-1">${store.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Logo</label>
                        <div class="flex gap-2 mt-1">
                            <input type="text" id="store-logo-url" value="${store.logo_url || ''}" placeholder="Image URL" class="flex-1 border p-2 rounded">
                            <span class="self-center text-gray-500 text-xs">OR</span>
                            <input type="file" id="store-logo-file" class="text-sm text-gray-500 w-1/3">
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mt-4">
                        <input type="checkbox" id="store-active" ${store.is_active ? 'checked' : ''} class="w-4 h-4 text-brand-600 rounded">
                        <label for="store-active" class="text-sm text-gray-700">Store is Active</label>
                    </div>
                    <button type="submit" class="w-full bg-brand-600 text-white font-bold py-2 rounded hover:bg-brand-700 mt-4 shadow-md">
                        ${storeId ? 'Update Store' : 'Create Store'}
                    </button>
                </form>
            </div>
        </div>
    `;
    openModal(html);

    document.getElementById('store-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.innerText = 'Saving...';

        let finalUrl = document.getElementById('store-logo-url').value;
        const fileInput = document.getElementById('store-logo-file');
        
        if (fileInput.files.length > 0) {
            try {
                finalUrl = await uploadToCloudinary(fileInput.files[0]);
            } catch (err) {
                alert("Image upload failed");
                btn.disabled = false;
                return;
            }
        }

        const payload = {
            name: document.getElementById('store-name').value,
            description: document.getElementById('store-desc').value,
            logo_url: finalUrl,
            is_active: document.getElementById('store-active').checked
        };

        let error;
        if (storeId) {
            ({ error } = await supabase.from('stores').update(payload).eq('id', storeId));
        } else {
            ({ error } = await supabase.from('stores').insert(payload));
        }

        if (error) {
            alert('Error saving store: ' + error.message);
            btn.disabled = false; btn.innerText = 'Save';
        } else {
            closeModal();
            renderStores(document.getElementById('view-container'));
        }
    });
};
