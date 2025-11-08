// Bundles page logic
let allReports = [];
let selectedReports = [];
let categoryConfigs = [];
let generatedBundles = [];
let selectedBundles = [];
let minCoPurchasePercentage = 0;

// Check authentication
(async () => {
  const user = await auth.getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('usernameDisplay').textContent = auth.getUsername(user);
  await loadReports();
})();

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await auth.signOut();
});

// Load reports from Supabase
async function loadReports() {
  const user = await auth.getCurrentUser();
  if (!user) return;

  try {
    const { data, error } = await supabaseClient
      .from('app_1583311cb5_sales_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('upload_date', { ascending: false });
    
    if (error) throw error;
    allReports = data || [];
    displayCatalog();
  } catch (error) {
    console.error('Error loading reports:', error);
    utils.showToast('Failed to load reports', 'error');
  }
}

// Display data catalog
function displayCatalog() {
  const catalogList = document.getElementById('catalogList');

  if (allReports.length === 0) {
    catalogList.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <div class="text-6xl mb-4">📊</div>
        <p class="font-semibold text-lg">No reports uploaded yet</p>
        <p class="text-sm">Upload data files first to generate bundles</p>
        <a href="upload.html" class="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Upload Data
        </a>
      </div>
    `;
    return;
  }

  catalogList.innerHTML = `
    ${allReports.map(report => `
      <div class="flex flex-col p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors bg-white">
        <!-- Top row: checkbox + file name/date -->
        <div class="flex items-start gap-4">
          <input 
            type="checkbox" 
            id="report-${report.id}"
            class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
            onchange="toggleReportSelection('${report.id}')"
          >
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900">${report.file_name}</h4>
            <p class="text-sm text-gray-500">${utils.formatDate(report.upload_date)}</p>
          </div>
        </div>

        <!-- Second row: small boxes -->
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="badge bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0 px-2 py-1 text-xs rounded">
            ${new Set(report.data.map(d => d.receiptId)).size} receipts
          </span>
          <span class="badge bg-green-100 text-green-700 border border-green-200 flex-shrink-0 px-2 py-1 text-xs rounded">
            ${new Set(report.data.map(d => d.product)).size} products
          </span>
          <span class="badge bg-orange-100 text-orange-700 border border-orange-200 flex-shrink-0 px-2 py-1 text-xs rounded">
            ${new Set(report.data.map(d => d.category)).size} categories
          </span>
        </div>
      </div>
    `).join('')}
  `;
}

// Toggle report selection
window.toggleReportSelection = function(reportId) {
  const checkbox = document.getElementById(`report-${reportId}`);
  if (checkbox.checked) {
    selectedReports.push(reportId);
  } else {
    selectedReports = selectedReports.filter(id => id !== reportId);
  }
  updateUI();
};

// Update UI based on selection
function updateUI() {
  const noSelectionWarning = document.getElementById('noSelectionWarning');
  const configSection = document.getElementById('configSection');

  if (selectedReports.length === 0) {
    noSelectionWarning.classList.remove('hidden');
    configSection.classList.add('hidden');
  } else {
    noSelectionWarning.classList.add('hidden');
    configSection.classList.remove('hidden');
    updateCategoryConfig();
  }
}

// Get categories from selected reports
function getSelectedCategories() {
  const reports = allReports.filter(r => selectedReports.includes(r.id));
  const categories = new Set();
  reports.forEach(report => {
    report.data.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
  });
  return Array.from(categories).sort();
}

// Update category configuration
function updateCategoryConfig() {
  const categories = getSelectedCategories();
  const categoryConfig = document.getElementById('categoryConfig');

  if (categories.length === 0) {
    categoryConfig.innerHTML = `
      <div class="col-span-2 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
        <p class="text-sm text-yellow-800">
          No categories found in selected datasets. Please check your data.
        </p>
      </div>
    `;
    return;
  }

  // Initialize category configs if needed
  if (categoryConfigs.length === 0) {
    categoryConfigs = categories.map(cat => ({
      category: cat,
      productCount: 1
    }));
  }

  categoryConfig.innerHTML = categories.map((category, index) => {
    const config = categoryConfigs.find(c => c.category === category) || { productCount: 1 };
    return `
      <div class="p-4 border-2 border-purple-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-lg text-purple-900">${category}</h4>
          <div class="flex items-center gap-2">
            <label class="text-sm text-gray-600">Products:</label>
            <input
              type="number"
              min="0"
              max="10"
              value="${config.productCount}"
              onchange="updateCategoryProductCount('${category}', this.value)"
              class="w-20 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update category product count
window.updateCategoryProductCount = function(category, value) {
  const config = categoryConfigs.find(c => c.category === category);
  if (config) {
    config.productCount = parseInt(value) || 0;
  }
};

// Slider and input sync
document.getElementById('minPercentageSlider').addEventListener('input', (e) => {
  minCoPurchasePercentage = parseInt(e.target.value);
  document.getElementById('minPercentageInput').value = minCoPurchasePercentage;
});

document.getElementById('minPercentageInput').addEventListener('input', (e) => {
  minCoPurchasePercentage = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
  document.getElementById('minPercentageSlider').value = minCoPurchasePercentage;
  e.target.value = minCoPurchasePercentage;
});

// Generate bundles
document.getElementById('generateBtn').addEventListener('click', () => {
  if (selectedReports.length === 0) {
    utils.showToast('Please select at least one dataset from the catalog', 'error');
    return;
  }

  const reports = allReports.filter(r => selectedReports.includes(r.id));

  // Group products by receipt
  const receiptMap = new Map();
  const productInfo = new Map();
  
  reports.forEach(report => {
    report.data.forEach(item => {
      if (!receiptMap.has(item.receiptId)) {
        receiptMap.set(item.receiptId, new Set());
      }
      receiptMap.get(item.receiptId).add(item.product);
      
      if (!productInfo.has(item.product)) {
        productInfo.set(item.product, {
          category: item.category,
          price: item.price
        });
      }
    });
  });

  const totalReceipts = receiptMap.size;
  
  // Get products by category
  const categoryProducts = new Map();
  productInfo.forEach((info, product) => {
    if (!categoryProducts.has(info.category)) {
      categoryProducts.set(info.category, []);
    }
    categoryProducts.get(info.category).push(product);
  });

  // Generate all possible product combinations
  const generateCombinations = (configs) => {
    const results = [];
    
    const backtrack = (index, current) => {
      if (index === configs.length) {
        if (current.length > 0) {
          results.push([...current]);
        }
        return;
      }
      
      const config = configs[index];
      const products = categoryProducts.get(config.category) || [];
      
      if (config.productCount === 0) {
        backtrack(index + 1, current);
        return;
      }
      
      const combine = (start, selected) => {
        if (selected.length === config.productCount) {
          backtrack(index + 1, [...current, ...selected]);
          return;
        }
        
        for (let i = start; i < products.length; i++) {
          combine(i + 1, [...selected, products[i]]);
        }
      };
      
      combine(0, []);
    };
    
    backtrack(0, []);
    return results;
  };

  const combinations = generateCombinations(categoryConfigs);
  
  // Calculate co-purchase percentage for each combination
  const bundleStats = [];
  
  combinations.forEach(combo => {
    let supportCount = 0;
    
    receiptMap.forEach(receiptProducts => {
      const hasAll = combo.every(product => receiptProducts.has(product));
      if (hasAll) {
        supportCount++;
      }
    });
    
    const percentage = (supportCount / totalReceipts) * 100;
    
    if (supportCount > 0 && percentage >= minCoPurchasePercentage) {
      const items = combo.map(product => {
        const info = productInfo.get(product);
        return {
          product,
          category: info.category,
          price: info.price
        };
      });
      
      const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
      
      bundleStats.push({
        items,
        totalPrice,
        coPurchasePercentage: Math.round(percentage * 100) / 100,
        supportCount
      });
    }
  });

  bundleStats.sort((a, b) => b.coPurchasePercentage - a.coPurchasePercentage);
  
  generatedBundles = bundleStats;
  selectedBundles = [];
  
  if (bundleStats.length === 0) {
    utils.showToast('No bundles found with the current configuration. Try adjusting the product counts or lowering the co-purchase threshold.', 'error');
    document.getElementById('bundlesSection').classList.add('hidden');
  } else {
    utils.showToast(`Generated ${bundleStats.length} bundle(s) from ${selectedReports.length} dataset(s)!`, 'success');
    displayBundles();
    document.getElementById('bundlesSection').classList.remove('hidden');
  }
});

// Display generated bundles
function displayBundles() {
  const bundlesList = document.getElementById('bundlesList');

  bundlesList.innerHTML = generatedBundles.map((bundle, index) => `
    <div class="border-2 border-green-300 rounded-lg p-5 bg-white shadow-md hover:shadow-lg transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-start gap-3 flex-1">
          <input 
            type="checkbox" 
            id="bundle-${index}"
            class="w-5 h-5 mt-1 text-green-600 rounded focus:ring-2 focus:ring-green-500"
            onchange="toggleBundleSelection(${index})"
          >
          <div class="flex-1">
            <label for="bundle-${index}" class="cursor-pointer">
              <h3 class="text-xl font-bold text-green-900">Bundle ${index + 1}</h3>
            </label>
            <div class="flex items-center gap-3 mt-3 flex-wrap">
              <span class="badge bg-blue-100 text-blue-700 border border-blue-200">
                <span class="text-sm mr-1">📊</span>
                ${bundle.supportCount} receipts
              </span>
              <span class="badge bg-purple-100 text-purple-700 border border-purple-200">
                ${bundle.coPurchasePercentage}% co-purchase rate
              </span>
              <span class="badge bg-green-100 text-green-700 border border-green-200">
                RM${bundle.totalPrice.toFixed(2)} total
              </span>
            </div>
          </div>
        </div>
        <button 
          onclick="saveBundle(${index})"
          class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all"
        >
          <span class="text-lg mr-1">📦</span>
          Save Bundle
        </button>
      </div>
      
      <div class="overflow-x-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
        <table class="w-full">
          <thead>
            <tr class="border-b-2 border-gray-300">
              <th class="text-left py-2 px-3 font-bold text-gray-900">Product</th>
              <th class="text-left py-2 px-3 font-bold text-gray-900">Category</th>
              <th class="text-left py-2 px-3 font-bold text-gray-900">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            ${bundle.items.map(item => `
              <tr class="border-b border-gray-200 hover:bg-white transition-colors">
                <td class="py-2 px-3 font-medium">${item.product}</td>
                <td class="py-2 px-3">
                  <span class="badge-sm bg-gray-100 text-gray-700 border border-gray-300">
                    ${item.category}
                  </span>
                </td>
                <td class="py-2 px-3 font-semibold text-green-600">RM${item.price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');

  updateSelectedCount();
}

// Toggle bundle selection
window.toggleBundleSelection = function(index) {
  const checkbox = document.getElementById(`bundle-${index}`);
  if (checkbox.checked) {
    selectedBundles.push(index);
  } else {
    selectedBundles = selectedBundles.filter(i => i !== index);
  }
  updateSelectedCount();
};

// Select all bundles
document.getElementById('selectAllBundles').addEventListener('change', (e) => {
  if (e.target.checked) {
    selectedBundles = generatedBundles.map((_, index) => index);
    generatedBundles.forEach((_, index) => {
      const checkbox = document.getElementById(`bundle-${index}`);
      if (checkbox) checkbox.checked = true;
    });
  } else {
    selectedBundles = [];
    generatedBundles.forEach((_, index) => {
      const checkbox = document.getElementById(`bundle-${index}`);
      if (checkbox) checkbox.checked = false;
    });
  }
  updateSelectedCount();
});

// Update selected count
function updateSelectedCount() {
  document.getElementById('selectedCount').textContent = selectedBundles.length;
  const saveBtn = document.getElementById('saveSelectedBtn');
  saveBtn.disabled = selectedBundles.length === 0;
}

// Save single bundle
window.saveBundle = async function(bundleIndex) {
  const user = await auth.getCurrentUser();
  if (!user) return;

  const bundle = generatedBundles[bundleIndex];
  if (!bundle) return;

  const name = `Bundle ${bundleIndex + 1} (${bundle.coPurchasePercentage}% co-purchase)`;

  const newBundle = {
    id: Date.now().toString() + bundleIndex,
    user_id: user.id,
    bundle_name: name,
    items: bundle.items,
    total_price: bundle.totalPrice,
    co_purchase_percentage: bundle.coPurchasePercentage,
    created_date: new Date().toISOString()
  };

  try {
    const { error } = await supabaseClient
      .from('app_1583311cb5_bundles')
      .insert([newBundle]);
    
    if (error) throw error;
    utils.showToast(`Bundle "${name}" saved successfully!`, 'success');
  } catch (error) {
    console.error('Error saving bundle:', error);
    utils.showToast('Failed to save bundle to database', 'error');
  }
};

// Save selected bundles
document.getElementById('saveSelectedBtn').addEventListener('click', async () => {
  const user = await auth.getCurrentUser();
  if (!user || selectedBundles.length === 0) return;

  try {
    for (const index of selectedBundles) {
      const bundle = generatedBundles[index];
      const name = `Bundle ${index + 1} (${bundle.coPurchasePercentage}% co-purchase)`;
      const newBundle = {
        id: Date.now().toString() + index,
        user_id: user.id,
        bundle_name: name,
        items: bundle.items,
        total_price: bundle.totalPrice,
        co_purchase_percentage: bundle.coPurchasePercentage,
        created_date: new Date().toISOString()
      };
      
      const { error } = await supabaseClient
        .from('app_1583311cb5_bundles')
        .insert([newBundle]);
      
      if (error) throw error;
    }

    utils.showToast(`${selectedBundles.length} bundle(s) saved successfully!`, 'success');
    
    // Remove saved bundles from the list
    const remainingBundles = generatedBundles.filter((_, index) => !selectedBundles.includes(index));
    generatedBundles = remainingBundles;
    selectedBundles = [];
    
    if (generatedBundles.length === 0) {
      document.getElementById('bundlesSection').classList.add('hidden');
    } else {
      displayBundles();
    }
  } catch (error) {
    console.error('Error saving bundles:', error);
    utils.showToast('Failed to save bundles to database', 'error');
  }
});
