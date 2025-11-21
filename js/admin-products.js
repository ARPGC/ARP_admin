import { supabase } from './supabase-client.js';
import { uploadToCloudinary } from './cloudinary-service.js';

// =======================
// PRODUCTS LIST & FILTER
// =======================
export const renderProducts = async (container) => {
    const { data: products, error } = await supabase
        .from('products')
        .select('*, stores(name)')
        .order('created_at', { ascending: false });

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">Product Management</h3>
            <div class="flex gap-3">
                <input type="text" id="prod-search" placeholder="Search products..." class="border p-2 rounded text-sm w-64" oninput="filterProducts()">
                <button onclick="openProductModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm">
                    <i data-lucide="plus" class="w-4 h-4"></i> Add Product
                </button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left" id="product-table">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th class="p-4">Product Name</th>
                            <th class="p-4">Store</th>
                            <th class="p-4">Price</th>
                            <th class="p-4">Points</th>
                            <th class="p-4">Status</th>
                            <th class="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${products.map(p => `
                            <tr class="hover:bg-gray-50 transition search-item" data-name="${p.name.toLowerCase()}">
                                <td class="p-4 font-bold text-gray-900">${p.name}</td>
                                <td class="p-4 text-gray-600">${p.stores?.name || 'N/A'}</td>
                                <td class="p-4">₹${p.discounted_price} <span class="line-through text-gray-400 text-xs">₹${p.original_price}</span></td>
                                <td class="p-4 font-bold text-green-600">${p.ecopoints_cost}</td>
                                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">${p.is_active ? 'Active' : 'Hidden'}</span></td>
                                <td class="p-4 text-right">
                                    <button onclick="openProductModal('${p.id}')" class="bg-brand-50 text-brand-600 p-2 rounded hover:bg-brand-100"><i data-lucide="edit" class="w-4 h-4"></i></button>
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

window.filterProducts = () => {
    const term = document.getElementById('prod-search').value.toLowerCase();
    document.querySelectorAll('.search-item').forEach(row => {
        row.style.display = row.dataset.name.includes(term) ? '' : 'none';
    });
};

// =======================
// CREATE / EDIT MODAL
// =======================
window.openProductModal = async (productId = null) => {
    // 1. Fetch Stores for Dropdown
    const { data: stores } = await supabase.from('stores').select('id, name').eq('is_active', true);
    
    // 2. Fetch Product Data if Editing
    let prod = { 
        name: '', description: '', original_price: '', discounted_price: '', 
        ecopoints_cost: '', store_id: '', is_active: true 
    };
    let features = [];
    let specs = [];
    let mainImage = '';

    if (productId) {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        prod = data;
        
        // Fetch related data
        const { data: f } = await supabase.from('product_features').select('feature').eq('product_id', productId).order('sort_order');
        features = f || [];
        
        const { data: s } = await supabase.from('product_specifications').select('spec_key, spec_value').eq('product_id', productId).order('sort_order');
        specs = s || [];

        const { data: imgs } = await supabase.from('product_images').select('image_url').eq('product_id', productId).order('sort_order').limit(1);
        if(imgs.length > 0) mainImage = imgs[0].image_url;
    }

    const html = `
        <div class="p-6 h-[80vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4 border-b pb-2">${productId ? 'Edit Product' : 'Add Product'}</h3>
            <form id="product-form" class="space-y-6">
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">
                        <label class="label">Product Name</label>
                        <input type="text" id="p-name" value="${prod.name}" class="input-field" required>
                    </div>
                    <div class="col-span-2">
                        <label class="label">Description</label>
                        <textarea id="p-desc" class="input-field" rows="2">${prod.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="label">Store</label>
                        <select id="p-store" class="input-field" required>
                            <option value="">Select Store</option>
                            ${stores.map(s => `<option value="${s.id}" ${prod.store_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="label">EcoPoints Cost</label>
                        <input type="number" id="p-points" value="${prod.ecopoints_cost}" class="input-field" required>
                    </div>
                    <div>
                        <label class="label">Original Price (₹)</label>
                        <input type="number" id="p-og-price" value="${prod.original_price}" class="input-field">
                    </div>
                    <div>
                        <label class="label">Discounted Price (₹)</label>
                        <input type="number" id="p-disc-price" value="${prod.discounted_price}" class="input-field">
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg border">
                    <label class="label mb-2">Main Product Image</label>
                    <div class="flex gap-2">
                        <input type="text" id="p-img-url" value="${mainImage}" placeholder="Enter URL" class="input-field flex-1">
                        <span class="self-center text-xs font-bold">OR</span>
                        <input type="file" id="p-img-file" class="text-sm w-1/3">
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg border">
                    <div class="flex justify-between mb-2">
                        <label class="label">Features</label>
                        <button type="button" onclick="addFeatureRow()" class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">+ Add Feature</button>
                    </div>
                    <div id="features-container" class="space-y-2">
                        ${features.map(f => `<input type="text" name="feature[]" value="${f.feature}" class="input-field bg-white" placeholder="Feature description">`).join('')}
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg border">
                    <div class="flex justify-between mb-2">
                        <label class="label">Specifications</label>
                        <button type="button" onclick="addSpecRow()" class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">+ Add Spec</button>
                    </div>
                    <div id="specs-container" class="space-y-2">
                         ${specs.map(s => `
                            <div class="flex gap-2">
                                <input type="text" name="spec_key[]" value="${s.spec_key}" placeholder="Key (e.g. Color)" class="input-field bg-white w-1/3">
                                <input type="text" name="spec_val[]" value="${s.spec_value}" placeholder="Value (e.g. Red)" class="input-field bg-white flex-1">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <input type="checkbox" id="p-active" ${prod.is_active ? 'checked' : ''}>
                    <label class="label">Product is Active</label>
                </div>

                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700">
                    ${productId ? 'Update Product' : 'Create Product'}
                </button>
            </form>
        </div>
        <style>
            .label { display: block; font-size: 0.75rem; font-weight: 700; color: #4b5563; margin-bottom: 0.25rem; }
            .input-field { width: 100%; border: 1px solid #d1d5db; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.875rem; }
        </style>
    `;
    openModal(html);

    // Initialize empty rows if creating new
    if(!productId) { addFeatureRow(); addSpecRow(); }

    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = 'Processing...';

        try {
            // 1. Handle Image
            let imgUrl = document.getElementById('p-img-url').value;
            const fileInput = document.getElementById('p-img-file');
            if(fileInput.files.length > 0) {
                imgUrl = await uploadToCloudinary(fileInput.files[0]);
            }

            // 2. Save Main Product
            const payload = {
                store_id: document.getElementById('p-store').value,
                name: document.getElementById('p-name').value,
                description: document.getElementById('p-desc').value,
                original_price: document.getElementById('p-og-price').value || 0,
                discounted_price: document.getElementById('p-disc-price').value || 0,
                ecopoints_cost: document.getElementById('p-points').value,
                is_active: document.getElementById('p-active').checked
            };

            let pid = productId;
            if (pid) {
                await supabase.from('products').update(payload).eq('id', pid);
            } else {
                const { data, error } = await supabase.from('products').insert(payload).select().single();
                if(error) throw error;
                pid = data.id;
            }

            // 3. Update Image Table
            if(imgUrl) {
                // Simple logic: Delete old, insert new (or upsert if robust)
                await supabase.from('product_images').delete().eq('product_id', pid);
                await supabase.from('product_images').insert({ product_id: pid, image_url: imgUrl, sort_order: 0 });
            }

            // 4. Update Features (Delete All -> Re-insert)
            const featureInputs = document.getElementsByName('feature[]');
            const newFeatures = Array.from(featureInputs).map((inp, i) => ({ product_id: pid, feature: inp.value, sort_order: i })).filter(f => f.feature.trim() !== '');
            await supabase.from('product_features').delete().eq('product_id', pid);
            if(newFeatures.length) await supabase.from('product_features').insert(newFeatures);

            // 5. Update Specs (Delete All -> Re-insert)
            const keys = document.getElementsByName('spec_key[]');
            const vals = document.getElementsByName('spec_val[]');
            const newSpecs = Array.from(keys).map((k, i) => ({
                product_id: pid, spec_key: k.value, spec_value: vals[i].value, sort_order: i
            })).filter(s => s.spec_key.trim() !== '');
            await supabase.from('product_specifications').delete().eq('product_id', pid);
            if(newSpecs.length) await supabase.from('product_specifications').insert(newSpecs);

            closeModal();
            loadView('products');

        } catch (err) {
            console.error(err);
            alert('Error saving product: ' + err.message);
            btn.disabled = false; btn.innerText = 'Retry';
        }
    });
};

// Helpers for dynamic rows
window.addFeatureRow = () => {
    const div = document.createElement('input');
    div.type = 'text'; div.name = 'feature[]'; div.placeholder = 'Feature description'; div.className = 'input-field bg-white mt-2';
    document.getElementById('features-container').appendChild(div);
};

window.addSpecRow = () => {
    const div = document.createElement('div');
    div.className = 'flex gap-2 mt-2';
    div.innerHTML = `<input type="text" name="spec_key[]" placeholder="Key" class="input-field bg-white w-1/3"><input type="text" name="spec_val[]" placeholder="Value" class="input-field bg-white flex-1">`;
    document.getElementById('specs-container').appendChild(div);
};
