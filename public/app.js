const form = document.getElementById('form');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Uploading & translating…';
  const fd = new FormData(form);

  try {
    const resp = await fetch('/api/translate', { method: 'POST', body: fd });
    if (!resp.ok) {
      const err = await resp.json().catch(()=>({}));
      throw new Error(err.error || resp.statusText);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'translated.pptx';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    statusEl.textContent = 'Done! Downloaded translated.pptx.';
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    alert('Error: ' + err.message);
  }
});
