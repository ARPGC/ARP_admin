import { supabase } from './supabase-client.js';

// --- MAIN RENDERER ---
export const renderEvents = async (container) => {
    container.innerHTML = `
        <div class="max-w-7xl mx-auto h-full flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="font-bold text-xl text-gray-800">Event Management</h3>
                    <p class="text-xs text-gray-500">Create events and track attendance</p>
                </div>
                <button onclick="openEventModal()" class="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 shadow-sm flex items-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Create Event
                </button>
            </div>

            <div id="events-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto p-1">
                <div class="col-span-full text-center py-12">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
    loadEvents();
};

// --- LOAD EVENTS ---
const loadEvents = async () => {
    const grid = document.getElementById('events-grid');
    if(!grid) return;

    // Fetch events sorted by start date
    const { data: events, error } = await supabase
        .from('events')
        .select('*') 
        .order('start_at', { ascending: true });

    if (error) {
        console.error("Event Load Error:", error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500 font-bold">Error loading events: ${error.message}</div>`;
        return;
    }

    if (!events || events.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-400 italic">No upcoming events found.</div>`;
        return;
    }

    grid.innerHTML = events.map(evt => {
        const dateObj = new Date(evt.start_at);
        const date = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        const time = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute:'2-digit' });
        const img = evt.poster_url || 'https://placehold.co/600x400?text=Event';

        return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group flex flex-col">
            <div class="h-32 bg-gray-100 relative">
                <img src="${img}" class="w-full h-full object-cover">
            </div>
            <div class="p-5 flex-grow">
                <h4 class="font-bold text-gray-900 text-lg mb-1">${evt.title}</h4>
                <div class="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <i data-lucide="calendar" class="w-3 h-3"></i> ${date} • ${time}
                </div>
                <p class="text-sm text-gray-600 line-clamp-2">${evt.description || 'No description provided.'}</p>
            </div>
            <div class="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                <button onclick="viewAttendance('${evt.id}', '${evt.title.replace(/'/g, "\\'")}')" class="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition">
                    Attendance
                </button>
                <button onclick="deleteEvent('${evt.id}')" class="px-3 text-gray-400 hover:text-red-500 transition">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    if(window.lucide) window.lucide.createIcons();
};

