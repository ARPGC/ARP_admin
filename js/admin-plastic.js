import { supabase } from './supabase-client.js';
import { uploadToCloudinary } from './cloudinary-service.js';

const PLASTIC_TYPES = {
    'PET': 1.60, 'HDPE': 1.25, 'PVC': 0.90, 'LDPE': 1.10, 'PP': 1.45, 'PS': 1.15, 'Other': 0.75
};

export const renderPlasticLogs = async (container) => {
    // OPTIMIZATION: Limit to 50 recent logs & Select specific columns only
    const { data: logs, error } = await supabase
        .from('plastic_submissions')
        .select('id, weight_kg, plastic_type, status, created_at, image_url, users!user_id(full_name, student_id)')
        .order('created_at', { ascending: false })
        .limit(50); // <--- HARD LIMIT TO SAVE DATA

    if (error) console.error('Error fetching plastic logs:', error);

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">Plastic Recycling Logs</h3>
            <div class="flex gap-2">
                <span class="text-xs font-bold text-gray-400 self-center mr-2">Showing last 50 entries</span>
                <button onclick="openLogModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all">
                    <i data-lucide="plus" class="w-4 h-4"></i> New Log
                </button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th class="p-4">Student</th>
                            <th class="p-4">Weight / Type</th>
                            <th class="p-4">CO₂ Saved</th>
                            <th class="p-4">Proof</th>
                            <th class="p-4">Status</th>
                            <th class="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${(logs || []).map(log => {
                            const co2 = (log.weight_kg * (PLASTIC_TYPES[log.plastic_type] || 0.75)).toFixed(2);
                            const points = Math.ceil(log.weight_kg * 100);
                            
                            return `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4">
                                    <div class="font-bold text-gray-900">${log.users?.full_name || 'Unknown'}</div>
                                    <div class="text-xs text-gray-500">${log.users?.student_id || '-'}</div>
                                </td>
                                <td class="p-4">
                                    <div class="font-bold text-gray-800">${log.weight_kg} kg</div>
                                    <span class="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">${log.plastic_type || 'Other'}</span>
                                </td>
                                <td class="p-4">
                                    <div class="text-green-600 font-bold">${co2} kg</div>
                                    <div class="text-xs text-gray-400">Potential: ${points} pts</div>
                                </td>
                                <td class="p-4">
                                    ${log.image_url 
                                        ? `<a href="${log.image_url}" target="_blank" class="text-blue-600 hover:underline text-xs flex items-center gap-1"><i data-lucide="image" class="w-3 h-3"></i> View</a>` 
                                        : '<span class="text-gray-400 text-xs">No Image</span>'}
                                </td>
                                <td class="p-4">
                                    <span class="px-2 py-1 rounded text-xs font-bold uppercase ${
                                        log.status === 'verified' ? 'bg-green-100 text-green-700' :
                                        log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }">${log.status}</span>
                                </td>
                                <td class="p-4 text-right">
                                    ${log.status === 'pending' ? `
                                        <button onclick="verifyLog('${log.id}', ${log.weight_kg}, '${log.plastic_type || 'Other'}')" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm">Verify</button>
                                        <button onclick="rejectLog('${log.id}')" class="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 ml-1">Reject</button>
                                    ` : '<span class="text-gray-400 text-xs italic">Locked</span>'}
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

// ... keep openLogModal, verifyLog, and rejectLog EXACTLY as they were in previous code ...
// (I am omitting them here to save space, but you must keep them in the file)
window.openLogModal = async () => { /* ... keep existing code ... */ }; 
window.verifyLog = async (id, w, t) => { /* ... keep existing code ... */ };
window.rejectLog = async (id) => { /* ... keep existing code ... */ };
