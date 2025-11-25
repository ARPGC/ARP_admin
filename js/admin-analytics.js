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
let allLogsCache = []; // Store fetched logs to avoid re-fetching on filter change

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
                        <h3 class="text-lg font-bold text-gray-800">Activity Volume</h3>
                        <select id="chart-filter" class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none transition-all">
                            <option value="1">Today</option>
                            <option value="7" selected>Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 3 Months</option>
                            <option value="180">Last 6 Months</option>
                            <option value="365">Last 1 Year</option>
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
                <div class="p-6 border-b border-gray-100 flex flex-col space-y-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="text-lg font-bold text-gray-800">Live Activity Feed</h3>
                            <p class="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Realtime updates enabled
                            </p>
                        </div>
                        <div class="relative">
                            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="feed-search" placeholder="Search logs..." class="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none w-64 transition-all">
                        </div>
                    </div>
                    
                    <!-- Timeline Filter Controls -->
                    <div class="flex flex-wrap gap-3 items-center text-sm bg-gray-50 p-3 rounded-xl">
                        <span class="font-bold text-gray-500 text-xs uppercase tracking-wide">Filter Period:</span>
                        
                        <div class="flex items-center gap-2">
                            <input type="datetime-local" id="feed-start-date" class="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none">
                            <span class="text-gray-400 text-xs">to</span>
                            <input type="datetime-local" id="feed-end-date" class="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none">
                        </div>

                        <button id="apply-feed-filter" class="bg-gray-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-sm">
                            Apply Filter
                        </button>
                        
                        <button id="reset-feed-filter" class="text-gray-500 hover:text-gray-700 text-xs font-medium underline decoration-dotted">
                            Reset (Last 100)
                        </button>
                    </div>
                </div>

                <div id="activity-timeline" class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
                    <div class="flex justify-center items-center h-full text-gray-400">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if(window.lucide) window.lucide.createIcons();

    // Initial Fetch (Last 100 default for timeline, but fetch more for charts)
    await fetchAndRenderData(); 
    setupRealtimeSubscription();
    
    // Chart Filter Event Listener
    document.getElementById('chart-filter').addEventListener('change', (e) => {
        updateTrafficChart(parseInt(e.target.value));
    });

    // Timeline Filter Event Listeners
    document.getElementById('apply-feed-filter').addEventListener('click', applyTimelineDateFilter);
    document.getElementById('reset-feed-filter').addEventListener('click', resetTimelineFilter);

    // Search Debounce
    let timeout = null;
    const searchInput = document.getElementById('feed-search');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => filterTimelineText(e.target.value), 300);
        });
    }
};

// =======================
// 2. DATA FETCHING & PROCESSING
// =======================
const fetchAndRenderData = async () => {
    // Fetch a larger dataset (no limit for charts, but practically let's grab a good chunk)
    // For a real production app with millions of rows, you'd use aggregate queries.
    // Here we fetch recent 2000 rows for chart accuracy.
    const { data: logs, error } = await supabase
        .from('user_activity_log')
        .select('*, users!user_id(full_name, role)') 
        .order('created_at', { ascending: false })
        .limit(2000); 

    if (error) {
        console.error('Error fetching analytics:', error);
        return;
    }

    allLogsCache = logs; // Store for filtering

    updateKPIs(logs);
    renderInitialCharts(logs);
    
    // Default Timeline: Show last 100
    renderTimeline(logs.slice(0, 100)); 
};

const updateKPIs = (logs) => {
    const today = new Date().toISOString().split('T')[0];
    
    const activeToday = new Set(logs.filter(l => l.created_at.startsWith(today)).map(l => l.user_id)).size;
    const purchases = logs.filter(l => l.action_type.includes('purchase') || l.action_type.includes('order')).length;
    const redeemed = logs.filter(l => l.action_type.includes('redeem')).length;
    const errors = logs.filter(l => l.action_type.includes('error') || l.action_type.includes('fail')).length;
    
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    setVal('kpi-active-users', activeToday || '-'); 
    setVal('kpi-total-purchases', purchases);
    setVal('kpi-points-redeemed', redeemed);
    setVal('kpi-error-rate', errors > 0 ? `${((errors/logs.length)*100).toFixed(1)}%` : '0%');
};

