// =========================
// Export Page Logic
// =========================
let selectedBundles = new Set();
let currentBundles = [];
let pendingDeleteIds = [];

// Check authentication
(async () => {
  const user = await auth.getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('usernameDisplay').textContent = auth.getUsername(user);
  await loadBundles();
})();

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await auth.signOut();
});

// =========================
// Load Bundles
// =========================
async function loadBundles() {
  const user = await auth.getCurrentUser();
  if (!user) return;

  try {
    const { data, error } = await supabaseClient
      .from('app_1583311cb5_bundles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_date', { ascending: false });

    if (error) throw error;

    currentBundles = data || [];
    const bundlesList = document.getElementById('bundlesList');
    const noDataMessage = document.getElementById('noDataMessage');
    const bundlesContainer = document.getElementById('bundlesContainer');

    if (currentBundles.length === 0) {
      bundlesContainer.classList.add('hidden');
      noDataMessage.classList.remove('hidden');
      return;
    }

    bundlesContainer.classList.remove('hidden');
    noDataMessage.classList.add('hidden');

    bundlesList.innerHTML = currentBundles
      .map(
        (bundle, index) => `
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
                  <h4 class="font-semibold text-gray-900 text-lg">${bundle.bundle_name}</h4>
                  <p class="text-sm text-gray-500">Co-purchase ${bundle.co_purchase_percentage}%</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">Total Price</p>
                <p class="text-2xl font-bold text-gray-900">RM${bundle.total_price.toFixed(2)}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              ${bundle.items
                .map(
                  (product) => `
                <div class="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                  <h5 class="font-medium text-gray-900 mb-3">${product.product}</h5>
                  <div class="flex flex-wrap gap-2">
                    <span class="category-badge bg-blue-100 text-blue-700 border border-blue-200">
                      ${product.category}
                    </span>
                    <span class="category-badge bg-green-100 text-green-700 border border-green-200">
                      RM${product.price.toFixed(2)}
                    </span>
                  </div>
                </div>`
                )
                .join('')}
            </div>

            <div class="flex gap-3 justify-end">
              <button onclick="exportSingleBundle('${bundle.id}')" 
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export CSV</button>
              <button onclick="openDeleteModal(['${bundle.id}'])" 
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      </div>`
      )
      .join('');
  } catch (error) {
    console.error('Error loading bundles:', error);
    utils.showToast('Failed to load bundles', 'error');
  }
}

// =========================
// Selection
// =========================
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
  document.getElementById('deleteBtn').disabled = selectedBundles.size === 0;
}

// =========================
// Select All
// =========================
document.getElementById('selectAllBtn').addEventListener('click', () => {
  const allSelected = selectedBundles.size === currentBundles.length;

  currentBundles.forEach((bundle) => {
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
  document.getElementById('deleteBtn').disabled = selectedBundles.size === 0;
});

// =========================
// Export Selected
// =========================
document.getElementById('exportBtn').addEventListener('click', () => {
  const selected = currentBundles.filter((b) => selectedBundles.has(b.id));
  if (selected.length === 0) {
    utils.showToast('No bundles selected for export', 'error');
    return;
  }
  exportCSV(selected);
});

// =========================
// Delete Logic (Final Fixed)
// =========================

function openDeleteModal(ids) {
  if (!ids || ids.length === 0) {
    utils.showToast('No bundles selected to delete', 'error');
    return;
  }

  pendingDeleteIds = ids;

  // Update message dynamically
  const messageEl = document.getElementById('confirmMessage');
  if (messageEl) {
    if (ids.length === 1) {
      const bundle = currentBundles.find(b => b.id === ids[0]);
      messageEl.textContent = `Are you sure you want to delete "${bundle?.bundle_name || 'this bundle'}"?`;
    } else {
      messageEl.textContent = `Are you sure you want to delete ${ids.length} selected bundles?`;
    }
  }

  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const cancelBtn = document.getElementById('cancelDelete');
  const confirmBtn = document.getElementById('confirmDelete');
  const deleteBtn = document.getElementById('deleteBtn'); // <-- Bulk Delete button

  // Cancel Delete
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const modal = document.getElementById('confirmModal');
      if (modal) modal.classList.add('hidden');
      pendingDeleteIds = [];
    });
  }

  // Confirm Delete
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!pendingDeleteIds || pendingDeleteIds.length === 0) return;

      try {
        const { error } = await supabaseClient
          .from('app_1583311cb5_bundles')
          .delete()
          .in('id', pendingDeleteIds);

        if (error) throw error;

        utils.showToast(
          pendingDeleteIds.length === 1
            ? 'Bundle deleted successfully!'
            : `${pendingDeleteIds.length} bundles deleted successfully!`,
          'success'
        );

        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.add('hidden');

        pendingDeleteIds = [];
        selectedBundles.clear();
        await loadBundles();
      } catch (error) {
        console.error('Delete error:', error);
        utils.showToast('Failed to delete bundles', 'error');
      }
    });
  }

  // Bulk Delete (Delete Selected)
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (selectedBundles.size === 0) {
        utils.showToast('No bundles selected to delete', 'error');
        return;
      }
      openDeleteModal([...selectedBundles]);
    });
  }
});

// =========================
// Export One
// =========================
function exportSingleBundle(bundleId) {
  const bundle = currentBundles.find((b) => b.id === bundleId);
  if (!bundle) return;
  exportCSV([bundle]);
}

// =========================
// Export CSV
// =========================
function exportCSV(bundles) {
  const rows = [
    ['Bundle Name', 'Products', 'Categories', 'Prices (RM)', 'Co-Purchase (%)', 'Total Price (RM)'],
  ];

  bundles.forEach((bundle) => {
    const products = bundle.items.map((p) => p.product).join('; ');
    const categories = bundle.items.map((p) => p.category).join('; ');
    const prices = bundle.items.map((p) => p.price.toFixed(2)).join('; ');

    rows.push([
      bundle.bundle_name,
      `"${products}"`,
      `"${categories}"`,
      `"${prices}"`,
      bundle.co_purchase_percentage,
      bundle.total_price.toFixed(2),
    ]);
  });

  const csv = rows.map((row) => row.join(',')).join('\n');
  downloadFile(csv, 'bundles.csv', 'text/csv');
  utils.showToast('CSV exported successfully!', 'success');
}

// =========================
// File Download
// =========================
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
