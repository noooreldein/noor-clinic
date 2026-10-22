/* ===== Noor Clinic — Pharmacy & Invoices ===== */
const Pharmacy = {

  /* ---------- Pharmacy view ---------- */
  render(filter = '', lowOnly = false) {
    const el = $('#view-pharmacy');
    let meds = Store.all('medicines');
    if (filter) meds = meds.filter(m => m.name.includes(filter) || (m.category || '').includes(filter));
    if (lowOnly) meds = meds.filter(m => m.stock <= m.minStock);

    const stockBadge = m => {
      if (m.stock === 0) return '<span class="badge b-red">نفد</span>';
      if (m.stock <= m.minStock) return `<span class="badge b-amber">${m.stock} — قارب ينفد</span>`;
      return `<span class="badge b-green">${m.stock} في المخزن</span>`;
    };

    el.innerHTML = `
      <div class="toolbar">
        <div class="search-wrap"><input placeholder="بحث باسم الدواء أو التصنيف..." value="${App.esc(filter)}" oninput="Pharmacy.render(this.value,${lowOnly})"></div>
        <button class="chip ${lowOnly ? 'on' : ''}" onclick="Pharmacy.render('${filter.split("'").join('')}',!${lowOnly ? 1 : 0})">⚠ يحتاج تعويض فقط</button>
        <span class="badge b-gray">${meds.length} دواء</span>
        <span class="spacer"></span>
        <button class="btn btn-primary" onclick="Pharmacy.medForm()">+ إضافة دواء</button>
      </div>
      <div class="card">
        <table><thead><tr><th>الدواء</th><th>التصنيف</th><th>السعر</th><th>المخزون</th><th>حد الطلب</th><th>الصلاحية</th><th></th></tr></thead><tbody>
        ${meds.map(m => `<tr>
          <td><b>${App.esc(m.name)}</b></td>
          <td><span class="badge b-teal">${App.esc(m.category)}</span></td>
          <td class="mono">${Store.money(m.price)}</td>
          <td>${stockBadge(m)}</td>
          <td>${m.minStock}</td>
          <td>${m.expiry ? Store.fmtDate(m.expiry) : '—'} ${m.expiry && new Date(m.expiry) < new Date() ? '<span class="badge b-red">منتهي!</span>' : ''}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-sm btn-outline" onclick="Pharmacy.stockForm('${m.id}')">مخزون +</button>
            <button class="btn btn-sm btn-outline" onclick="Pharmacy.medForm('${m.id}')">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="Pharmacy.delMed('${m.id}')">حذف</button>
          </td></tr>`).join('')}
        </tbody></table>
        ${!meds.length ? '<div class="empty">لا توجد أدوية بهذا الفلتر</div>' : ''}
      </div>`;
  },

  medForm(id) {
    const m = id ? Store.get('medicines', id) : {};
    App.modal(`<h3>${id ? 'تعديل دواء' : 'إضافة دواء'}</h3>
      <form id="medF">
        <div class="form-row">
          <div><label>اسم الدواء</label><input name="name" required value="${App.esc(m.name || '')}"></div>
          <div><label>التصنيف</label><input name="category" value="${App.esc(m.category || '')}"></div>
        </div>
        <div class="form-row">
          <div><label>السعر (ج.م)</label><input name="price" type="number" min="0" step="0.5" required value="${m.price ?? ''}"></div>
          <div><label>الصلاحية</label><input name="expiry" type="date" value="${m.expiry || ''}"></div>
        </div>
        <div class="form-row">
          <div><label>الكمية في المخزون</label><input name="stock" type="number" min="0" required value="${m.stock ?? 0}"></div>
          <div><label>حد إعادة الطلب</label><input name="minStock" type="number" min="0" value="${m.minStock ?? 5}"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">إلغاء</button>
          <button class="btn btn-primary">حفظ</button>
        </div>
      </form>`);
    $('#medF').addEventListener('submit', e => {
      e.preventDefault();
      const rec = Object.fromEntries(new FormData(e.target).entries());
      ['price', 'stock', 'minStock'].forEach(k => rec[k] = +rec[k] || 0);
      if (id) Store.update('medicines', id, rec); else Store.add('medicines', rec);
      App.closeModal(); App.toast('تم حفظ الدواء'); Pharmacy.render();
    });
  },

  stockForm(id) {
    const m = Store.get('medicines', id);
    App.modal(`<h3>إضافة مخزون — ${App.esc(m.name)}</h3>
      <p style="color:var(--soft);margin-top:4px">المتوفر حالياً: <b>${m.stock}</b> — الحد: <b>${m.minStock}</b></p>
      <form id="stockF">
        <label>الكمية المضافة</label><input name="qty" type="number" min="1" required placeholder="مثال: 20">
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">إلغاء</button>
          <button class="btn btn-primary">إضافة</button>
        </div>
      </form>`);
    $('#stockF').addEventListener('submit', e => {
      e.preventDefault();
      const qty = +new FormData(e.target).get('qty');
      Store.update('medicines', id, { stock: m.stock + qty });
      App.closeModal(); App.toast(`تمت إضافة ${qty} للمخزون`); Pharmacy.render();
    });
  },

  delMed(id) {
    App.confirm('سيتم حذف الدواء من المخزون. هل أنت متأكد؟', () => {
      Store.remove('medicines', id); App.toast('تم حذف الدواء'); Pharmacy.render();
    });
  },

  /* ---------- Invoices ---------- */
  renderInvoices() {
    const el = $('#view-invoices');
    const invoices = Store.all('invoices').sort((a, b) => b.date.localeCompare(a.date));
    const total = invoices.reduce((s, i) => s + i.total, 0);

    el.innerHTML = `
      <div class="grid kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
        <div class="kpi"><div class="k-top">إجمالي الفواتير</div><div class="k-num">${invoices.length}</div></div>
        <div class="kpi"><div class="k-top">الإيراد الكلي</div><div class="k-num">${total.toLocaleString('ar-EG')}</div><div class="k-sub">جنيه</div></div>
        <div class="kpi"><div class="k-top">متوسط الفاتورة</div><div class="k-num">${invoices.length ? Math.round(total / invoices.length) : 0}</div><div class="k-sub">جنيه</div></div>
      </div>
      <div class="toolbar">
        <span class="badge b-gray">أحدث الفواتير</span><span class="spacer"></span>
        <button class="btn btn-primary" onclick="Pharmacy.invoiceForm()">+ فاتورة جديدة</button>
      </div>
      <div class="card">
        ${invoices.length ? `<table><thead><tr><th>رقم</th><th>المريض</th><th>التاريخ</th><th>الأصناف</th><th>الإجمالي</th><th></th></tr></thead><tbody>
        ${invoices.map(inv => `<tr>
          <td class="mono">${App.esc(inv.id.slice(-6).toUpperCase())}</td>
          <td><b>${App.esc(Store.patientName(inv.patientId))}</b></td>
          <td class="mono">${Store.fmtDate(inv.date)}</td>
          <td>${inv.items.length} صنف</td>
          <td><b class="mono">${Store.money(inv.total)}</b></td>
          <td style="white-space:nowrap">
            <button class="btn btn-sm btn-outline" onclick="Pharmacy.printInvoice('${inv.id}')">طباعة</button>
            <button class="btn btn-sm btn-danger" onclick="Pharmacy.delInvoice('${inv.id}')">حذف</button>
          </td></tr>`).join('')}
        </tbody></table>` : '<div class="empty">لا توجد فواتير بعد — أنشئ أول فاتورة</div>'}
      </div>`;
  },

  invoiceForm() {
    const patients = Store.all('patients');
    const meds = Store.all('medicines').filter(m => m.stock > 0);
    if (!patients.length) return App.toast('أضف مريضاً أولاً');
    if (!meds.length) return App.toast('لا يوجد مخزون متاح للبيع');

    App.modal(`<h3>فاتورة جديدة</h3>
      <form id="invF">
        <label>المريض</label>
        <select name="patientId" required>${patients.map(p => `<option value="${p.id}">${App.esc(p.name)}</option>`).join('')}</select>
        <label>الأصناف</label>
        <div id="invLines"></div>
        <button type="button" class="btn btn-outline btn-sm" id="addLine">+ إضافة صنف</button>
        <div class="card" style="margin-top:16px;padding:14px;background:var(--teal-soft);border-color:transparent">
          <div style="display:flex;justify-content:space-between;font-weight:700">
            <span>الإجمالي</span><span id="invTotal">${Store.money(0)}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="App.closeModal()">إلغاء</button>
          <button class="btn btn-primary">إصدار الفاتورة</button>
        </div>
      </form>`);

    const lines = $('#invLines');
    const addLine = () => {
      const row = document.createElement('div');
      row.className = 'form-row';
      row.style.marginTop = '8px';
      row.innerHTML = `
        <select class="inv-med">${meds.map(m => `<option value="${m.id}" data-price="${m.price}">${App.esc(m.name)} — ${Store.money(m.price)} (${m.stock} متوفر)</option>`).join('')}</select>
        <div style="display:flex;gap:6px">
          <input class="inv-qty" type="number" min="1" value="1" style="width:80px">
          <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.form-row').remove();calcTotal()">✕</button>
        </div>`;
      lines.appendChild(row);
      row.addEventListener('change', calcTotal);
      row.addEventListener('input', calcTotal);
      calcTotal();
    };
    const calcTotal = () => {
      let total = 0;
      $$('#invLines .form-row').forEach(row => {
        const opt = row.querySelector('.inv-med').selectedOptions[0];
        const qty = +row.querySelector('.inv-qty').value || 0;
        total += (+opt.dataset.price) * qty;
      });
      $('#invTotal').textContent = Store.money(total);
    };
    $('#addLine').addEventListener('click', addLine);
    addLine();

    $('#invF').addEventListener('submit', e => {
      e.preventDefault();
      const rows = $$('#invLines .form-row');
      if (!rows.length) return App.toast('أضف صنفاً واحداً على الأقل');
      const items = []; let total = 0; let bad = false;
      rows.forEach(row => {
        const opt = row.querySelector('.inv-med').selectedOptions[0];
        const med = Store.get('medicines', opt.value);
        const qty = +row.querySelector('.inv-qty').value || 0;
        if (qty < 1 || qty > med.stock) { bad = true; return; }
        items.push({ medId: med.id, name: med.name, qty, price: med.price });
        total += qty * med.price;
      });
      if (bad) return App.toast('كمية غير صالحة — تحقق من المخزون');
      items.forEach(it => Store.update('medicines', it.medId, { stock: Store.get('medicines', it.medId).stock - it.qty }));
      Store.add('invoices', { patientId: new FormData(e.target).get('patientId'), items, total, date: Store.todayStr(), paid: true });
      App.closeModal(); App.toast('تم إصدار الفاتورة وخصم المخزون ✓'); Pharmacy.renderInvoices();
    });
  },

  printInvoice(id) {
    const inv = Store.get('invoices', id);
    const s = Store.db.settings;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>فاتورة ${inv.id}</title>
      <style>body{font-family:'Segoe UI',Tahoma,sans-serif;padding:40px;color:#111;max-width:640px;margin:0 auto}
      h1{color:#0f766e;margin-bottom:2px}table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{padding:9px 12px;text-align:right;border-bottom:1px solid #ddd;font-size:14px}
      th{background:#f1f5f9}.tot{font-size:18px;font-weight:700;display:flex;justify-content:space-between;margin-top:18px;color:#0f766e}
      .meta{color:#555;font-size:13px;line-height:1.8;border:1px dashed #ccc;padding:12px 16px;margin-top:16px;border-radius:8px}</style></head><body>
      <h1>${s.clinicName}</h1>
      <div style="color:#777;font-size:13px">فاتورة مبيعات صيدلية</div>
      <div class="meta">رقم الفاتورة: <b>${inv.id.slice(-6).toUpperCase()}</b> — التاريخ: <b>${Store.fmtDate(inv.date)}</b><br>المريض: <b>${Store.patientName(inv.patientId)}</b></div>
      <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>
      ${inv.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.price}</td><td>${(i.qty * i.price).toLocaleString('ar-EG')} ج.م</td></tr>`).join('')}
      </tbody></table>
      <div class="tot"><span>الإجمالي المستحق</span><span>${inv.total.toLocaleString('ar-EG')} ج.م</span></div>
      <p style="margin-top:40px;color:#888;font-size:12px">شكراً لثقتكم — ${s.clinicName}</p>
      <script>print()<\/script></body></html>`);
    w.document.close();
  },

  delInvoice(id) {
    App.confirm('سيتم حذف الفاتورة (بدون إرجاع المخزون). هل أنت متأكد؟', () => {
      Store.remove('invoices', id); App.toast('تم حذف الفاتورة'); Pharmacy.renderInvoices();
    });
  }
};
