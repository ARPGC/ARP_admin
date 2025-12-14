import { supabase } from './supabase-client.js';

// Import renderers
import { renderDashboard } from './admin-dashboard.js';
import { renderEvents } from './admin-events.js';
import { renderStores } from './admin-store.js';      
import { renderProducts } from './admin-products.js'; 
import { renderOrders } from './admin-orders.js'; 
import { renderChallenges } from './admin-challenges.js'; 
import { renderCodes } from './admin-codes.js';
import { renderPlasticLogs } from './admin-plastic.js'; 

// Global Auth Check
const checkAdminAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Check Role
    const { data: user, error } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('auth_user_id', session.user.id)
        .single();

    if (error || !user || user.role !== 'admin') {
        console.error("Auth Error:", error);
        await supabase.auth.signOut();
        window.location.href = 'admin-login.html';
        return;
    }

    const nameEl = document.getElementById('admin-name');
    if(nameEl) nameEl.textContent = user.full_name;
    loadView('dashboard');
};

// Router Logic
window.loadView = (view) => {
    const container = document.getElementById('view-container');
    const title = document.getElementById('page-title');
    
    if (!container) return;

    // Loading State
    container.innerHTML = '<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>';

    // Update Navigation UI
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${view}'`)) {
            btn.classList.add('bg-gray-800', 'text-white');
            btn.classList.remove('text-gray-300');
        } else {
            btn.classList.remove('bg-gray-800', 'text-white');
            btn.classList.add('text-gray-300');
        }
    });

    // Route Handler
    setTimeout(() => {
        switch(view) {
            case 'dashboard': 
                if(title) title.textContent = 'Overview'; 
                renderDashboard(container); 
                break;
            case 'events': 
                if(title) title.textContent = 'Event Management'; 
                renderEvents(container); 
                break;
            case 'stores': 
                if(title) title.textContent = 'Manage Stores'; 
                renderStores(container); 
                break;
            case 'products': 
                if(title) title.textContent = 'Product Inventory'; 
                renderProducts(container); 
                break;
            case 'orders': 
                if(title) title.textContent = 'Order Management'; 
                renderOrders(container); 
                break;
            case 'challenges': 
                if(title) title.textContent = 'Challenges & Quizzes'; 
                renderChallenges(container); 
                break;
            case 'codes': 
                if(title) title.textContent = 'Redeem Codes'; 
                renderCodes(container); 
                break;
            case 'plastic': 
                if(title) title.textContent = 'Plastic Recycling Logs'; 
                renderPlasticLogs(container); 
                break;
            default: 
                renderDashboard(container);
        }
        if(window.lucide) window.lucide.createIcons();
    }, 50); 
};

window.handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = 'admin-login.html';
};

// Modal Helpers
window.closeModal = () => {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 200);
};

window.openModal = (html) => {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;
    content.innerHTML = html;
    overlay.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
        if(window.lucide) window.lucide.createIcons();
    }, 10);
};

checkAdminAuth();
