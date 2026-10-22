/* ===== Noor Clinic — Core App ===== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const App = {
  view: 'dashboard',

  /* ---------- boot ---------- */
  init() {
    Store.load();
    this.bindNav();
    $('#loginForm').addEventListener('submit', e => this.login(e));
    $('#logoutBtn').addEventListener('click', () => this.logout());
    $('#burgerBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#todayChip').textContent = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

    if (sessionStorage.getItem(SESSION_KEY)) this.openApp();
  },

  login(e) {
    e.preventDefault();
    const u = $('#loginUser').value.trim(), p = $('#loginPass').value;
    const s = Store.db.settings;
    if (u === s.user && p === s.pass) {
      sessionStorage.setItem(SESSION_KEY, '1');
      this.openApp();
    } else {
      $('#loginErr').hidden = false;
    }
  },

  logout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); },

  openApp() {
    $('#loginOverlay').style.display = 'none';
    $('#app').hidden = false;
    this.go('dashboard');
  },

  /* ---------- router ---------- */
  bindNav() {
    $$('.nav-link').forEach(a => a.addEventListener('click', () => {
      this.go(a.dataset.view);
      $('#sidebar').classList.remove('open');
    }));
  },

  go(view) {
    this.view = view;
    $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    $$('.view').forEach(v => v.hidden = true);
    $('#view-' + view).hidden = false;
    const titles = { dashboard: 'لوحة التحكم', patients: 'إدارة المرضى', doctors: 'الأطباء', appointments: 'المواعيد', pharmacy: 'الصيدلية والمخزون', invoices: 'الفواتير', reports: 'التقارير', settings: 'الإعدادات' };
    $('#pageTitle').textContent = titles[view];
    const renderers = { dashboard: () => Views.dashboard(), patients: () => Views.patients(), doctors: () => Views.doctors(), appointments: () => Views.appointments(), pharmacy: () => Pharmacy.render(), invoices: () => Pharmacy.renderInvoices(), reports: () => Reports.render(), settings: () => Views.settings() };
    renderers[view]();
  },

  /* ---------- shared UI ---------- */
  modal(html) { $('#modalBox').innerHTML = html; $('#modalOverlay').hidden = false; },
  closeModal() { $('#modalOverlay').hidden = true; },

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._tm); t._tm = setTimeout(() => t.hidden = true, 2600);
  },

  confirm(msg, onYes) {
    this.modal(`<h3>تأكيد</h3><p style="color:var(--soft);margin-top:8px">${msg}</p>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">إلغاء</button>
        <button class="btn btn-danger" id="yesBtn">تأكيد الحذف</button>
      </div>`);
    $('#yesBtn').onclick = () => { this.closeModal(); onYes(); };
  },

  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
};

