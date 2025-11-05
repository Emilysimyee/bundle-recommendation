// Analytics page logic
let allReports = [];
let selectedReport = null;
let charts = {};

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

// Load reports
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
    
    if (allReports.length === 0) {
      document.getElementById('fileSelector').classList.add('hidden');
      document.getElementById('noDataMessage').classList.remove('hidden');
      return;
    }

    // Populate dropdown
    const reportSelect = document.getElementById('reportSelect');
    reportSelect.innerHTML = '<option value="">Choose a report...</option>' +
      allReports.map(r => `<option value="${r.id}">${r.file_name} - ${utils.formatDate(r.upload_date)}</option>`).join('');
    
    // Select most recent by default
    if (allReports.length > 0) {
      reportSelect.value = allReports[0].id;
      await loadAnalytics(allReports[0].id);
    }
  } catch (error) {
    console.error('Error loading reports:', error);
    utils.showToast('Failed to load reports', 'error');
  }
}

// Report selection change
document.getElementById('reportSelect').addEventListener('change', async (e) => {
  if (e.target.value) {
    await loadAnalytics(e.target.value);
  }
});

// Load analytics for selected report
async function loadAnalytics(reportId) {
  selectedReport = allReports.find(r => r.id === reportId);
  if (!selectedReport) return;

  document.getElementById('analyticsContent').classList.remove('hidden');

  // Aggregate data by product
  const productData = new Map();
  selectedReport.data.forEach(item => {
    const existing = productData.get(item.product) || { quantity: 0, revenue: 0 };
    productData.set(item.product, {
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + (item.price * item.quantity)
    });
  });

  // Aggregate data by category
  const categoryData = new Map();
  selectedReport.data.forEach(item => {
    const existing = categoryData.get(item.category) || { quantity: 0, revenue: 0 };
    categoryData.set(item.category, {
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + (item.price * item.quantity)
    });
  });

  // Calculate totals
  const totalRevenue = Array.from(productData.values()).reduce((sum, d) => sum + d.revenue, 0);
  const totalQuantity = Array.from(productData.values()).reduce((sum, d) => sum + d.quantity, 0);

  // Update summary cards
  document.getElementById('totalRevenue').textContent = `RM${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById('totalQuantity').textContent = totalQuantity.toLocaleString();
  document.getElementById('totalCategories').textContent = categoryData.size;

  // Render charts
  renderCategoryCharts(categoryData);
  renderProductCharts(productData);
  renderTimeSeries(selectedReport.data);
}

// Render category charts
function renderCategoryCharts(categoryData) {
  const categoryArray = Array.from(categoryData.entries())
    .map(([category, data]) => ({
      name: category,
      value: data.revenue,
      quantity: data.quantity
    }))
    .sort((a, b) => b.value - a.value);

  // Pie chart
  const pieCtx = document.getElementById('categoryPieChart');
  if (charts.categoryPie) charts.categoryPie.destroy();
  charts.categoryPie = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: categoryArray.map(c => c.name),
      datasets: [{
        data: categoryArray.map(c => c.value),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
          '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: RM${value.toFixed(2)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });

  // Bar chart
  const barCtx = document.getElementById('categoryBarChart');
  if (charts.categoryBar) charts.categoryBar.destroy();
  charts.categoryBar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: categoryArray.map(c => c.name),
      datasets: [{
        label: 'Revenue (RM)',
        data: categoryArray.map(c => c.value),
        backgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Render product charts
function renderProductCharts(productData) {
  const quantitySort = document.getElementById('quantitySort').value;
  const revenueSort = document.getElementById('revenueSort').value;

  // Quantity chart
  const quantityData = Array.from(productData.entries())
    .map(([product, data]) => ({
      product: product.length > 15 ? product.substring(0, 15) + '...' : product,
      quantity: data.quantity,
      revenue: data.revenue
    }))
    .sort((a, b) => quantitySort === 'highest' ? b.quantity - a.quantity : a.quantity - b.quantity)
    .slice(0, 10);

  const quantityCtx = document.getElementById('quantityChart');
  if (charts.quantity) charts.quantity.destroy();
  charts.quantity = new Chart(quantityCtx, {
    type: 'bar',
    data: {
      labels: quantityData.map(p => p.product),
      datasets: [{
        label: 'Quantity Sold',
        data: quantityData.map(p => p.quantity),
        backgroundColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // Revenue chart
  const revenueData = Array.from(productData.entries())
    .map(([product, data]) => ({
      product: product.length > 15 ? product.substring(0, 15) + '...' : product,
      quantity: data.quantity,
      revenue: data.revenue
    }))
    .sort((a, b) => revenueSort === 'highest' ? b.revenue - a.revenue : a.revenue - b.revenue)
    .slice(0, 10);

  const revenueCtx = document.getElementById('revenueChart');
  if (charts.revenue) charts.revenue.destroy();
  charts.revenue = new Chart(revenueCtx, {
    type: 'bar',
    data: {
      labels: revenueData.map(p => p.product),
      datasets: [{
        label: 'Revenue (RM)',
        data: revenueData.map(p => p.revenue),
        backgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => 'RM' + value.toFixed(2)
          }
        }
      }
    }
  });
}

// Render time series
function renderTimeSeries(data) {
  const dateData = new Map();
  data.forEach(item => {
    const existing = dateData.get(item.date) || { quantity: 0, revenue: 0 };
    dateData.set(item.date, {
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + (item.price * item.quantity)
    });
  });

  const timeSeriesData = Array.from(dateData.entries())
    .map(([date, data]) => ({
      date,
      quantity: data.quantity,
      revenue: data.revenue
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (timeSeriesData.length <= 1) {
    document.getElementById('timeSeriesSection').classList.add('hidden');
    return;
  }

  document.getElementById('timeSeriesSection').classList.remove('hidden');

  const timeSeriesCtx = document.getElementById('timeSeriesChart');
  if (charts.timeSeries) charts.timeSeries.destroy();
  charts.timeSeries = new Chart(timeSeriesCtx, {
    type: 'line',
    data: {
      labels: timeSeriesData.map(d => d.date),
      datasets: [
        {
          label: 'Quantity',
          data: timeSeriesData.map(d => d.quantity),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'Revenue (RM)',
          data: timeSeriesData.map(d => d.revenue),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Quantity'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Revenue (RM)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Sort change handlers
document.getElementById('quantitySort').addEventListener('change', () => {
  if (selectedReport) {
    const productData = new Map();
    selectedReport.data.forEach(item => {
      const existing = productData.get(item.product) || { quantity: 0, revenue: 0 };
      productData.set(item.product, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (item.price * item.quantity)
      });
    });
    renderProductCharts(productData);
  }
});

document.getElementById('revenueSort').addEventListener('change', () => {
  if (selectedReport) {
    const productData = new Map();
    selectedReport.data.forEach(item => {
      const existing = productData.get(item.product) || { quantity: 0, revenue: 0 };
      productData.set(item.product, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (item.price * item.quantity)
      });
    });
    renderProductCharts(productData);
  }
});