// =======================
// 3. CHART RENDERING
// =======================
const renderInitialCharts = (logs) => {
    renderDistributionChart(logs);
    updateTrafficChart(7); // Default view
};

const renderDistributionChart = (logs) => {
    if (charts.distribution) charts.distribution.destroy();

    const categories = { Engagement: 0, Commerce: 0, Gamification: 0, Issues: 0 };
    logs.forEach(l => {
        const type = l.action_type.toLowerCase();
        if (type.includes('login') || type.includes('view')) categories.Engagement++;
        else if (type.includes('purchase') || type.includes('redeem') || type.includes('order')) categories.Commerce++;
        else if (type.includes('quiz') || type.includes('checkin') || type.includes('challenge')) categories.Gamification++;
        else if (type.includes('error') || type.includes('fail') || type.includes('reject')) categories.Issues++;
        else categories.Engagement++; 
    });

    const distEl = document.getElementById('distributionChart');
    if(distEl) {
        const ctxDist = distEl.getContext('2d');
        charts.distribution = new Chart(ctxDist, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444'],
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
    }

    const legendContainer = document.getElementById('legend-container');
    if(legendContainer) {
        legendContainer.innerHTML = Object.entries(categories).map(([label, count], i) => `
            <div class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" style="background-color: ${['#3b82f6', '#10b981', '#8b5cf6', '#ef4444'][i]}"></span>
                    <span class="text-gray-600">${label}</span>
                </div>
                <span class="font-bold text-gray-900">${count}</span>
            </div>
        `).join('');
    }
};

const updateTrafficChart = (days) => {
    if (charts.traffic) charts.traffic.destroy();

    const today = new Date();
    const labels = [];
    const dataPoints = [];

    // Case 1: "Today" (Hourly breakdown)
    if (days === 1) {
        for (let i = 0; i < 24; i++) {
            labels.push(`${i}:00`);
            const count = allLogsCache.filter(l => {
                const d = new Date(l.created_at);
                return d.getDate() === today.getDate() && 
                       d.getMonth() === today.getMonth() &&
                       d.getFullYear() === today.getFullYear() &&
                       d.getHours() === i;
            }).length;
            dataPoints.push(count);
        }
    } 
    // Case 2: Date Range (Daily breakdown)
    else {
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateString = d.toISOString().split('T')[0]; 
            
            // Simplified Label logic
            if (days > 90) {
                // For very long ranges, we might want to skip labels visually but keep points
                // Or group by week/month. For this MVP, we plot daily points but reduce label clutter via ChartJS options
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            } else {
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            }

            const count = allLogsCache.filter(l => l.created_at.startsWith(dateString)).length;
            dataPoints.push(count);
        }
    }

    const trafficEl = document.getElementById('trafficChart');
    if(trafficEl) {
        const ctxTraffic = trafficEl.getContext('2d');
        charts.traffic = new Chart(ctxTraffic, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Activities',
                    data: dataPoints,
                    borderColor: '#16a34a',
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                        gradient.addColorStop(0, 'rgba(22, 163, 74, 0.2)');
                        gradient.addColorStop(1, 'rgba(22, 163, 74, 0)');
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointRadius: days > 30 ? 1 : 4, 
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                    x: { 
                        grid: { display: false },
                        ticks: {
                            maxTicksLimit: days > 30 ? 12 : 7 
                        }
                    }
                }
            }
        });
    }
};

// =======================
// 4. TIMELINE & FILTERS
// =======================

