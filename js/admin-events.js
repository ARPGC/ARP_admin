import { supabase } from './supabase-client.js';

export const renderEvents = async (container) => {
    // OPTIMIZATION: Do not fetch 'description' for the list view
    const { data: events, error } = await supabase
        .from('events')
        .select('id, title, start_at, end_at, points_reward, poster_url, event_attendance(count)')
        .order('start_at', { ascending: false });

    if (error) {
        console.error('Error loading events:', error);
        return;
    }

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-xl text-gray-800">Event Management</h3>
            <button onclick="openEventModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all">
                <i data-lucide="plus" class="w-4 h-4"></i> Create Event
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${(events || []).map(e => {
                const isCompleted = new Date(e.end_at) < new Date();
                const statusBadge = isCompleted 
                    ? '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Completed</span>'
                    : '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Upcoming</span>';

                let rsvpCount = 0;
                if (e.event_attendance && e.event_attendance.length > 0) rsvpCount = e.event_attendance[0].count;

                return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-md transition">
                    <div class="h-32 bg-gray-100 relative">
                        <img src="${e.poster_url || 'https://placehold.co/600x400?text=Event'}" class="w-full h-full object-cover">
                        <div class="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                            +${e.points_reward} pts
                        </div>
                    </div>
                    <div class="p-5 flex-grow flex flex-col">
                        <div class="flex justify-between items-start mb-2">
                            <div class="text-xs text-gray-500 font-bold uppercase tracking-wide">
                                ${new Date(e.start_at).toLocaleDateString()}
                            </div>
                            ${statusBadge}
                        </div>
                        <h4 class="font-bold text-lg text-gray-900 mb-1 line-clamp-1" title="${e.title}">${e.title}</h4>
                        <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                            <div class="text-xs text-gray-500">
                                <strong class="text-gray-800 text-sm">${rsvpCount}</strong> RSVPs
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openEventModal('${e.id}')" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition">
                                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                                </button>
                                <button onclick="openAttendance('${e.id}')" class="bg-brand-50 text-brand-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-brand-100 transition flex items-center gap-1">
                                    <i data-lucide="users" class="w-4 h-4"></i> Manage
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
};

window.openEventModal = async (eventId = null) => {
    let evt = { title: '', description: '', location: '', points_reward: 50, start_at: '', end_at: '', poster_url: '', organizer: 'Green Club' };

    if (eventId) {
        const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (data) {
            evt = data;
            if(evt.start_at) evt.start_at = new Date(evt.start_at).toISOString().slice(0, 16);
            if(evt.end_at) evt.end_at = new Date(evt.end_at).toISOString().slice(0, 16);
        }
    }

    const html = `
        <div class="p-6 h-full flex flex-col relative">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-800">${eventId ? 'Edit Event' : 'Create Event'}</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <form id="event-form" class="space-y-4 flex-grow overflow-y-auto p-1">
                <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Event Title</label><input type="text" id="e-title" value="${evt.title}" class="w-full p-2 border rounded" required></div>
                <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Description</label><textarea id="e-desc" class="w-full p-2 border rounded" rows="3">${evt.description || ''}</textarea></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Start Time</label><input type="datetime-local" id="e-start" value="${evt.start_at || ''}" class="w-full p-2 border rounded" required></div>
                    <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">End Time</label><input type="datetime-local" id="e-end" value="${evt.end_at || ''}" class="w-full p-2 border rounded" required></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Location</label><input type="text" id="e-location" value="${evt.location}" class="w-full p-2 border rounded" required></div>
                    <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Points Reward</label><input type="number" id="e-points" value="${evt.points_reward}" class="w-full p-2 border rounded font-bold text-green-600" required></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Organizer</label><input type="text" id="e-organizer" value="${evt.organizer}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Poster URL</label><input type="text" id="e-poster" value="${evt.poster_url || ''}" class="w-full p-2 border rounded"></div>
                </div>
                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 mt-4">${eventId ? 'Update Event' : 'Create Event'}</button>
            </form>
        </div>
    `;
    openModal(html);

    document.getElementById('event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById('e-title').value,
            description: document.getElementById('e-desc').value,
            start_at: document.getElementById('e-start').value,
            end_at: document.getElementById('e-end').value,
            location: document.getElementById('e-location').value,
            points_reward: parseInt(document.getElementById('e-points').value),
            organizer: document.getElementById('e-organizer').value,
            poster_url: document.getElementById('e-poster').value
        };

        const { error } = eventId 
            ? await supabase.from('events').update(payload).eq('id', eventId)
            : await supabase.from('events').insert(payload);

        if (error) alert('Error: ' + error.message);
        else { closeModal(); renderEvents(document.getElementById('view-container')); }
    });
};

window.openAttendance = async (eventId) => {
    const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
    const { data: attendees } = await supabase.from('event_attendance').select('*, users!user_id(full_name, student_id, course)').eq('event_id', eventId);
    const safeAttendees = attendees || [];
    const isEventCompleted = new Date(event.end_at) < new Date();

    const html = `
        <div class="flex flex-col h-full bg-gray-50">
            <div class="p-6 border-b bg-white sticky top-0 z-10 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                    <div><h3 class="text-xl font-bold text-gray-900">${event.title}</h3><p class="text-xs text-gray-500 mt-1">${new Date(event.start_at).toLocaleString()}</p></div>
                    <button onclick="closeModal()" class="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <div class="flex justify-between items-center">
                    <div class="flex gap-4 text-sm"><div><strong>${safeAttendees.length}</strong> Registered</div><div><strong>${safeAttendees.filter(a => a.status === 'confirmed').length}</strong> Present</div></div>
                    <button onclick="downloadAttendancePDF('${eventId}')" class="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black flex items-center gap-2 transition"><i data-lucide="file-down" class="w-4 h-4"></i> Download PDF</button>
                </div>
                ${!isEventCompleted ? `<div class="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-xs flex items-center"><i data-lucide="alert-circle" class="w-4 h-4 mr-2"></i>Attendance can only be marked after the event ends.</div>` : ''}
            </div>
            <div class="p-0 flex-grow overflow-y-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-100 text-gray-500 font-bold uppercase text-xs border-b"><tr><th class="p-4">Student</th><th class="p-4">Course</th><th class="p-4">Status</th><th class="p-4 text-right">Action</th></tr></thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                        ${safeAttendees.map(a => `
                            <tr>
                                <td class="p-4"><div class="font-bold text-gray-900">${a.users?.full_name || 'Unknown'}</div><div class="text-xs text-gray-500">${a.users?.student_id || 'N/A'}</div></td>
                                <td class="p-4 text-gray-600">${a.users?.course || '-'}</td>
                                <td class="p-4"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${a.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">${a.status}</span></td>
                                <td class="p-4 text-right">
                                    ${a.status === 'confirmed' ? `<span class="text-green-600 font-bold text-xs flex items-center justify-end gap-1"><i data-lucide="check" class="w-3 h-3"></i> Awarded</span>` : `<button onclick="markPresent(this, '${a.id}', '${eventId}', ${isEventCompleted})" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50" ${!isEventCompleted ? 'disabled' : ''}>Mark Present</button>`}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    openModal(html);
};

window.markPresent = async (btn, rowId, eventId, isCompleted) => {
    if (!isCompleted || !confirm("Mark present and award points?")) return;
    btn.disabled = true; btn.innerText = "Processing...";
    const { data: { user } } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
    
    await supabase.from('event_attendance').update({ status: 'confirmed', admin_id: admin.id }).eq('id', rowId);
    openAttendance(eventId);
};

window.downloadAttendancePDF = async (eventId) => {
    const { jsPDF } = window.jspdf;
    const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
    const { data: attendees } = await supabase.from('event_attendance').select('status, users!user_id(full_name, student_id, course)').eq('event_id', eventId);
    
    const doc = new jsPDF();
    doc.text(`Attendance: ${event.title}`, 14, 20);
    doc.autoTable({
        startY: 30,
        head: [['ID', 'Name', 'Course', 'Status']],
        body: attendees.map(a => [a.users?.student_id, a.users?.full_name, a.users?.course, a.status.toUpperCase()])
    });
    doc.save(`Attendance_${event.title}.pdf`);
};
