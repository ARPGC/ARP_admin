import { supabase } from './supabase-client.js';

export const renderDashboard = async (container) => {
    // 1. Fetch Stats via RPC (Low Egress: Returns only a small JSON object)
    const { data: stats, error } = await supabase.rpc('get_admin_dashboard_stats');
    
    if (error) {
        console.error('Stats Error:', error);
        container.innerHTML = `<div class="p-4 text-red-500 bg-red-50 rounded">Error loading stats. Please ensure the SQL function is updated.</div>`;
        return;
    }

    container.innerHTML = `
        <h3 class="text-lg font-bold text-gray-800 mb-4">System Health</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            ${statCard('Total Distributed', stats?.distributed || 0, 'leaf', 'text-green-600', 'bg-green-100')}
            ${statCard('Points Redeemed', stats?.redeemed || 0, 'shopping-bag', 'text-blue-600', 'bg-blue-100')}
            ${statCard('System Balance', stats?.balance || 0, 'wallet', 'text-purple-600', 'bg-purple-100')}
            ${statCard('Pending Actions', stats?.pending || 0, 'clock', 'text-orange-600', 'bg-orange-100')}
        </div>

        <h3 class="text-lg font-bold text-gray-800 mb-4">Active Users Overview</h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
                <span class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Today</span>
                <span class="text-3xl font-black text-gray-800">${stats?.active_day || 0}</span>
                <span class="text-xs text-green-600 font-medium mt-1">Users</span>
            </div>
            
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
                <span class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">This Week</span>
                <span class="text-3xl font-black text-gray-800">${stats?.active_week || 0}</span>
                <span class="text-xs text-blue-600 font-medium mt-1">Users</span>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
                <span class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">This Month</span>
                <span class="text-3xl font-black text-gray-800">${stats?.active_month || 0}</span>
                <span class="text-xs text-purple-600 font-medium mt-1">Users</span>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
                <span class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">This Year</span>
                <span class="text-3xl font-black text-gray-800">${stats?.active_year || 0}</span>
                <span class="text-xs text-orange-600 font-medium mt-1">Users</span>
            </div>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 class="text-lg font-bold mb-4 text-gray-800">Environmental Impact</h3>
            <div class="flex items-center gap-8">
                <div>
                    <div class="text-3xl font-black text-gray-900">${stats?.plastic_kg || 0} <span class="text-lg text-gray-400 font-medium">kg</span></div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide font-bold">Plastic Recycled</div>
                </div>
                <div class="h-10 w-px bg-gray-200"></div>
                <div>
                    <div class="text-3xl font-black text-gray-900">${((stats?.plastic_kg || 0) * 2.5).toFixed(1)} <span class="text-lg text-gray-400 font-medium">kg</span></div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide font-bold">CO₂ Saved</div>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
};

const statCard = (title, value, icon, colorClass, bgClass) => `
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
            <p class="text-gray-500 text-sm font-medium">${title}</p>
            <p class="text-2xl font-black text-gray-900 mt-1">${value}</p>
        </div>
        <div class="w-12 h-12 rounded-full ${bgClass} flex items-center justify-center">
            <i data-lucide="${icon}" class="${colorClass}"></i>
        </div>
    </div>
`;