// Apply Date Range Filter to Timeline
const applyTimelineDateFilter = async () => {
    const startVal = document.getElementById('feed-start-date').value;
    const endVal = document.getElementById('feed-end-date').value;

    if (!startVal || !endVal) {
        alert("Please select both start and end dates.");
        return;
    }

    const startDate = new Date(startVal);
    const endDate = new Date(endVal);

    if (startDate > endDate) {
        alert("Start date cannot be after end date.");
        return;
    }

    // Fetch specific range from DB
    // Note: We fetch specifically for the timeline here, ignoring the global cache limit
    const { data: filteredLogs, error } = await supabase
        .from('user_activity_log')
        .select('*, users!user_id(full_name, role)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false }); // No limit here, user asked for "all data" in range

    if (error) {
        console.error(error);
        alert("Error fetching filtered logs.");
        return;
    }

    renderTimeline(filteredLogs);
    
    // Visual feedback
    const btn = document.getElementById('apply-feed-filter');
    const originalText = btn.innerText;
    btn.innerText = `Showing ${filteredLogs.length} logs`;
    btn.classList.remove('bg-gray-900');
    btn.classList.add('bg-green-600');
    
    setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.add('bg-gray-900');
        btn.classList.remove('bg-green-600');
    }, 2000);
};

const resetTimelineFilter = () => {
    document.getElementById('feed-start-date').value = '';
    document.getElementById('feed-end-date').value = '';
    // Reset to default cache slice
    renderTimeline(allLogsCache.slice(0, 100));
};

const renderTimeline = (logs) => {
    const container = document.getElementById('activity-timeline');
    if(!container) return;
    
    container.innerHTML = '';

    if (!logs || logs.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 py-10">No activity logs found in this period.</div>`;
        return;
    }

    let lastDate = '';

    logs.forEach(log => {
        const date = new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const time = new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        
        if (date !== lastDate) {
            container.innerHTML += `
                <div class="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-2 mb-4 border-b border-gray-100">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">${date}</span>
                </div>
            `;
            lastDate = date;
        }

        const style = getLogStyle(log.action_type);
        
        let metaBadge = '';
        try {
            const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata || '{}') : (log.metadata || {});
            if(Object.keys(meta).length > 0) {
                const metaStr = JSON.stringify(meta).replace(/["{}]/g, '').substring(0, 20);
                metaBadge = `<span class="ml-2 px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200 truncate max-w-[150px] inline-block align-middle">${metaStr}...</span>`;
            }
        } catch(e) {}

        container.innerHTML += `
            <div class="timeline-item flex gap-4 group animate-fade-in">
                <div class="w-16 flex-shrink-0 text-right pt-1">
                    <span class="text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">${time}</span>
                </div>
                <div class="relative flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full ${style.bg} flex items-center justify-center z-10 border-2 border-white shadow-sm">
                        <i data-lucide="${style.icon}" class="w-4 h-4 ${style.color}"></i>
                    </div>
                    <div class="w-px h-full bg-gray-100 absolute top-8 -bottom-4 group-last:hidden"></div>
                </div>
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

const getLogStyle = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('login') || t.includes('view')) return { icon: 'eye', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (t.includes('purchase') || t.includes('order') || t.includes('redeem')) return { icon: 'shopping-bag', color: 'text-green-600', bg: 'bg-green-100' };
    if (t.includes('quiz') || t.includes('challenge') || t.includes('checkin')) return { icon: 'trophy', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (t.includes('error') || t.includes('fail') || t.includes('reject')) return { icon: 'alert-circle', color: 'text-red-600', bg: 'bg-red-100' };
    if (t.includes('update') || t.includes('create') || t.includes('delete')) return { icon: 'edit-3', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { icon: 'activity', color: 'text-gray-600', bg: 'bg-gray-100' };
};

// =======================
// 5. REALTIME SUBSCRIPTION
// =======================
const setupRealtimeSubscription = () => {
    if (activitySubscription) return;

    activitySubscription = supabase
        .channel('admin-analytics')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activity_log' }, async (payload) => {
            const { data: fullLog } = await supabase
                .from('user_activity_log')
                .select('*, users!user_id(full_name, role)')
                .eq('id', payload.new.id)
                .single();
            
            if (fullLog) {
                // Only refresh default views, complex filter refreshes are manual to avoid UI jumps
                fetchAndRenderData(); 
                showToast(`New Activity: ${fullLog.action_type}`, 'info');
            }
        })
        .subscribe();
};

const showToast = (msg, type) => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm font-bold shadow-lg transform transition-all duration-300 translate-y-10 opacity-0 ${type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`;
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const filterTimelineText = (term) => {
    const items = document.querySelectorAll('.timeline-item');
    term = term.toLowerCase();
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
    });
};
