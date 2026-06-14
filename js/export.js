// js/export.js

function exportProgress() {
  const progress = loadProgress();
  const dataStr = JSON.stringify(progress, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meowvocab-progress-' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ 已导出进度文件');
}

function importProgress(fileInputEl) {
  const file = fileInputEl.files[0];
  if (!file) {
    showToast('⚠️ 请先选择文件');
    return;
  }
  if (!file.name.endsWith('.json')) {
    showToast('❌ 文件格式无效，请选择 .json 文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.words || typeof data.words !== 'object') {
        throw new Error('Invalid structure');
      }
      const wordCount = Object.keys(data.words).length;
      if (wordCount === 0) {
        throw new Error('Empty word data');
      }
      const success = saveProgress(data);
      if (success) {
        showToast('📥 已恢复 ' + wordCount + ' 个单词的进度');
        setTimeout(function() { location.reload(); }, 1500);
      } else {
        showToast('❌ 保存失败，请检查存储空间');
      }
    } catch (err) {
      console.error('Import error:', err);
      showToast('❌ 数据格式不兼容，无法导入');
    }
  };
  reader.readAsText(file);
}

function showToast(message) {
  const existing = document.querySelector('.meow-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'meow-toast';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#C4203B;color:#FFF;padding:12px 24px;border-radius:16px;font-size:14px;font-weight:600;z-index:9999;animation:toastIn 0.3s ease-out;box-shadow:0 4px 16px rgba(196,32,59,0.3);';
  document.body.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

function triggerImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function() { importProgress(input); };
  input.click();
}
