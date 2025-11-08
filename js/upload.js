// Upload page logic
let pendingFile = null;
let csvHeaders = [];
let reportToDelete = null;

// Check authentication
(async () => {
  const user = await auth.getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('usernameDisplay').textContent = auth.getUsername(user);
  loadReports();
})();

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await auth.signOut();
});

// File selection
document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    csvHeaders = headers;
    pendingFile = file;
    
    document.getElementById('fileName').textContent = file.name;
    
    // Populate mapping dropdowns
    const selects = ['mapReceiptId', 'mapProduct', 'mapCategory', 'mapQuantity', 'mapPrice', 'mapDate'];
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      select.innerHTML = '<option value="">Select column...</option>' +
        headers.map(h => `<option value="${h}">${h}</option>`).join('');
    });
    
    // Show mapping modal
    document.getElementById('mappingModal').classList.remove('hidden');
  } catch (error) {
    utils.showToast('Failed to read file', 'error');
  }
  
  e.target.value = '';
});

// Cancel mapping
document.getElementById('cancelMapping').addEventListener('click', () => {
  document.getElementById('mappingModal').classList.add('hidden');
  pendingFile = null;
  csvHeaders = [];
  document.getElementById('fileName').textContent = '';
});

// Confirm upload
document.getElementById('confirmUpload').addEventListener('click', async () => {
  if (!pendingFile) return;

  const user = await auth.getCurrentUser();
  if (!user) {
    utils.showToast('Please login to upload files', 'error');
    return;
  }

  // Get column mapping
  const columnMapping = {
    receiptId: document.getElementById('mapReceiptId').value,
    product: document.getElementById('mapProduct').value,
    category: document.getElementById('mapCategory').value,
    quantity: document.getElementById('mapQuantity').value,
    price: document.getElementById('mapPrice').value,
    date: document.getElementById('mapDate').value
  };

  // Validate mapping
  if (!columnMapping.receiptId || !columnMapping.product || !columnMapping.category || 
      !columnMapping.quantity || !columnMapping.price) {
    utils.showToast('Please map all required columns', 'error');
    return;
  }

  const confirmBtn = document.getElementById('confirmUpload');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Uploading...';

  try {
    const text = await pendingFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const getIndex = (mapping) => headers.findIndex(h => h === mapping);
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 5) {
        data.push({
          receiptId: values[getIndex(columnMapping.receiptId)] || '',
          product: values[getIndex(columnMapping.product)] || '',
          category: values[getIndex(columnMapping.category)] || '',
          quantity: parseInt(values[getIndex(columnMapping.quantity)]) || 0,
          price: parseFloat(values[getIndex(columnMapping.price)]) || 0,
          date: values[getIndex(columnMapping.date)] || new Date().toISOString().split('T')[0]
        });
      }
    }

    const newReport = {
      id: Date.now().toString(),
      user_id: user.id,
      file_name: pendingFile.name,
      upload_date: new Date().toISOString(),
      data,
      created_at: new Date().toISOString()
    };

    // Save to Supabase
    await saveReportToSupabase(newReport);
    
    utils.showToast('Sales report uploaded successfully!', 'success');
    document.getElementById('mappingModal').classList.add('hidden');
    document.getElementById('fileName').textContent = '';
    pendingFile = null;
    csvHeaders = [];
    
    await loadReports();
  } catch (error) {
    console.error('Upload error:', error);
    utils.showToast('Failed to upload file. Please try again.', 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<span class="text-lg mr-2">📤</span>Upload';
  }
});

// Delete report handlers
document.getElementById('cancelDelete').addEventListener('click', () => {
  document.getElementById('deleteModal').classList.add('hidden');
  reportToDelete = null;
});

document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!reportToDelete) return;

  try {
    await deleteReportFromSupabase(reportToDelete.id);
    utils.showToast('Report deleted successfully', 'success');
    document.getElementById('deleteModal').classList.add('hidden');
    reportToDelete = null;
    await loadReports();
  } catch (error) {
    console.error('Delete error:', error);
    utils.showToast('Failed to delete report', 'error');
  }
});

