import { supabase } from './supabase-client.js';

export const renderResetPwd = async (container) => {
    container.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h3 class="font-bold text-xl text-gray-800 mb-6">Reset Student Password</h3>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <label class="block text-xs font-bold text-gray-700 mb-2 uppercase">Find Student</label>
                <div class="flex gap-3">
                    <input type="text" id="reset-search" placeholder="Enter Student ID (e.g. 2023001) or Email" class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <button id="btn-search-reset" class="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition">
                        Search
                    </button>
                </div>
                <p id="reset-search-error" class="text-red-500 text-sm mt-2 hidden"></p>
            </div>

            <div id="reset-result" class="hidden bg-white p-8 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                
                <div class="flex items-center gap-4 mb-6">
                    <img id="rs-img" src="" class="w-16 h-16 rounded-full object-cover border-2 border-gray-100">
                    <div>
                        <h4 id="rs-name" class="text-xl font-bold text-gray-900"></h4>
                        <p id="rs-id" class="text-gray-500 text-sm font-mono"></p>
                        <p id="rs-course" class="text-gray-400 text-xs mt-1 uppercase font-bold"></p>
                    </div>
                </div>

                <hr class="border-gray-100 my-6">

                <form id="reset-pwd-form" class="space-y-4">
                    <input type="hidden" id="rs-user-uuid">
                    
                    <div>
                        <label class="block text-xs font-bold text-blue-700 mb-1 uppercase">New Password</label>
                        <div class="relative">
                            <input type="text" id="rs-new-pass" class="w-full p-3 border border-blue-200 rounded-lg font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Enter new password" required minlength="6">
                            <button type="button" onclick="generateRandomPass()" class="absolute right-2 top-2 bg-gray-100 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-200">
                                Generate Random
                            </button>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">Must be at least 6 characters.</p>
                    </div>

                    <button type="submit" id="btn-reset-submit" class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    `;

    // 1. Search Logic
    document.getElementById('btn-search-reset').addEventListener('click', async () => {
        const input = document.getElementById('reset-search').value.trim();
        const errEl = document.getElementById('reset-search-error');
        const resEl = document.getElementById('reset-result');

        if(!input) return;

        errEl.classList.add('hidden');
        resEl.classList.add('hidden');

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .or(`student_id.eq.${input},email.eq.${input}`)
            .single();

        if (error || !user) {
            errEl.textContent = "Student not found.";
            errEl.classList.remove('hidden');
            return;
        }

        // Fill Data
        document.getElementById('rs-user-uuid').value = user.id;
        document.getElementById('rs-img').src = user.profile_img_url || 'https://placehold.co/100';
        document.getElementById('rs-name').textContent = user.full_name;
        document.getElementById('rs-id').textContent = user.student_id;
        document.getElementById('rs-course').textContent = user.course;
        document.getElementById('rs-new-pass').value = ''; // Clear previous

        resEl.classList.remove('hidden');
    });

    // 2. Submit Logic
    document.getElementById('reset-pwd-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-reset-submit');
        const uid = document.getElementById('rs-user-uuid').value;
        const newPass = document.getElementById('rs-new-pass').value;

        if (newPass.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        if(!confirm("Are you sure you want to change this student's password?")) return;

        btn.disabled = true;
        btn.innerText = "Updating...";

        try {
            const { error } = await supabase.rpc('admin_reset_password', {
                p_target_user_id: uid,
                p_new_password: newPass
            });

            if (error) throw error;

            alert("Success! Password updated.");
            document.getElementById('reset-result').classList.add('hidden');
            document.getElementById('reset-search').value = '';

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = "Update Password";
        }
    });
};

// Helper for Random Password
window.generateRandomPass = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('rs-new-pass').value = pass;
};