// --- VIEW ATTENDANCE MODAL (FIXED QUERY) ---
window.viewAttendance = async (eventId, eventName) => {
    const loadingHtml = `
        <div class="p-12 text-center">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto mb-4"></div>
            <p class="text-gray-500">Fetching attendance list...</p>
        </div>
    `;
    window.openModal(loadingHtml);

    // FIX IS HERE: We use 'users!user_id' to tell Supabase explicitly which relationship to use
    const { data: attendees, error } = await supabase
        .from('event_attendance')
        .select('status, users!user_id(full_name, student_id, course)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        window.openModal(`<div class="p-8 text-center text-red-500 font-bold">Error: ${error.message}<br><span class="text-xs font-normal text-gray-500">Check console for details.</span></div>`);
        return;
    }

    const presentCount = attendees.filter(a => a.status === 'present').length;

    const html = `
        <div class="flex flex-col h-full max-h-[85vh]">
            <div class="p-6 border-b border-gray-100 flex justify-between items-start shrink-0">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${eventName}</h3>
                    <p class="text-xs text-gray-500 mt-1">${attendees.length} Registered • <span class="text-green-600 font-bold">${presentCount} Present</span></p>
                </div>
                <div class="flex gap-2">
                    <button id="btn-download-pdf" class="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black flex items-center gap-2 transition">
                        <i data-lucide="download" class="w-3 h-3"></i> PDF
                    </button>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>

            <div class="flex-grow overflow-y-auto p-4 bg-gray-50">
                <div class="space-y-2">
                    ${attendees.length === 0 ? '<p class="text-center text-gray-400 py-8 italic">No registrations yet.</p>' : ''}
                    
                    ${attendees.map(a => `
                        <div class="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                            <div>
                                <p class="font-bold text-gray-800 text-sm">${a.users.full_name}</p>
                                <div class="flex gap-2 text-[10px] text-gray-500 uppercase font-bold mt-0.5">
                                    <span class="bg-gray-100 px-1.5 rounded">${a.users.student_id}</span>
                                    <span>${a.users.course}</span>
                                </div>
                            </div>
                            <div>
                                ${a.status === 'present' 
                                    ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">Present</span>' 
                                    : `<button onclick="markPresent('${eventId}', '${a.users.student_id}')" class="bg-brand-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-brand-700">Mark Present</button>`
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="p-3 border-t border-gray-100 text-center text-xs text-gray-400 shrink-0">
                End of list
            </div>
        </div>
    `;

    window.openModal(html);
    if(window.lucide) window.lucide.createIcons();

    // Attach PDF Listener
    const pdfBtn = document.getElementById('btn-download-pdf');
    if(pdfBtn) {
        pdfBtn.addEventListener('click', () => downloadAttendancePDF(eventName, attendees));
    }
};

// --- MARK PRESENT ---
window.markPresent = async (eventId, studentId) => {
    // 1. Get User ID
    const { data: user } = await supabase.from('users').select('id').eq('student_id', studentId).single();
    if(!user) return alert("User not found");

    // 2. Update Status in 'event_attendance'
    const { error } = await supabase
        .from('event_attendance')
        .update({ status: 'present' })
        .eq('event_id', eventId)
        .eq('user_id', user.id);

    if (error) alert("Error updating status");
    else {
        // Refresh Modal
        const titleEl = document.querySelector('#modal-content h3');
        const name = titleEl ? titleEl.innerText : 'Event';
        viewAttendance(eventId, name);
    }
};

// --- PDF GENERATOR ---
const downloadAttendancePDF = (eventName, attendees) => {
    if (!window.jspdf) {
        alert("PDF library is loading... please wait.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(eventName, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Attendance Report • ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = attendees.map(a => [
        a.users.student_id,
        a.users.full_name,
        a.users.course,
        a.status.toUpperCase()
    ]);

    doc.autoTable({
        head: [['ID', 'Name', 'Course', 'Status']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 10, cellPadding: 3 },
    });

    doc.save(`${eventName.replace(/\s+/g, '_')}_Attendance.pdf`);
};

// --- CREATE EVENT ---
window.openEventModal = () => {
    const html = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-800">Create New Event</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            
            <form id="create-event-form" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Event Title</label>
                    <input type="text" id="evt-title" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" required>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Start Date & Time</label>
                        <input type="datetime-local" id="evt-date" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Points Reward</label>
                        <input type="number" id="evt-points" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value="10">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Location</label>
                    <input type="text" id="evt-loc" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" required>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                    <textarea id="evt-desc" rows="3" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"></textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Poster URL (Optional)</label>
                    <input type="url" id="evt-img" placeholder="https://..." class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                </div>

                <button type="submit" class="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 shadow-md mt-2">
                    Publish Event
                </button>
            </form>
        </div>
    `;
    window.openModal(html);
    if(window.lucide) window.lucide.createIcons();

    document.getElementById('create-event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.innerText = "Creating...";

        const startAt = document.getElementById('evt-date').value;
        const endDate = new Date(startAt);
        endDate.setHours(endDate.getHours() + 2);
        
        const payload = {
            title: document.getElementById('evt-title').value,
            description: document.getElementById('evt-desc').value,
            start_at: new Date(startAt).toISOString(),
            end_at: endDate.toISOString(),
            location: document.getElementById('evt-loc').value,
            points_reward: parseInt(document.getElementById('evt-points').value),
            poster_url: document.getElementById('evt-img').value,
            created_by: (await supabase.auth.getUser()).data.user.id
        };

        const { error } = await supabase.from('events').insert(payload);
        
        if(error) {
            alert("Error: " + error.message);
            btn.disabled = false; btn.innerText = "Publish Event";
        } else {
            closeModal();
            loadEvents();
        }
    });
};

window.deleteEvent = async (id) => {
    if(!confirm("Are you sure? This will delete the event and all records.")) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if(!error) loadEvents();
};
