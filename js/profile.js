// profile.js

document.addEventListener("DOMContentLoaded", async () => {
  const user = await auth.getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Show user name
  const usernameDisplay = document.getElementById("usernameDisplay");
  if (usernameDisplay) {
    usernameDisplay.textContent = auth.getUsername(user);
  }

  // Load counts
  await loadUserActivity(user.id);
});

async function loadUserActivity(userId) {
  try {
    // --- Get Reports ---
    const { data: reports, error: reportError } = await supabaseClient
      .from("app_1583311cb5_sales_reports")
      .select("id")
      .eq("user_id", userId);

    if (reportError) throw reportError;

    // --- Get Bundles ---
    const { data: bundles, error: bundleError } = await supabaseClient
      .from("app_1583311cb5_bundles")
      .select("id")
      .eq("user_id", userId);

    if (bundleError) throw bundleError;

    // --- Count and display ---
    const reportCount = reports?.length || 0;
    const bundleCount = bundles?.length || 0;

    document.getElementById("reportCount").textContent = reportCount;
    document.getElementById("bundleCount").textContent = bundleCount;

  } catch (err) {
    console.error("Error loading activity:", err);
    utils.showToast("Failed to load activity data", "error");
  }
}
