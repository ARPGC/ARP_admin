import { supabase } from './supabase-client.js';

// KPI Cards Configuration
const KPI_CARDS = [
    { id: 'kpi-active-users', title: 'Active Users Today', icon: 'users', color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'kpi-total-purchases', title: 'Total Purchases', icon: 'shopping-cart', color: 'text-green-600', bg: 'bg-green-100' },
    { id: 'kpi-points-redeemed', title: 'Points Redeemed', icon: 'gift', color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'kpi-error-rate', title: 'System Errors', icon: 'alert-triangle', color: 'text-red-600', bg: 'bg-red-100' }
];

let activitySubscription = null;
let charts = {};

// =======================
// 1. RENDER ANALYTICS PAGE
// =======================
export const renderAnalytics = async (container) => {
    container.innerHTML = `
        <div class="space-y-8">
            <!-- KPI Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="kpi-container">
                ${KPI_CARDS.map(card => `
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p class="text-sm font-bold text-gray-400 uppercase tracking-wider">${card.title}</p>
                            <h3 class="text-3xl font-black text-gray-900 mt-2" id="${card.id}">-</h3>
                        </div>
                        <div class="w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center">
                            <i data-lucide="${card.icon}" class="w-6 h-6 ${card.color}"></i>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Traffic Graph -->
                <div class="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-bold text-gray-800">Activity Volume (Last 7 Days)</h3>
                        <select id="chart-filter" class="text-sm border rounded-lg px-3 py-1 bg-gray-50">
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                        </select>
                    </div>
                    <div class="h-64 w-full">
                        <canvas id="trafficChart"></canvas>
                    </div>
                </div>

                <!-- Action Distribution -->
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="text-lg font-bold text-gray-800 mb-6">Activity Breakdown</h3>
                    <div class="h-48 w-full flex justify-center">
                        <canvas id="distributionChart"></canvas>
                    </div>
                    <div id="legend-container" class="mt-6 space-y-3"></div>
                </div>
            </div>

            <!-- Live Timeline Feed -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">Live Activity Feed</h3>
                        <p class="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Realtime updates enabled
                        </p>
                    </div>
                    <div class="relative">
                        <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="feed-search" placeholder="Search logs..." class="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none w-64">
                    </div>
                </div>
                <div id="activity-timeline" class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
                    <!-- Timeline items injected here -->
                    <div class="flex justify-center items-center h-full text-gray-400">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if(window.lucide) window.lucide.createIcons();

    // Initialize
    await fetchAndRenderData();
    setupRealtimeSubscription();
    
    // Search Debounce
    let timeout = null;
    document.getElementById('feed-search').addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => filterTimeline(e.target.value), 300);
    });
};

// =======================
// 2. DATA FETCHING & PROCESSING
// =======================
const fetchAndRenderData = async () => {
    // Fetch last 100 logs with user details
    const { data: logs, error } = await supabase
        .from('user_activity_log')
        .select('*, users(full_name, role)') // Assumes relationship exists
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error fetching analytics:', error);
        return;
    }

    // 1. Update KPIs
    updateKPIs(logs);

    // 2. Render Charts
    renderCharts(logs);

    // 3. Render Timeline
    renderTimeline(logs);
};

const updateKPIs = (logs) => {
    // Simple client-side calculation for demo purposes
    // For production with huge data, use SQL COUNT queries instead
    const today = new Date().toISOString().split('T')[0];
    
    const activeToday = new Set(logs.filter(l => l.created_at.startsWith(today)).map(l => l.user_id)).size;
    const purchases = logs.filter(l => l.action_type === 'purchase_success').length; // Example type
    const redeemed = logs.filter(l => l.action_type === 'redeem_code_success').length;
    const errors = logs.filter(l => l.action_type.includes('error') || l.action_type.includes('fail')).length;
    
    // To make it look realistic if data is sparse, we might fetch specific totals from DB, 
    // but here we use the log slice for "Recent Activity Metrics"
    document.getElementById('kpi-active-users').innerText = activeToday;
    document.getElementById('kpi-total-purchases').innerText = purchases;
    document.getElementById('kpi-points-redeemed').innerText = redeemed;
    document.getElementById('kpi-error-rate').innerText = errors > 0 ? `${((errors/logs.length)*100).toFixed(1)}%` : '0%';
};

// =======================
// 3. CHART RENDERING
// =======================
const renderCharts = (logs) => {
    // Destroy existing charts if re-rendering
    if (charts.traffic) charts.traffic.destroy();
    if (charts.distribution) charts.distribution.destroy();

    // --- Data Prep for Distribution ---
    const categories = { Engagement: 0, Commerce: 0, Gamification: 0, Issues: 0 };
    logs.forEach(l => {
        const type = l.action_type;
        if (type.includes('login') || type.includes('view')) categories.Engagement++;
        else if (type.includes('purchase') || type.includes('redeem') || type.includes('order')) categories.Commerce++;
        else if (type.includes('quiz') || type.includes('checkin') || type.includes('challenge')) categories.Gamification++;
        else if (type.includes('error') || type.includes('fail')) categories.Issues++;
        else categories.Engagement++; // Default fallback
    });

    // --- Data Prep for Traffic (Last 7 Days) ---
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const trafficData = last7Days.map(date => logs.filter(l => l.created_at.startsWith(date)).length);

    // --- Chart 1: Traffic Line ---
    const ctxTraffic = document.getElementById('trafficChart').getContext('2d');
    charts.traffic = new Chart(ctxTraffic, {
        type: 'line',
        data: {
            labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [{
                label: 'Activities',
                data: trafficData,
                borderColor: '#16a34a', // Brand Green
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, 'rgba(22, 163, 74, 0.2)');
                    gradient.addColorStop(1, 'rgba(22, 163, 74, 0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }
        }
    });

    // --- Chart 2: Distribution Doughnut ---
    const ctxDist = document.getElementById('distributionChart').getContext('2d');
    charts.distribution = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444'], // Blue, Green, Purple, Red
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false } }
        }
    });

    // Custom Legend
    const legendContainer = document.getElementById('legend-container');
    legendContainer.innerHTML = Object.entries(categories).map(([label, count], i) => `
        <div class="flex justify-between items-center text-sm">
            <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background-color: ${['#3b82f6', '#10b981', '#8b5cf6', '#ef4444'][i]}"></span>
                <span class="text-gray-600">${label}</span>
            </div>
            <span class="font-bold text-gray-900">${count}</span>
        </div>
    `).join('');
};

