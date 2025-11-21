import { supabase } from './supabase-client.js';

export const renderLeaderboard = async (container) => {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('lifetime_points', { ascending: false })
        .limit(50);

    if (error) console.error('Error fetching leaderboard:', error);

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">Global Leaderboard</h3>
            <div class="flex bg-white border border-gray-300 rounded-lg p-1">
                <button class="px-4 py-1 text-xs font-bold bg-gray-900 text-white rounded shadow-sm">Students</button>
                <button class="px-4 py-1 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded">Departments</button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th class="p-4 w-16 text-center">Rank</th>
                            <th class="p-4">Student</th>
                            <th class="p-4">Course</th>
                            <th class="p-4 text-right">Lifetime Points</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${users.map((u, index) => {
                            let rankIcon = '';
                            if (index === 0) rankIcon = '🥇';
                            else if (index === 1) rankIcon = '🥈';
                            else if (index === 2) rankIcon = '🥉';
                            else rankIcon = `<span class="text-gray-400 font-mono">#${index + 1}</span>`;

                            return `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4 text-center text-lg">${rankIcon}</td>
                                <td class="p-4 flex items-center gap-3">
                                    <img src="${u.profile_img_url || `https://placehold.co/40x40?text=${u.full_name.charAt(0)}`}" class="w-10 h-10 rounded-full object-cover border border-gray-200">
                                    <div class="font-bold text-gray-900">${u.full_name}</div>
                                </td>
                                <td class="p-4 text-gray-600 font-medium">${u.course || 'N/A'}</td>
                                <td class="p-4 text-right font-bold text-green-600 text-base">${u.lifetime_points}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};
