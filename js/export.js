// Export page logic
let selectedBundles = new Set();

// Check authentication
(async () => {
  const user = await auth.getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('usernameDisplay').textContent = auth.getUsername(user);
  loadBundles();
})();

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await auth.signOut();
});

function loadBundles() {
  const bundles = JSON.parse(localStorage.getItem('bundles') || '[]');
  const bundlesList = document.getElementById('bundlesList');
  const noDataMessage = document.getElementById('noDataMessage');
  const bundlesContainer = document.getElementById('bundlesContainer');

  if (bundles.length === 0) {
    bundlesContainer.classList.add('hidden');
    noDataMessage.classList.remove('hidden');
    return;
  }

  bundlesContainer.classList.remove('hidden');
  noDataMessage.classList.add('hidden');

  bundlesList.innerHTML = bundles.map((bundle, index) => `
    <div class="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 transition-all" id="bundle-${bundle.id}">
      <div class="flex items-start gap-4">
        <input 
          type="checkbox" 
          id="check-${bundle.id}" 
          class="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          onchange="toggleBundle('${bundle.id}')"
        >
        <div class="flex-1">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="number-badge bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                ${index + 1}
              </div>
              <div>
                <h4 class="font-semibold text-gray-900 text-lg">${bundle.name}</h4>
                <p class="text-sm text-gray-500">Co-purchased ${bundle.frequency} times</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Total Price</p>
              <p class="text-2xl font-bold text-gray-900">$${bundle.totalPrice}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${bundle.products.map(product => `
              <div class="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                <h5 class="font-medium text-gray-900 mb-3">${product.name}</h5>
                <div class="flex flex-wrap gap-2">
                  <span class="category-badge bg-blue-100 text-blue-700 border border-blue-200">
                    ${product.category}
                  </span>
                  <span class="category-badge bg-green-100 text-green-700 border border-green-200">
                    $${product.price.toFixed(2)}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleBundle(bundleId) {
  const checkbox = document.getElementById(`check-${bundleId}`);
  const bundleEl = document.getElementById(`bundle-${bundleId}`);
  
  if (checkbox.checked) {
    selectedBundles.add(bundleId);
    bundleEl.classList.add('border-blue-500', 'bg-blue-50');
    bundleEl.classList.remove('border-gray-200');
  } else {
    selectedBundles.delete(bundleId);
    bundleEl.classList.remove('border-blue-500', 'bg-blue-50');
    bundleEl.classList.add('border-gray-200');
  }
  
  document.getElementById('exportBtn').disabled = selectedBundles.size === 0;
}

document.getElementById('selectAllBtn').addEventListener('click', () => {
  const bundles = JSON.parse(localStorage.getItem('bundles') || '[]');
  const allSelected = selectedBundles.size === bundles.length;
  
  bundles.forEach(bundle => {
    const checkbox = document.getElementById(`check-${bundle.id}`);
    const bundleEl = document.getElementById(`bundle-${bundle.id}`);
    
    if (allSelected) {
      checkbox.checked = false;
      selectedBundles.delete(bundle.id);
      bundleEl.classList.remove('border-blue-500', 'bg-blue-50');
      bundleEl.classList.add('border-gray-200');
    } else {
      checkbox.checked = true;
      selectedBundles.add(bundle.id);
      bundleEl.classList.add('border-blue-500', 'bg-blue-50');
      bundleEl.classList.remove('border-gray-200');
    }
  });
  
  document.getElementById('selectAllBtn').textContent = allSelected ? 'Select All' : 'Deselect All';
  document.getElementById('exportBtn').disabled = selectedBundles.size === 0;
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const format = prompt('Export format? Enter "csv" or "json":', 'csv');
  if (!format || !['csv', 'json'].includes(format.toLowerCase())) {
    utils.showToast('Invalid format. Use "csv" or "json"', 'error');
    return;
  }

  const bundles = JSON.parse(localStorage.getItem('bundles') || '[]');
  const selected = bundles.filter(b => selectedBundles.has(b.id));

  if (format.toLowerCase() === 'csv') {
    exportCSV(selected);
  } else {
    exportJSON(selected);
  }
});

function exportCSV(bundles) {
  const rows = [['Bundle ID', 'Bundle Name', 'Product 1', 'Product 2', 'Frequency', 'Total Price']];
  
  bundles.forEach(bundle => {
    rows.push([
      bundle.id,
      bundle.name,
      bundle.products[0]?.name || '',
      bundle.products[1]?.name || '',
      bundle.frequency,
      bundle.totalPrice
    ]);
  });

  const csv = rows.map(row => row.join(',')).join('\n');
  downloadFile(csv, 'bundles.csv', 'text/csv');
  utils.showToast('CSV exported successfully!', 'success');
}

function exportJSON(bundles) {
  const json = JSON.stringify(bundles, null, 2);
  downloadFile(json, 'bundles.json', 'application/json');
  utils.showToast('JSON exported successfully!', 'success');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}