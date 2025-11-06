// Utility functions
const utils = {
  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white z-50 animate-fade-in ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 
      'bg-blue-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Format date
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  },

  // Parse CSV
  parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    return { headers, data };
  },

  // Generate bundle recommendations
  generateBundles(receipts, products, categories) {
    const coPurchaseMap = new Map();
    
    // Group receipts by receipt_id
    const receiptGroups = {};
    receipts.forEach(receipt => {
      const receiptId = receipt.receipt_id || receipt.ReceiptID;
      if (!receiptGroups[receiptId]) {
        receiptGroups[receiptId] = [];
      }
      receiptGroups[receiptId].push(receipt.product_id || receipt.ProductID);
    });

    // Calculate co-purchase frequencies
    Object.values(receiptGroups).forEach(productIds => {
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const pair = [productIds[i], productIds[j]].sort().join('-');
          coPurchaseMap.set(pair, (coPurchaseMap.get(pair) || 0) + 1);
        }
      }
    });

    // Sort by frequency and create bundles
    const sortedPairs = Array.from(coPurchaseMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const bundles = sortedPairs.map(([pair, frequency], index) => {
      const [prod1, prod2] = pair.split('-');
      const product1 = products.find(p => (p.product_id || p.ProductID) === prod1);
      const product2 = products.find(p => (p.product_id || p.ProductID) === prod2);
      
      const cat1 = categories.find(c => (c.category_id || c.CategoryID) === (product1?.category_id || product1?.CategoryID));
      const cat2 = categories.find(c => (c.category_id || c.CategoryID) === (product2?.category_id || product2?.CategoryID));

      return {
        id: `bundle-${index + 1}`,
        name: `Bundle ${index + 1}`,
        products: [
          {
            id: prod1,
            name: product1?.product_name || product1?.ProductName || 'Unknown',
            category: cat1?.category_name || cat1?.CategoryName || 'Unknown',
            price: parseFloat(product1?.price || product1?.Price || 0)
          },
          {
            id: prod2,
            name: product2?.product_name || product2?.ProductName || 'Unknown',
            category: cat2?.category_name || cat2?.CategoryName || 'Unknown',
            price: parseFloat(product2?.price || product2?.Price || 0)
          }
        ],
        frequency,
        totalPrice: (parseFloat(product1?.price || product1?.Price || 0) + 
                    parseFloat(product2?.price || product2?.Price || 0)).toFixed(2)
      };
    });

    return bundles;
  },

  // Calculate analytics
  calculateAnalytics(receipts, products, bundles) {
    const totalReceipts = new Set(receipts.map(r => r.receipt_id || r.ReceiptID)).size;
    const totalProducts = products.length;
    const avgBundleFrequency = bundles.length > 0 
      ? (bundles.reduce((sum, b) => sum + b.frequency, 0) / bundles.length).toFixed(1)
      : 0;

    // Top categories
    const categoryCount = {};
    receipts.forEach(receipt => {
      const product = products.find(p => 
        (p.product_id || p.ProductID) === (receipt.product_id || receipt.ProductID)
      );
      if (product) {
        const catId = product.category_id || product.CategoryID;
        categoryCount[catId] = (categoryCount[catId] || 0) + 1;
      }
    });

    return {
      totalReceipts,
      totalProducts,
      totalBundles: bundles.length,
      avgBundleFrequency,
      categoryCount
    };
  }
};

window.utils = utils;