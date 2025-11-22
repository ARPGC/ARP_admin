import { supabase } from './supabase-client.js';
import { uploadToCloudinary } from './cloudinary-service.js';

// =======================
// 1. RENDER PRODUCT LIST
// =======================
export const renderProducts = async (container) => {
    const { data: products, error } = await supabase
        .from('products')
        .select('*, stores(name)')
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching products:', error);

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">Product Inventory</h3>
            <div class="flex gap-3">
                <input type="text" id="prod-search" placeholder="Search products..." class="border p-2 rounded text-sm w-64 shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" oninput="filterProducts()">
                <button onclick="openProductModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all">
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
                                    <button onclick="openProductModal('${p.id}')" class="bg-brand-50 text-brand-600 p-2 rounded hover:bg-brand-100 transition-colors"><i data-lucide="edit" class="w-4 h-4"></i></button>
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
// 2. PRODUCT MODAL (Create/Edit)
// =======================
window.openProductModal = async (productId = null) => {
    // Fetch stores for dropdown
    const { data: stores } = await supabase.from('stores').select('id, name').eq('is_active', true);
    
    let prod = { name: '', description: '', original_price: '', discounted_price: '', ecopoints_cost: '', store_id: '', is_active: true };
    let features = [];
    let specs = [];
    let mainImage = '';

    // If editing, fetch data
    if (productId) {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        prod = data;
        
        const { data: f } = await supabase.from('product_features').select('feature').eq('product_id', productId).order('sort_order');
        features = f || [];
        
        const { data: s } = await supabase.from('product_specifications').select('spec_key, spec_value').eq('product_id', productId).order('sort_order');
        specs = s || [];
        
        const { data: imgs } = await supabase.from('product_images').select('image_url').eq('product_id', productId).order('sort_order').limit(1);
        if(imgs.length > 0) mainImage = imgs[0].image_url;
    }

    const html = `
        <!-- Main Modal Wrapper with Fixed Height -->
        <div class="flex flex-col h-[85vh]"> 
            
            <!-- Fixed Header -->
            <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-white shrink-0">
                <h3 class="text-xl font-bold text-gray-800">${productId ? 'Edit Product' : 'Add Product'}</h3>
                <button onclick="closeModal()" class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Scrollable Body -->
            <div class="flex-grow overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
                <form id="product-form" class="space-y-6 max-w-4xl mx-auto">
                    
                    <!-- 1. Basic Info -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Basic Information</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="md:col-span-2">
                                <label class="label">Product Name</label>
                                <input type="text" id="p-name" value="${prod.name}" class="input-field w-full" placeholder="e.g. Eco-Friendly Water Bottle" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="label">Description</label>
                                <textarea id="p-desc" class="input-field w-full" rows="3" placeholder="Describe the product...">${prod.description || ''}</textarea>
                            </div>
                            <div>
                                <label class="label">Store</label>
                                <select id="p-store" class="input-field w-full" required>
                                    <option value="">Select Store</option>
                                    ${stores.map(s => `<option value="${s.id}" ${prod.store_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="label">EcoPoints Cost</label>
                                <input type="number" id="p-points" value="${prod.ecopoints_cost}" class="input-field w-full font-bold text-green-600" placeholder="0" required>
                            </div>
                            <div>
                                <label class="label">Original Price (₹)</label>
                                <input type="number" id="p-og-price" value="${prod.original_price}" class="input-field w-full" placeholder="0.00">
                            </div>
                            <div>
                                <label class="label">Discounted Price (₹)</label>
                                <input type="number" id="p-disc-price" value="${prod.discounted_price}" class="input-field w-full" placeholder="0.00">
                            </div>
                        </div>
                    </div>

                    <!-- 2. Image Upload -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Product Image</h4>
                        <div class="flex flex-col md:flex-row gap-4 items-center">
                            <input type="text" id="p-img-url" value="${mainImage}" placeholder="Paste Image URL here..." class="input-field flex-1 w-full">
                            <span class="text-xs font-bold text-gray-400">OR</span>
                            <label class="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 transition border border-gray-300">
                                <i data-lucide="upload" class="w-4 h-4 inline-block mr-2"></i>Upload File
                                <input type="file" id="p-img-file" class="hidden" accept="image/*">
                            </label>
                        </div>
                    </div>

                    <!-- 3. Features -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Features</h4>
                            <button type="button" onclick="addFeatureRow()" class="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100 border border-brand-200 transition">
                                + Add Feature
                            </button>
                        </div>
                        <div id="features-container" class="space-y-3">
                            ${features.map(f => `<input type="text" name="feature[]" value="${f.feature}" class="input-field w-full" placeholder="e.g. Handcrafted material">`).join('')}
                        </div>
                    </div>

                    <!-- 4. Specifications (FIXED: GRID LAYOUT) -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Technical Specifications</h4>
                            <button type="button" onclick="addSpecRow()" class="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100 border border-brand-200 transition">
                                + Add Specification
                            </button>
                        </div>
                        <div id="specs-container" class="space-y-3">
                             ${specs.map(s => `
                                <div class="grid grid-cols-3 gap-4">
                                    <input type="text" name="spec_key[]" value="${s.spec_key}" placeholder="Key (e.g. Color)" class="input-field col-span-1 bg-gray-50 font-medium">
                                    <input type="text" name="spec_val[]" value="${s.spec_value}" placeholder="Value (e.g. Red)" class="input-field col-span-2">
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Visibility Toggle -->
                    <div class="flex items-center gap-3 p-4 bg-gray-100 rounded-lg border border-gray-200">
                        <input type="checkbox" id="p-active" ${prod.is_active ? 'checked' : ''} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer">
                        <label for="p-active" class="font-medium text-gray-700 cursor-pointer select-none">Visible in Store</label>
                    </div>
                </form>
            </div>

            <!-- Fixed Footer -->
            <div class="p-6 border-t border-gray-200 bg-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button id="save-product-btn" class="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl hover:bg-brand-700 shadow-lg transition-all active:scale-95 text-lg">
                    ${productId ? 'Update Product' : 'Create Product'}
                </button>
            </div>
        </div>
        
        <style>
            .label { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; margin-bottom: 0.4rem; letter-spacing: 0.025em; }
            .input-field { border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.9rem; transition: all 0.2s; background-color: #fff; }
            .input-field:focus { outline: none; border-color: #16a34a; ring: 3px solid #dcfce7; }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        </style>
    `;
    
    openModal(html);

    if(!productId) { 
        addFeatureRow(); 
        addSpecRow(); 
    }

    document.getElementById('save-product-btn').addEventListener('click', async () => {
        const btn = document.getElementById('save-product-btn');
        const originalText = btn.innerText;
        btn.disabled = true; btn.innerText = 'Saving...';

        try {
            let imgUrl = document.getElementById('p-img-url').value;
            const fileInput = document.getElementById('p-img-file');
            if(fileInput.files.length > 0) {
                btn.innerText = 'Uploading Image...';
                imgUrl = await uploadToCloudinary(fileInput.files[0]);
            }

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

            if(imgUrl) {
                await supabase.from('product_images').delete().eq('product_id', pid);
                await supabase.from('product_images').insert({ product_id: pid, image_url: imgUrl, sort_order: 0 });
            }

            const featureInputs = document.getElementsByName('feature[]');
            const newFeatures = Array.from(featureInputs)
                .map((inp, i) => ({ product_id: pid, feature: inp.value, sort_order: i }))
                .filter(f => f.feature.trim() !== '');
            
            await supabase.from('product_features').delete().eq('product_id', pid);
            if(newFeatures.length) await supabase.from('product_features').insert(newFeatures);

            const keys = document.getElementsByName('spec_key[]');
            const vals = document.getElementsByName('spec_val[]');
            const newSpecs = Array.from(keys)
                .map((k, i) => ({
                    product_id: pid, spec_key: k.value, spec_value: vals[i].value, sort_order: i
                }))
                .filter(s => s.spec_key.trim() !== '');

            await supabase.from('product_specifications').delete().eq('product_id', pid);
            if(newSpecs.length) await supabase.from('product_specifications').insert(newSpecs);

            closeModal();
            renderProducts(document.getElementById('view-container'));

        } catch (err) {
            console.error(err);
            alert('Error saving product: ' + err.message);
            btn.disabled = false; btn.innerText = originalText;
        }
    });
};

window.addFeatureRow = () => {
    const div = document.createElement('input');
    div.type = 'text'; 
    div.name = 'feature[]'; 
    div.placeholder = 'Feature description'; 
    div.className = 'input-field w-full mt-2';
    document.getElementById('features-container').appendChild(div);
    div.focus();
};

window.addSpecRow = () => {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-3 gap-4 mt-2';
    div.innerHTML = `
        <input type="text" name="spec_key[]" placeholder="Key" class="input-field col-span-1 bg-gray-50 font-medium">
        <input type="text" name="spec_val[]" placeholder="Value" class="input-field col-span-2">
    `;
    document.getElementById('specs-container').appendChild(div);
    div.querySelector('input').focus();
};
