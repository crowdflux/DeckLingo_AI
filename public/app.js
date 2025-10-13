const form = document.getElementById('form');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Uploading & translating…';
  const fd = new FormData(form);

  try {
    const resp = await fetch('/api/translate', { method: 'POST', body: fd });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || resp.statusText);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // **New code to get filename from response header**
    let fileName = 'translated.pptx';
    const cd = resp.headers.get('content-disposition');
    if (cd) {
      const match = cd.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        fileName = match[1];
      }
    }
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    statusEl.textContent = `Done! Downloaded ${fileName}.`;
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    alert('Error: ' + err.message);
  }
});