// Load reports from Supabase
async function loadReports() {
  const user = await auth.getCurrentUser();
  if (!user) return;

  try {
    const reports = await getReportsFromSupabase(user.id);
    displayReports(reports);
  } catch (error) {
    console.error('Error loading reports:', error);
    utils.showToast('Failed to load reports', 'error');
  }
}

// Display reports
function displayReports(reports) {
  const reportsList = document.getElementById('reportsList');

  if (reports.length === 0) {
    reportsList.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <div class="text-6xl mb-4">📊</div>
        <p class="font-semibold text-lg">No reports uploaded yet</p>
        <p class="text-sm">Upload a CSV file to get started</p>
      </div>
    `;
    return;
  }

  reportsList.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b-2 border-purple-300">
            <th class="text-left py-3 px-4 font-bold text-purple-900">File Name</th>
            <th class="text-left py-3 px-4 font-bold text-purple-900">Upload Date</th>
            <th class="text-left py-3 px-4 font-bold text-purple-900">Receipts</th>
            <th class="text-left py-3 px-4 font-bold text-purple-900">Products</th>
            <th class="text-left py-3 px-4 font-bold text-purple-900">Categories</th>
            <th class="text-right py-3 px-4 font-bold text-purple-900">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${reports.map(report => `
            <tr class="border-b border-purple-200 hover:bg-purple-100 transition-colors">
              <td class="py-3 px-4 font-medium">${report.file_name}</td>
              <td class="py-3 px-4">${utils.formatDate(report.upload_date)}</td>
              <td class="py-3 px-4">
                <span class="badge bg-blue-100 text-blue-700 border border-blue-200">
                  <span class="text-sm mr-1">📦</span>
                  ${new Set(report.data.map(d => d.receiptId)).size}
                </span>
              </td>
              <td class="py-3 px-4">
                <span class="badge bg-green-100 text-green-700 border border-green-200">
                  ${new Set(report.data.map(d => d.product)).size}
                </span>
              </td>
              <td class="py-3 px-4">
                <span class="badge bg-orange-100 text-orange-700 border border-orange-200">
                  ${new Set(report.data.map(d => d.category)).size}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex justify-end gap-2">
                  <button onclick="downloadReport('${report.id}')" class="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                    <span class="text-xl">⬇️</span>
                  </button>
                  <button onclick="deleteReport('${report.id}', '${report.file_name}')" class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                    <span class="text-xl">🗑️</span>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Download report
window.downloadReport = async function(reportId) {
  const user = await auth.getCurrentUser();
  if (!user) return;

  try {
    const reports = await getReportsFromSupabase(user.id);
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Convert data back to CSV
    const headers = ['Receipt ID', 'Product', 'Category', 'Quantity', 'Price', 'Date'];
    const csvContent = [
      headers.join(','),
      ...report.data.map(item => 
        [item.receiptId, item.product, item.category, item.quantity, item.price, item.date].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = report.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    utils.showToast(`Downloaded ${report.file_name}`, 'success');
  } catch (error) {
    console.error('Download error:', error);
    utils.showToast('Failed to download report', 'error');
  }
};

// Delete report
window.deleteReport = function(reportId, fileName) {
  reportToDelete = { id: reportId, name: fileName };
  document.getElementById('deleteReportName').textContent = `"${fileName}"`;
  document.getElementById('deleteModal').classList.remove('hidden');
};

// Supabase storage functions
async function saveReportToSupabase(report) {
  const { data, error } = await supabaseClient
    .from('app_1583311cb5_sales_reports')
    .insert([report]);
  
  if (error) throw error;
  return data;
}

async function getReportsFromSupabase(userId) {
  const { data, error } = await supabaseClient
    .from('app_1583311cb5_sales_reports')
    .select('*')
    .eq('user_id', userId)
    .order('upload_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function deleteReportFromSupabase(reportId) {
  const { error } = await supabaseClient
    .from('app_1583311cb5_sales_reports')
    .delete()
    .eq('id', reportId);
  
  if (error) throw error;
}