// =======================
// 4. TIMELINE RENDERER
// =======================
const renderTimeline = (logs) => {
    const container = document.getElementById('activity-timeline');
    container.innerHTML = '';

    if (logs.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 py-10">No activity logs found.</div>`;
        return;
    }

    // Group by Date
    let lastDate = '';

    logs.forEach(log => {
        const date = new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const time = new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        
        // Add Date Header if new day
        if (date !== lastDate) {
            container.innerHTML += `
                <div class="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-2 mb-4 border-b border-gray-100">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">${date}</span>
                </div>
            `;
            lastDate = date;
        }

        // Determine Style based on Action Type
        const style = getLogStyle(log.action_type);
        
        // Parse Metadata for rich details
        const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata || '{}') : (log.metadata || {});
        const metaBadge = Object.keys(meta).length > 0 
            ? `<span class="ml-2 px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200 truncate max-w-[150px] inline-block align-middle">
                ${JSON.stringify(meta).replace(/["{}]/g, '').substring(0, 20)}...
               </span>` 
            : '';

        container.innerHTML += `
            <div class="timeline-item flex gap-4 group animate-fade-in">
                <!-- Time Column -->
                <div class="w-16 flex-shrink-0 text-right pt-1">
                    <span class="text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">${time}</span>
                </div>
                
                <!-- Connector Line -->
                <div class="relative flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full ${style.bg} flex items-center justify-center z-10 border-2 border-white shadow-sm">
                        <i data-lucide="${style.icon}" class="w-4 h-4 ${style.color}"></i>
                    </div>
                    <div class="w-px h-full bg-gray-100 absolute top-8 -bottom-4 group-last:hidden"></div>
                </div>

                <!-- Content Card -->
                <div class="flex-grow pb-6">
                    <div class="bg-gray-50 group-hover:bg-white group-hover:shadow-md group-hover:border-gray-200 border border-transparent rounded-xl p-3 transition-all duration-200">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-sm font-bold text-gray-900">
                                    ${log.users?.full_name || 'Unknown User'}
                                    <span class="font-normal text-gray-500">performed</span>
                                    <span class="${style.color}">${log.action_type.replace(/_/g, ' ')}</span>
                                </p>
                                <p class="text-xs text-gray-500 mt-1 leading-relaxed">
                                    ${log.description || 'No details provided.'}
                                    ${metaBadge}
                                </p>
                            </div>
                            ${log.users?.role === 'admin' ? '<span class="bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Admin</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    if(window.lucide) window.lucide.createIcons();
};

// Helper: Determine Icon & Color based on action
const getLogStyle = (type) => {
    if (type.includes('login') || type.includes('view')) 
        return { icon: 'eye', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (type.includes('purchase') || type.includes('order') || type.includes('redeem')) 
        return { icon: 'shopping-bag', color: 'text-green-600', bg: 'bg-green-100' };
    if (type.includes('quiz') || type.includes('challenge') || type.includes('checkin')) 
        return { icon: 'trophy', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (type.includes('error') || type.includes('fail') || type.includes('reject')) 
        return { icon: 'alert-circle', color: 'text-red-600', bg: 'bg-red-100' };
    if (type.includes('update') || type.includes('create') || type.includes('delete')) 
        return { icon: 'edit-3', color: 'text-orange-600', bg: 'bg-orange-100' };
    
    return { icon: 'activity', color: 'text-gray-600', bg: 'bg-gray-100' };
};

// =======================
// 5. REALTIME SUBSCRIPTION
// =======================
const setupRealtimeSubscription = () => {
    if (activitySubscription) return; // Prevent duplicates

    activitySubscription = supabase
        .channel('admin-analytics')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activity_log' }, async (payload) => {
            // Fetch rich user data for the new log
            const { data: fullLog } = await supabase.from('user_activity_log').select('*, users(full_name, role)').eq('id', payload.new.id).single();
            
            if (fullLog) {
                // Prepend to timeline visually without full refresh
                // For simplicity in this MVP, we re-fetch to keep charts in sync, 
                // but ideally you'd just inject HTML here.
                fetchAndRenderData(); 
                
                // Toast Notification
                showToast(`New Activity: ${fullLog.action_type}`, 'info');
            }
        })
        .subscribe();
};

// Simple Toast for Realtime events
const showToast = (msg, type) => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm font-bold shadow-lg transform transition-all duration-300 translate-y-10 opacity-0 ${type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`;
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Search Filter Logic
const filterTimeline = (term) => {
    const items = document.querySelectorAll('.timeline-item');
    term = term.toLowerCase();
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
    });
};
