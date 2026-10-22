/* ===== Noor Clinic — Data Layer (localStorage) ===== */
const DB_KEY = 'noor-clinic-db-v1';
const SESSION_KEY = 'noor-clinic-session';

const Store = {
  db: null,

  load() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { this.db = JSON.parse(raw); this.migrate(); return; }
    this.db = this.seed();
    this.save();
  },

  save() { localStorage.setItem(DB_KEY, JSON.stringify(this.db)); },

  migrate() {
    // ensure all collections exist
    ['patients','doctors','appointments','medicines','invoices','settings'].forEach(k => {
      if (!this.db[k]) this.db[k] = k === 'settings' ? this.seed().settings : [];
    });
  },

  uid(prefix) { return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  // ---------- CRUD ----------
  all(col) { return this.db[col]; },
  get(col, id) { return this.db[col].find(r => r.id === id); },
  add(col, rec) { rec.id = rec.id || this.uid(col.slice(0, 3)); rec.createdAt = new Date().toISOString(); this.db[col].push(rec); this.save(); return rec; },
  update(col, id, patch) { const r = this.get(col, id); if (r) Object.assign(r, patch, { updatedAt: new Date().toISOString() }); this.save(); return r; },
  remove(col, id) { this.db[col] = this.db[col].filter(r => r.id !== id); this.save(); },

  // ---------- helpers ----------
  todayStr() { const d = new Date(); return d.toISOString().slice(0, 10); },
  fmtDate(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }); },
  money(n) { return Number(n || 0).toLocaleString('ar-EG') + ' ج.م'; },

  doctorName(id) { const d = this.get('doctors', id); return d ? d.name : '—'; },
  patientName(id) { const p = this.get('patients', id); return p ? p.name : '—'; },

  lowStock() { return this.db.medicines.filter(m => m.stock <= m.minStock); },
  expiringSoon() {
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    return this.db.medicines.filter(m => m.expiry && new Date(m.expiry) <= in30);
  },
  monthRevenue() {
    const now = new Date();
    return this.db.invoices
      .filter(i => { const d = new Date(i.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, i) => s + i.total, 0);
  },
  todayAppointments() { return this.db.appointments.filter(a => a.date === this.todayStr()); },

  // ---------- export / import ----------
  exportJSON() {
    const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'noor-clinic-backup-' + this.todayStr() + '.json';
    a.click();
  },
  importJSON(file, cb) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.patients || !data.settings) throw new Error('bad');
        this.db = data; this.migrate(); this.save(); cb(true);
      } catch { cb(false); }
    };
    reader.readAsText(file);
  },

  // ---------- seed ----------
  seed() {
    const today = new Date();
    const iso = d => d.toISOString().slice(0, 10);
    const day = n => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

    const doctors = [
      { id: 'doc-1', name: 'د. أحمد سمير', specialty: 'باطنة', phone: '01001234567', shift: 'صباحي', fee: 300, createdAt: iso(today) },
      { id: 'doc-2', name: 'د. منى عبد الله', specialty: 'أطفال', phone: '01112345678', shift: 'مسائي', fee: 250, createdAt: iso(today) },
      { id: 'doc-3', name: 'د. خالد الجندي', specialty: 'أسنان', phone: '01223456789', shift: 'صباحي', fee: 350, createdAt: iso(today) },
      { id: 'doc-4', name: 'د. سارة ماهر', specialty: 'جلدية', phone: '01098765432', shift: 'مسائي', fee: 400, createdAt: iso(today) }
    ];

    const patients = [
      { id: 'pat-1', name: 'محمد علي حسن', phone: '01011122233', age: 34, gender: 'ذكر', address: 'القاهرة — مدينة نصر', notes: 'ضغط مرتفع — متابعة دورية', createdAt: iso(today) },
      { id: 'pat-2', name: 'فاطمة سعيد', phone: '01122233344', age: 27, gender: 'أنثى', address: 'الجيزة — الدقي', notes: '', createdAt: iso(today) },
      { id: 'pat-3', name: 'عمر مصطفى', phone: '01233344455', age: 8, gender: 'ذكر', address: 'القاهرة — المعادي', notes: 'حساسية موسمية', createdAt: iso(today) },
      { id: 'pat-4', name: 'نورهان محمود', phone: '01044455566', age: 45, gender: 'أنثى', address: 'الإسكندرية — سموحة', notes: 'سكري نوع ٢', createdAt: iso(today) },
      { id: 'pat-5', name: 'يوسف كريم', phone: '01155566677', age: 19, gender: 'ذكر', address: 'القاهرة — حلوان', notes: '', createdAt: iso(today) }
    ];

    const appointments = [
      { id: 'apt-1', patientId: 'pat-1', doctorId: 'doc-1', date: day(0), time: '10:00', status: 'scheduled', notes: 'متابعة ضغط', createdAt: iso(today) },
      { id: 'apt-2', patientId: 'pat-3', doctorId: 'doc-2', date: day(0), time: '11:30', status: 'scheduled', notes: 'كشف طفل', createdAt: iso(today) },
      { id: 'apt-3', patientId: 'pat-4', doctorId: 'doc-1', date: day(0), time: '13:00', status: 'done', notes: 'تحليل سكر تراكمي', createdAt: iso(today) },
      { id: 'apt-4', patientId: 'pat-2', doctorId: 'doc-4', date: day(1), time: '17:00', status: 'scheduled', notes: 'حساسية جلد', createdAt: iso(today) },
      { id: 'apt-5', patientId: 'pat-5', doctorId: 'doc-3', date: day(2), time: '12:00', status: 'scheduled', notes: 'تنظيف أسنان', createdAt: iso(today) },
      { id: 'apt-6', patientId: 'pat-1', doctorId: 'doc-1', date: day(-7), time: '10:00', status: 'done', notes: 'متابعة شهرية', createdAt: iso(today) }
    ];

    const medicines = [
      { id: 'med-1', name: 'كونجستال', category: 'برد وإنفلونزا', price: 48, stock: 24, minStock: 10, expiry: '2027-06-30', createdAt: iso(today) },
      { id: 'med-2', name: 'بانادول إكسترا', category: 'مسكنات', price: 42, stock: 8, minStock: 10, expiry: '2026-12-31', createdAt: iso(today) },
      { id: 'med-3', name: 'أوجمنتين ١ جم', category: 'مضاد حيوي', price: 95, stock: 15, minStock: 8, expiry: '2027-02-28', createdAt: iso(today) },
      { id: 'med-4', name: 'بروزاك', category: 'أعصاب', price: 130, stock: 5, minStock: 6, expiry: '2026-11-15', createdAt: iso(today) },
      { id: 'med-5', name: 'جلوكوفاج ١٠٠٠', category: 'سكري', price: 78, stock: 30, minStock: 12, expiry: '2027-09-30', createdAt: iso(today) },
      { id: 'med-6', name: 'فيتامين د ٥٠٠٠', category: 'فيتامينات', price: 85, stock: 40, minStock: 15, expiry: '2027-04-30', createdAt: iso(today) },
      { id: 'med-7', name: 'كونكور ٥ مجم', category: 'ضغط', price: 60, stock: 3, minStock: 10, expiry: '2027-01-31', createdAt: iso(today) },
      { id: 'med-8', name: 'نيفورال', category: 'جلدية', price: 55, stock: 18, minStock: 6, expiry: '2027-08-31', createdAt: iso(today) }
    ];

    const mkInvoice = (id, patientId, items, date) => {
      const total = items.reduce((s, i) => s + i.qty * i.price, 0);
      return { id, patientId, items, total, date, paid: true, createdAt: date };
    };
    const invoices = [
      mkInvoice('inv-1', 'pat-1', [{ medId: 'med-7', name: 'كونكور ٥ مجم', qty: 2, price: 60 }, { medId: 'med-6', name: 'فيتامين د ٥٠٠٠', qty: 1, price: 85 }], day(-20)),
      mkInvoice('inv-2', 'pat-4', [{ medId: 'med-5', name: 'جلوكوفاج ١٠٠٠', qty: 3, price: 78 }], day(-15)),
      mkInvoice('inv-3', 'pat-2', [{ medId: 'med-8', name: 'نيفورال', qty: 1, price: 55 }, { medId: 'med-1', name: 'كونجستال', qty: 1, price: 48 }], day(-9)),
      mkInvoice('inv-4', 'pat-3', [{ medId: 'med-1', name: 'كونجستال', qty: 2, price: 48 }], day(-5)),
      mkInvoice('inv-5', 'pat-1', [{ medId: 'med-3', name: 'أوجمنتين ١ جم', qty: 1, price: 95 }, { medId: 'med-2', name: 'بانادول إكسترا', qty: 2, price: 42 }], day(-2))
    ];

    return {
      patients, doctors, appointments, medicines, invoices,
      settings: { clinicName: 'عيادة نور', currency: 'ج.م', user: 'admin', pass: 'admin123' },
      counters: {}
    };
  }
};
