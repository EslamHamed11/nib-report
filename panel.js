(function() {
  const container = document.getElementById('nib-time-panel');
  if (!container) return;

  container.innerHTML = `
    <style>
      #nib-panel {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 12px;
        direction: rtl;
      }
      #nib-panel h3 {
        font-size: 13px;
        font-weight: 700;
        color: #172B4D;
        margin-bottom: 10px;
        border-bottom: 2px solid #0ea5e9;
        padding-bottom: 6px;
      }
      #nib-panel table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        direction: rtl;
      }
      #nib-panel th {
        background: #F4F5F7;
        padding: 6px 8px;
        text-align: right;
        color: #5E6C84;
        font-weight: 600;
        border: 1px solid #DFE1E6;
      }
      #nib-panel td {
        padding: 6px 8px;
        border: 1px solid #DFE1E6;
        text-align: right;
      }
      #nib-panel tr:hover td { background: #F4F5F7; }
      .time-high { color: #ef4444; font-weight: 700; }
      .time-medium { color: #f59e0b; font-weight: 700; }
      .time-low { color: #10b981; font-weight: 700; }
      .ticket-link { color: #0052CC; font-weight: 600; text-decoration: none; }
      .ticket-link:hover { text-decoration: underline; }
      .status-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        background: #DFE1E6;
        color: #172B4D;
      }
      #nib-refresh {
        font-size: 11px;
        color: #0052CC;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        margin-right: 8px;
        font-family: inherit;
      }
      #nib-refresh:hover { text-decoration: underline; }
      #nib-last-updated {
        font-size: 10px;
        color: #5E6C84;
      }
      #nib-loading { color: #5E6C84; font-size: 12px; padding: 8px 0; }
      #nib-error { color: #ef4444; font-size: 12px; padding: 8px 0; }
    </style>
    <div id="nib-panel">
      <h3>
        مؤشر الأداء الزمني
        <button id="nib-refresh" onclick="nibLoadData()">↻ تحديث</button>
        <span id="nib-last-updated"></span>
      </h3>
      <div id="nib-content"><div id="nib-loading">جارٍ التحميل...</div></div>
    </div>
  `;

  window.nibLoadData = async function() {
    const content = document.getElementById('nib-content');
    content.innerHTML = '<div id="nib-loading">جارٍ التحميل...</div>';

    try {
      const resp = await fetch('/rest/api/3/search/jql?jql=project%20%3D%20%27NIB%2060%27&maxResults=100&expand=changelog&fields=summary,status,created', {
        headers: { 'Accept': 'application/json' }
      });

      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = await resp.json();

      const now = Date.now();
      const issues = data.issues.map(issue => {
        let lastChange = new Date(issue.fields.created).getTime();
        (issue.changelog?.histories || []).forEach(h => {
          h.items.forEach(item => {
            if (item.field === 'status') {
              const t = new Date(h.created).getTime();
              if (t > lastChange) lastChange = t;
            }
          });
        });
        const diff = now - lastChange;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return { key: issue.key, summary: issue.fields.summary, status: issue.fields.status.name, days, hours, minutes };
      }).sort((a, b) => b.days - a.days || b.hours - a.hours);

      const rows = issues.map(i => {
        const tc = i.days >= 30 ? 'time-high' : i.days >= 7 ? 'time-medium' : 'time-low';
        return `<tr>
          <td><a class="ticket-link" href="/browse/${i.key}" target="_blank">${i.key}</a></td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.summary}">${i.summary}</td>
          <td><span class="status-badge">${i.status}</span></td>
          <td class="${tc}">${i.days}d ${i.hours}h ${i.minutes}m</td>
        </tr>`;
      }).join('');

      content.innerHTML = `
        <table>
          <thead><tr><th>التذكرة</th><th>الموضوع</th><th>الحالة</th><th>مدة الانتظار</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;

      const now2 = new Date();
      document.getElementById('nib-last-updated').textContent =
        `آخر تحديث: ${now2.toLocaleTimeString('ar-EG')}`;

    } catch (err) {
      content.innerHTML = `<div id="nib-error">⚠ ${err.message}</div>`;
    }
  };

  nibLoadData();
})();