/* ===== Views ===== */
const Views = {

  /* ---------- Dashboard ---------- */
  dashboard() {
    const el = $('#view-dashboard');
    const today = Store.todayStr();
    const apptsToday = Store.todayAppointments();
    const low = Store.lowStock();
    const revenue = Store.monthRevenue();
    const exp = Store.expiringSoon();

    el.innerHTML = `
      <div class="grid kpis">
        <div class="kpi"><div class="k-top">مواعيد اليوم <span class="k-ico" style="background:var(--teal-soft);color:var(--teal)">◷</span></div>
          <div class="k-num">${apptsToday.length}</div><div class="k-sub">${apptsToday.filter(a => a.status === 'done').length} تم إنجازها</div></div>
        <div class="kpi"><div class="k-top">إجمالي المرضى <span class="k-ico" style="background:var(--blue-soft);color:var(--blue)">☺</span></div>
          <div class="k-num">${Store.all('patients').length}</div><div class="k-sub">مريض مسجل</div></div>
        <div class="kpi"><div class="k-top">إيراد الشهر <span class="k-ico" style="background:var(--green-soft);color:var(--green)">▤</span></div>
          <div class="k-num">${Store.money(revenue).replace(' ج.م', '')}</div><div class="k-sub">جنيه — من الفواتير</div></div>
        <div class="kpi"><div class="k-top">مخزون يحتاج تعويض <span class="k-ico" style="background:var(--red-soft);color:var(--red)">❋</span></div>
          <div class="k-num">${low.length}</div><div class="k-sub">دواء تحت حد الطلب</div></div>
      </div>

      <div class="grid two-col">
        <div class="card">
          <div class="card-head"><h3>مواعيد اليوم</h3>
            <span class="badge b-teal">${new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</span></div>
          <div class="card-body">
            ${apptsToday.length ? `<table><thead><tr><th>الوقت</th><th>المريض</th><th>الطبيب</th><th>الحالة</th><th></th></tr></thead><tbody>
              ${apptsToday.sort((a, b) => a.time.localeCompare(b.time)).map(a => `
                <tr><td class="mono">${App.esc(a.time)}</td>
                <td>${App.esc(Store.patientName(a.patientId))}</td>
                <td>${App.esc(Store.doctorName(a.doctorId))}</td>
                <td>${Views.statusBadge(a.status)}</td>
                <td>${a.status === 'scheduled' ? `<button class="btn btn-sm btn-outline" onclick="Views.markDone('${a.id}')">إنجاز ✓</button>` : ''}</td></tr>`).join('')}
            </tbody></table>` : '<div class="empty">لا توجد مواعيد اليوم</div>'}
          </div>
        </div>

        <div class="grid" style="grid-template-columns:1fr;align-content:start">
          <div class="card">
            <div class="card-head"><h3>تنبيهات المخزون</h3></div>
            <div class="card-body mini-list">
              ${low.length ? low.map(m => `<div class="mini-item"><span>${App.esc(m.name)}</span><span class="badge b-red">${m.stock} متبقي</span></div>`).join('') : '<div class="empty" style="padding:16px">المخزون سليم ✓</div>'}
              ${exp.length ? exp.map(m => `<div class="mini-item"><span>${App.esc(m.name)}</span><span class="badge b-amber">ينتهي ${Store.fmtDate(m.expiry)}</span></div>`).join('') : ''}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>إيراد آخر ٦ أشهر</h3></div>
            <div class="card-body"><canvas id="dashChart" height="180"></canvas></div>
          </div>
        </div>
      </div>`;
    Charts.revenue('#dashChart');
  },

  statusBadge(s) {
    const map = { scheduled: ['b-blue', 'محجوز'], done: ['b-green', 'تم'], cancelled: ['b-red', 'ملغي'] };
    const [cls, label] = map[s] || ['b-gray', s];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  markDone(id) { Store.update('appointments', id, { status: 'done' }); App.toast('تم تسجيل الموعد كمُنجز'); Views.dashboard(); },

  /* ---------- Patients ---------- */
  patients(filter = '') {
    const el = $('#view-patients');
    let list = Store.all('patients');
    if (filter) list = list.filter(p => p.name.includes(filter) || (p.phone || '').includes(filter));
    el.innerHTML = `
      <div class="toolbar">
        <div class="search-wrap"><input placeholder="بحث بالاسم أو الهاتف..." value="${App.esc(filter)}" oninput="Views.patients(this.value)"></div>
        <span class="badge b-gray">${list.length} مريض</span>
        <span class="spacer"></span>
        <button class="btn btn-primary" onclick="Views.patientForm()">+ إضافة مريض</button>
      </div>
      <div class="card">
        ${list.length ? `<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>السن</th><th>النوع</th><th>العنوان</th><th>ملاحظات</th><th></th></tr></thead><tbody>
        ${list.map(p => `<tr>
          <td><b>${App.esc(p.name)}</b></td><td class="mono">${App.esc(p.phone)}</td><td>${p.age}</td>
          <td>${App.esc(p.gender)}</td><td>${App.esc(p.address || '—')}</td>
          <td style="color:var(--soft)">${App.esc(p.notes || '—')}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-sm btn-outline" onclick="Views.patientForm('${p.id}')">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="Views.delPatient('${p.id}')">حذف</button>
          </td></tr>`).join('')}
        </tbody></table>` : '<div class="empty">لا يوجد مرضى — ابدأ بإضافة مريض</div>'}
      </div>`;
  },

  patientForm(id) {
    const p = id ? Store.get('patients', id) : {};
    App.modal(`<h3>${id ? 'تعديل بيانات المريض' : 'إضافة مريض جديد'}</h3>
      <form id="patientF">
        <label>الاسم</label><input name="name" required value="${App.esc(p.name || '')}">
        <div class="form-row">
          <div><label>الهاتف</label><input name="phone" value="${App.esc(p.phone || '')}"></div>
          <div><label>السن</label><input name="age" type="number" min="0" value="${p.age || ''}"></div>
        </div>
        <div class="form-row">
          <div><label>النوع</label><select name="gender">
            <option value="ذكر" ${p.gender === 'ذكر' ? 'selected' : ''}>ذكر</option>
            <option value="أنثى" ${p.gender === 'أنثى' ? 'selected' : ''}>أنثى</option></select></div>
          <div><label>العنوان</label><input name="address" value="${App.esc(p.address || '')}"></div>
        </div>
        <label>ملاحظات طبية</label><textarea name="notes" rows="2">${App.esc(p.notes || '')}</textarea>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">إلغاء</button>
          <button class="btn btn-primary">حفظ</button>
        </div>
      </form>`);
    $('#patientF').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const rec = Object.fromEntries(f.entries());
      rec.age = +rec.age || 0;
      if (id) Store.update('patients', id, rec); else Store.add('patients', rec);
      App.closeModal(); App.toast('تم حفظ بيانات المريض'); Views.patients();
    });
  },

  delPatient(id) {
    App.confirm('سيتم حذف المريض وجميع بياناته. هل أنت متأكد؟', () => {
      Store.remove('patients', id);
      App.toast('تم حذف المريض'); Views.patients();
    });
  },

  /* ---------- Doctors ---------- */
  doctors() {
    const el = $('#view-doctors');
    const docs = Store.all('doctors');
    el.innerHTML = `
      <div class="toolbar">
        <span class="badge b-gray">${docs.length} طبيب</span><span class="spacer"></span>
        <button class="btn btn-primary" onclick="Views.doctorForm()">+ إضافة طبيب</button>
      </div>
      <div class="doc-grid">
        ${docs.map(d => `
          <div class="doc-card">
            <div class="doc-avatar">${App.esc(d.name.replace('د. ', '').charAt(0))}</div>
            <h4>${App.esc(d.name)}</h4>
            <div class="doc-spec">${App.esc(d.specialty)} — كشف ${Store.money(d.fee)}</div>
            <div class="doc-meta"><span class="badge b-teal">حضور ${App.esc(d.shift)}</span><span class="badge b-gray mono">${App.esc(d.phone)}</span></div>
            <div class="doc-actions">
              <button class="btn btn-sm btn-outline" onclick="Views.doctorForm('${d.id}')">تعديل</button>
              <button class="btn btn-sm btn-danger" onclick="Views.delDoctor('${d.id}')">حذف</button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  doctorForm(id) {
    const d = id ? Store.get('doctors', id) : {};
    App.modal(`<h3>${id ? 'تعديل بيانات الطبيب' : 'إضافة طبيب'}</h3>
      <form id="doctorF">
        <label>الاسم</label><input name="name" required placeholder="د. ..." value="${App.esc(d.name || '')}">
        <div class="form-row">
          <div><label>التخصص</label><input name="specialty" required value="${App.esc(d.specialty || '')}"></div>
          <div><label>الهاتف</label><input name="phone" value="${App.esc(d.phone || '')}"></div>
        </div>
        <div class="form-row">
          <div><label>الحضور</label><select name="shift">
            <option ${d.shift === 'صباحي' ? 'selected' : ''}>صباحي</option>
            <option ${d.shift === 'مسائي' ? 'selected' : ''}>مسائي</option></select></div>
          <div><label>سعر الكشف</label><input name="fee" type="number" min="0" value="${d.fee || ''}"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">إلغاء</button>
          <button class="btn btn-primary">حفظ</button>
        </div>
      </form>`);
    $('#doctorF').addEventListener('submit', e => {
      e.preventDefault();
      const rec = Object.fromEntries(new FormData(e.target).entries());
      rec.fee = +rec.fee || 0;
      if (id) Store.update('doctors', id, rec); else Store.add('doctors', rec);
      App.closeModal(); App.toast('تم حفظ بيانات الطبيب'); Views.doctors();
    });
  },

  delDoctor(id) {
    App.confirm('سيتم حذف الطبيب. هل أنت متأكد؟', () => {
      Store.remove('doctors', id); App.toast('تم حذف الطبيب'); Views.doctors();
    });
  },

  /* ---------- Appointments ---------- */
  appointments(dateFilter = '', statusFilter = '') {
    const el = $('#view-appointments');
    let list = Store.all('appointments');
    if (dateFilter) list = list.filter(a => a.date === dateFilter);
    if (statusFilter) list = list.filter(a => a.status === statusFilter);
    const today = Store.todayStr();
    const counts = s => Store.all('appointments').filter(a => a.status === s).length;

    el.innerHTML = `
      <div class="toolbar">
        <input type="date" style="width:auto" value="${dateFilter}" onchange="Views.appointments(this.value,'${statusFilter}')">
        <button class="chip ${!statusFilter ? 'on' : ''}" onclick="Views.appointments('${dateFilter}','')">الكل</button>
        <button class="chip ${statusFilter === 'scheduled' ? 'on' : ''}" onclick="Views.appointments('${dateFilter}','scheduled')">محجوز (${counts('scheduled')})</button>
        <button class="chip ${statusFilter === 'done' ? 'on' : ''}" onclick="Views.appointments('${dateFilter}','done')">منجز (${counts('done')})</button>
        <button class="chip ${statusFilter === 'cancelled' ? 'on' : ''}" onclick="Views.appointments('${dateFilter}','cancelled')">ملغي (${counts('cancelled')})</button>
        <button class="chip" onclick="Views.appointments('${today}','')">اليوم</button>
        <span class="spacer"></span>
        <button class="btn btn-primary" onclick="Views.appointmentForm()">+ حجز موعد</button>
      </div>
      <div class="card">
        ${list.length ? `<table><thead><tr><th>التاريخ</th><th>الوقت</th><th>المريض</th><th>الطبيب</th><th>ملاحظات</th><th>الحالة</th><th></th></tr></thead><tbody>
        ${list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map(a => `<tr class="${a.date === today ? '' : ''}">
          <td class="mono">${Store.fmtDate(a.date)}${a.date === today ? ' <span class="badge b-teal">اليوم</span>' : ''}</td>
          <td class="mono">${App.esc(a.time)}</td>
          <td><b>${App.esc(Store.patientName(a.patientId))}</b></td>
          <td>${App.esc(Store.doctorName(a.doctorId))}</td>
          <td style="color:var(--soft)">${App.esc(a.notes || '—')}</td>
          <td>${Views.statusBadge(a.status)}</td>
          <td style="white-space:nowrap">
            ${a.status === 'scheduled' ? `
              <button class="btn btn-sm btn-outline" onclick="Views.setApt('${a.id}','done')">✓</button>
              <button class="btn btn-sm btn-danger" onclick="Views.setApt('${a.id}','cancelled')">✕</button>` : ''}
          </td></tr>`).join('')}
        </tbody></table>` : '<div class="empty">لا توجد مواعيد بهذا الفلتر</div>'}
      </div>`;
  },

  setApt(id, status) { Store.update('appointments', id, { status }); App.toast(status === 'done' ? 'تم إنجاز الموعد' : 'تم إلغاء الموعد'); Views.appointments(); },

  appointmentForm() {
    const patients = Store.all('patients'), doctors = Store.all('doctors');
    if (!patients.length || !doctors.length) return App.toast('أضف مريض وطبيب أولاً');
    App.modal(`<h3>حجز موعد جديد</h3>
      <form id="aptF">
        <div class="form-row">
          <div><label>المريض</label><select name="patientId" required>${patients.map(p => `<option value="${p.id}">${App.esc(p.name)}</option>`).join('')}</select></div>
          <div><label>الطبيب</label><select name="doctorId" required>${doctors.map(d => `<option value="${d.id}">${App.esc(d.name)} — ${App.esc(d.specialty)}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div><label>التاريخ</label><input name="date" type="date" required value="${Store.todayStr()}"></div>
          <div><label>الوقت</label><input name="time" type="time" required value="10:00"></div>
        </div>
        <label>ملاحظات</label><input name="notes" placeholder="سبب الزيارة...">
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">إلغاء</button>
          <button class="btn btn-primary">حجز</button>
        </div>
      </form>`);
    $('#aptF').addEventListener('submit', e => {
      e.preventDefault();
      const rec = Object.fromEntries(new FormData(e.target).entries());
      rec.status = 'scheduled';
      Store.add('appointments', rec);
      App.closeModal(); App.toast('تم حجز الموعد'); Views.appointments();
    });
  },

  /* ---------- Settings ---------- */
  settings() {
    const s = Store.db.settings;
    $('#view-settings').innerHTML = `
      <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
        <div class="card">
          <div class="card-head"><h3>بيانات العيادة</h3></div>
          <div class="card-body">
            <form id="settingsF">
              <label>اسم العيادة</label><input name="clinicName" value="${App.esc(s.clinicName)}">
              <label>اسم المستخدم للدخول</label><input name="user" value="${App.esc(s.user)}">
              <label>كلمة المرور</label><input name="pass" value="${App.esc(s.pass)}">
              <label>العملة</label><input name="currency" value="${App.esc(s.currency)}">
              <div class="modal-actions" style="justify-content:flex-start"><button class="btn btn-primary">حفظ الإعدادات</button></div>
            </form>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>النسخ الاحتياطي</h3></div>
          <div class="card-body">
            <p style="color:var(--soft);margin-bottom:14px">البيانات محفوظة محلياً في متصفحك. صدّر نسخة JSON للاحتياط أو لنقل البيانات لجهاز آخر.</p>
            <div class="pill-row">
              <button class="btn btn-primary" onclick="Store.exportJSON()">⬇ تصدير نسخة احتياطية</button>
              <label class="btn btn-outline" style="cursor:pointer">⬆ استيراد نسخة
                <input type="file" accept=".json" hidden onchange="Views.importFile(this)"></label>
              <button class="btn btn-danger" onclick="Views.resetData()">إعادة ضبط البيانات</button>
            </div>
          </div>
        </div>
      </div>`;
    $('#settingsF').addEventListener('submit', e => {
      e.preventDefault();
      Object.assign(Store.db.settings, Object.fromEntries(new FormData(e.target).entries()));
      Store.save(); App.toast('تم حفظ الإعدادات ✓');
    });
  },

  importFile(input) {
    if (!input.files[0]) return;
    Store.importJSON(input.files[0], ok => {
      if (ok) { App.toast('تم استيراد البيانات بنجاح ✓'); App.go('dashboard'); }
      else App.toast('الملف غير صالح — فشل الاستيراد');
    });
  },

  resetData() {
    App.confirm('سيتم حذف كل البيانات والعودة للبيانات الافتراضية. هل أنت متأكد؟', () => {
      localStorage.removeItem(DB_KEY);
      Store.load(); App.toast('تمت إعادة الضبط'); App.go('dashboard');
    });
  }
};

/* charts stub loaded from reports.js */
App.init();
