import { supabase } from './supabase-client.js';

let currentOffset = 0;
let currentQuery = '';
const PAGE_SIZE = 50;
let isLoading = false;

export const renderRedemptions = (container) => {
    container.innerHTML = `
        <div class="max-w-7xl mx-auto h-full flex flex-col">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 class="font-bold text-xl text-gray-800">Points Redemption History</h3>
                    <p class="text-xs text-gray-500">View all outgoing point transactions (Store, Events, etc.)</p>
                </div>

                <div class="relative w-full md:w-96">
                    <div class="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent">
                        <div class="pl-3 text-gray-400"><i data-lucide="search" class="w-4 h-4"></i></div>
                        <input type="text" id="redeem-search" 
                            placeholder="Search Student Name or ID..." 
                            class="w-full p-2.5 outline-none text-sm text-gray-700 placeholder-gray-400">
                        <button id="redeem-clear-btn" class="hidden px-3 text-gray-400 hover:text-red-500" onclick="clearRedeemSearch()">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex-grow flex flex-col overflow-hidden">
                <div class="overflow-x-auto flex-grow">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th class="p-4">Student</th>
                                <th class="p-4">Points Spent</th>
                                <th class="p-4">Description</th>
                                <th class="p-4">Source</th>
                                <th class="p-4">Date</th>
                            </tr>
                        </thead>
                        <tbody id="redemption-table-body" class="divide-y divide-gray-100">
                            </tbody>
                    </table>
                </div>
                
                <div class="p-4 border-t border-gray-100 bg-gray-50 text-center">
                    <button id="btn-load-more" onclick="loadMoreRedemptions()" 
                        class="hidden bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 shadow-sm transition-all">
                        Load More Entries
                    </button>
                    <p id="redeem-status" class="text-xs text-gray-400 mt-2">Showing recent transactions</p>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();

    // Reset State
    currentOffset = 0;
    currentQuery = '';
    
    // Attach Search Listener
    const searchInput = document.getElementById('redeem-search');
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value.trim();
        if(val === currentQuery) return;
        
        debounceTimer = setTimeout(() => {
            currentQuery = val;
            currentOffset = 0; // Reset pagination
            document.getElementById('redeem-clear-btn').classList.toggle('hidden', !val);
            fetchRedemptions(true); // True = Reset Table
        }, 500);
    });

    // Initial Load
    fetchRedemptions(true);
};

window.clearRedeemSearch = () => {
    document.getElementById('redeem-search').value = '';
    currentQuery = '';
    currentOffset = 0;
    document.getElementById('redeem-clear-btn').classList.add('hidden');
    fetchRedemptions(true);
};

window.loadMoreRedemptions = () => {
    currentOffset += PAGE_SIZE;
    fetchRedemptions(false); // False = Append to existing
};

const fetchRedemptions = async (reset = false) => {
    if(isLoading) return;
    isLoading = true;

    const tbody = document.getElementById('redemption-table-body');
    const loadBtn = document.getElementById('btn-load-more');
    const statusText = document.getElementById('redeem-status');

    if(reset) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div></td></tr>`;
        loadBtn.classList.add('hidden');
    } else {
        loadBtn.innerText = 'Loading...';
        loadBtn.disabled = true;
    }

    try {
        // Build Query: Select from points_ledger where delta is negative
        let query = supabase
            .from('points_ledger')
            .select('id, points_delta, description, source_type, created_at, users!user_id(full_name, student_id)')
            .lt('points_delta', 0) // Only spent points
            .order('created_at', { ascending: false })
            .range(currentOffset, currentOffset + PAGE_SIZE - 1);

        // Apply Search if exists
        if(currentQuery) {
            // Filter on the Joined Table (users)
            query = supabase
                .from('points_ledger')
                .select('id, points_delta, description, source_type, created_at, users!user_id!inner(full_name, student_id)')
                .lt('points_delta', 0)
                .or(`full_name.ilike.%${currentQuery}%,student_id.ilike.%${currentQuery}%`, { foreignTable: 'users' })
                .order('created_at', { ascending: false })
                .range(currentOffset, currentOffset + PAGE_SIZE - 1);
        }

        const { data: transactions, error } = await query;

        if (error) throw error;

        // Render
        if (reset) tbody.innerHTML = '';

        if (!transactions || transactions.length === 0) {
            if(reset) {
                tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-gray-400 italic">No redemption records found.</td></tr>`;
                statusText.innerText = '';
            } else {
                statusText.innerText = "No more records to load.";
                loadBtn.classList.add('hidden');
            }
            return;
        }

        const html = transactions.map(tx => {
            const dateStr = new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
            
            // Format Source Badge
            let badgeColor = 'bg-gray-100 text-gray-600';
            if(tx.source_type === 'store_order') badgeColor = 'bg-blue-100 text-blue-700';
            if(tx.source_type === 'system_correction') badgeColor = 'bg-red-100 text-red-700';

            return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                <td class="p-4">
                    <div class="font-bold text-gray-900">${tx.users?.full_name || 'Unknown'}</div>
                    <div class="text-xs text-gray-500">${tx.users?.student_id || '-'}</div>
                </td>
                <td class="p-4">
                    <div class="font-bold text-red-600">${tx.points_delta}</div>
                </td>
                <td class="p-4">
                    <div class="text-sm text-gray-700 max-w-xs truncate" title="${tx.description}">${tx.description}</div>
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs font-bold uppercase ${badgeColor}">${tx.source_type}</span>
                </td>
                <td class="p-4 text-xs text-gray-500">
                    ${dateStr}
                </td>
            </tr>
            `;
        }).join('');

        tbody.insertAdjacentHTML('beforeend', html);

        // Update Load More Button logic
        if (transactions.length < PAGE_SIZE) {
            loadBtn.classList.add('hidden');
            statusText.innerText = "End of list.";
        } else {
            loadBtn.classList.remove('hidden');
            loadBtn.innerText = "Load More Entries";
            loadBtn.disabled = false;
            statusText.innerText = `Showing ${currentOffset + 1} - ${currentOffset + transactions.length} entries`;
        }

    } catch (err) {
        console.error(err);
        if(reset) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500">Error loading data.</td></tr>`;
        else alert("Error loading more items.");
    } finally {
        isLoading = false;
    }
};
