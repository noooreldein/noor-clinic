/* ===== Noor Clinic — Reports & Charts (custom canvas, zero deps) ===== */
const Charts = {
  palette: ['#0f766e', '#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed'],

  prep(ctxSel) {
    const c = document.querySelector(ctxSel);
    if (!c) return null;
    const dpr = window.devicePixelRatio || 1;
    const w = c.parentElement.clientWidth - 4;
    const h = parseInt(c.getAttribute('height')) || 200;
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  },

  /* last 6 months revenue */
  revenue(sel) {
    const p = this.prep(sel);
    if (!p) return;
    const { ctx, w, h } = p;
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('ar-EG', { month: 'short' });
      const total = Store.all('invoices')
        .filter(inv => { const x = new Date(inv.date); return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear(); })
        .reduce((s, inv) => s + inv.total, 0);
      months.push({ label, total });
    }
    const max = Math.max(...months.map(m => m.total), 100);
    const pad = 34, bw = (w - pad - 10) / months.length;

    ctx.clearRect(0, 0, w, h);
    // grid lines
    ctx.strokeStyle = '#eef2f5'; ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif';
    for (let g = 0; g <= 4; g++) {
      const y = h - 24 - ((h - 44) * g / 4);
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - 4, y); ctx.stroke();
      ctx.fillText(Math.round(max * g / 4), 2, y + 3);
    }
    months.forEach((m, i) => {
      const bh = (h - 44) * (m.total / max);
      const x = pad + i * bw + bw * 0.18;
      const y = h - 24 - bh;
      const grad = ctx.createLinearGradient(0, y, 0, h - 24);
      grad.addColorStop(0, '#0f766e'); grad.addColorStop(1, 'rgba(15,118,110,.25)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, bw * 0.64, bh, 5); ctx.fill();
      ctx.fillStyle = '#334155'; ctx.font = '11px sans-serif';
      ctx.fillText(m.label, x + bw * 0.32 - 10, h - 8);
      if (m.total) { ctx.fillStyle = '#0f766e'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(m.total, x + bw * 0.32 - 10, y - 6); }
    });
  },

  /* horizontal bars for arbitrary {label,value} lists */
  hbars(sel, data, unit = '') {
    const p = this.prep(sel);
    if (!p) return;
    const { ctx, w, h } = p;
    const max = Math.max(...data.map(d => d.value), 1);
    const rowH = Math.min(42, (h - 10) / data.length);
    ctx.clearRect(0, 0, w, h);
    data.forEach((d, i) => {
      const y = i * rowH + 4;
      const bw2 = (w - 180) * (d.value / max);
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath(); ctx.roundRect(170, y + 3, w - 180, rowH - 12, 6); ctx.fill();
      ctx.fillStyle = this.palette[i % this.palette.length];
      ctx.beginPath(); ctx.roundRect(170, y + 3, Math.max(bw2, 6), rowH - 12, 6); ctx.fill();
      ctx.fillStyle = '#334155'; ctx.font = '12px sans-serif';
      ctx.fillText(d.label, w - 4, y + rowH / 2 + 2);
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px sans-serif';
      const vtxt = d.value + (unit ? ' ' + unit : '');
      ctx.fillText(vtxt, 6, y + rowH / 2 + 2);
    });
  }
};

const Reports = {
  render() {
    const el = $('#view-reports');
    const invoices = Store.all('invoices');
    const meds = Store.all('medicines');
    const appts = Store.all('appointments');

    // top medicines by sold qty
    const sold = {};
    invoices.forEach(inv => inv.items.forEach(it => { sold[it.name] = (sold[it.name] || 0) + it.qty; }));
    const topMeds = Object.entries(sold).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // appointments per doctor
    const perDoc = {};
    appts.forEach(a => {
      const n = Store.doctorName(a.doctorId);
      perDoc[n] = (perDoc[n] || 0) + 1;
    });
    const docData = Object.entries(perDoc).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // statuses
    const cnt = s => appts.filter(a => a.status === s).length;
    const inventoryValue = meds.reduce((s, m) => s + m.stock * m.price, 0);

    el.innerHTML = `
      <div class="stat-inline" style="margin-bottom:18px">
        <div class="s"><b>${Store.money(Reports.sumAll(invoices)).replace(' ج.م', '')}</b><span>إجمالي الإيرادات (ج.م)</span></div>
        <div class="s"><b>${Store.money(inventoryValue).replace(' ج.م', '')}</b><span>قيمة المخزون (ج.م)</span></div>
        <div class="s"><b>${cnt('done')}</b><span>مواعيد منجزة</span></div>
        <div class="s"><b>${cnt('scheduled')}</b><span>مواعيد محجوزة</span></div>
        <div class="s"><b>${cnt('cancelled')}</b><span>مواعيد ملغاة</span></div>
      </div>
      <div class="grid two-col" style="margin-bottom:18px">
        <div class="card"><div class="card-head"><h3>الإيراد الشهري — آخر ٦ أشهر</h3></div>
          <div class="card-body"><canvas id="revChart" height="230"></canvas></div></div>
        <div class="card"><div class="card-head"><h3>الأدوية الأكثر صرفاً</h3></div>
          <div class="card-body">${topMeds.length ? '<canvas id="medChart" height="230"></canvas>' : '<div class="empty">لا توجد مبيعات بعد</div>'}</div></div>
      </div>
      <div class="grid two-col">
        <div class="card"><div class="card-head"><h3>المواعيد حسب الطبيب</h3></div>
          <div class="card-body">${docData.length ? '<canvas id="docChart" height="230"></canvas>' : '<div class="empty">لا توجد مواعيد</div>'}</div></div>
        <div class="card">
          <div class="card-head"><h3>صحة المخزون</h3></div>
          <div class="card-body mini-list">
            <div class="mini-item"><span>إجمالي الأدوية</span><b>${meds.length}</b></div>
            <div class="mini-item"><span>يحتاج تعويض</span><span class="badge b-amber">${Store.lowStock().length} دواء</span></div>
            <div class="mini-item"><span>قاربت على الانتهاء (٣٠ يوم)</span><span class="badge b-red">${Store.expiringSoon().length} دواء</span></div>
            <div class="mini-item"><span>نفدت من المخزن</span><span class="badge b-gray">${meds.filter(m => m.stock === 0).length} دواء</span></div>
            <div class="mini-item"><span>قيمة المخزون</span><b class="mono">${Store.money(inventoryValue)}</b></div>
          </div>
        </div>
      </div>`;

    Charts.revenue('#revChart');
    if (topMeds.length) Charts.hbars('#medChart', topMeds, 'وصفة');
    if (docData.length) Charts.hbars('#docChart', docData, 'موعد');
  },

  sumAll(invoices) { return invoices.reduce((s, i) => s + i.total, 0); }
};
