// Automated Auth & RBAC API Test Suite for EcoPartnerHub
// Tests all authentication, authorization, role management, and session invalidation flows.

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

const results = [];

function recordResult(testName, endpoint, method, expectedStatus, actualStatus, pass, details = "") {
  results.push({
    testName,
    endpoint,
    method,
    expectedStatus,
    actualStatus,
    status: pass ? "✅ PASS" : "❌ FAIL",
    details,
  });
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

async function runTests() {
  console.log("================================================================================");
  console.log(`🚀 Starting EcoPartnerHub Auth & RBAC Automated Verification Suite`);
  console.log(`📡 Target Endpoint: ${BASE_URL}`);
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@testecohub.com`;
  const testCustomerPhone = `+9198${String(timestamp).slice(-8)}`;
  const testProviderEmail = `provider_${timestamp}@testecohub.com`;
  const testProviderPhone = `+9197${String(timestamp).slice(-8)}`;
  const password = "StrongPassword@2026!";

  let customerToken = null;
  let customerId = null;
  let providerToken = null;
  let adminToken = null;
  let superAdminToken = null;

  // 1. Customer registration (201 Created)
  try {
    const res = await request("/api/auth/register/customer", {
      method: "POST",
      body: {
        email: testCustomerEmail,
        password,
        phone: testCustomerPhone,
        fullName: "Test Customer User",
        businessName: "Eco Retail Hub Pvt",
        businessType: "E-commerce Retail",
        city: "Bengaluru",
        marketplacePresence: ["Amazon", "Flipkart"],
      },
    });

    const pass = res.status === 201 && res.data?.user?.role === "CUSTOMER" && !!res.data?.token;
    customerToken = res.data?.token;
    customerId = res.data?.user?.id;
    recordResult("Customer registration", "/api/auth/register/customer", "POST", 201, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Customer registration", "/api/auth/register/customer", "POST", 201, 500, false, err.message);
  }

  // 2. Provider registration (201 Created)
  try {
    const res = await request("/api/auth/register/provider", {
      method: "POST",
      body: {
        email: testProviderEmail,
        password,
        phone: testProviderPhone,
        legalName: "Eco Logistics India LLP",
        displayName: "EcoSpeed Couriers",
        entityType: "LLP",
        operatingLocations: ["Delhi NCR", "Mumbai", "Bengaluru"],
        website: "https://ecospeed.example.com",
        bio: "Specialized in zero-emission electric cargo deliveries.",
      },
    });

    const pass = res.status === 201 && res.data?.user?.role === "PROVIDER" && !!res.data?.token;
    providerToken = res.data?.token;
    recordResult("Provider registration", "/api/auth/register/provider", "POST", 201, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Provider registration", "/api/auth/register/provider", "POST", 201, 500, false, err.message);
  }

  // 3. Duplicate email validation (409 Conflict)
  try {
    const res = await request("/api/auth/register/customer", {
      method: "POST",
      body: {
        email: testCustomerEmail,
        password,
        fullName: "Duplicate User Attempt",
      },
    });

    const pass = res.status === 409 && res.data?.success === false && res.data?.error?.includes("already exists");
    recordResult("Duplicate email", "/api/auth/register/customer", "POST", 409, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Duplicate email", "/api/auth/register/customer", "POST", 409, 500, false, err.message);
  }

  // 3b. Provider duplicate email validation - cross-role duplicate email blocked (409 Conflict)
  try {
    const res = await request("/api/auth/register/provider", {
      method: "POST",
      body: {
        email: testCustomerEmail,
        password,
        legalName: "Duplicate Provider LLC",
        displayName: "Dup Provider",
      },
    });

    const pass = res.status === 409 && res.data?.success === false && res.data?.error?.includes("already exists");
    recordResult("Provider duplicate email blocked", "/api/auth/register/provider", "POST", 409, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Provider duplicate email blocked", "/api/auth/register/provider", "POST", 409, 500, false, err.message);
  }

  // 4. Correct login (200 OK)
  try {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: testCustomerEmail,
        password,
      },
    });

    const pass = res.status === 200 && !!res.data?.token && res.data?.user?.role === "CUSTOMER";
    if (res.data?.token) {
      customerToken = res.data.token;
    }
    recordResult("Correct login", "/api/auth/login", "POST", 200, res.status, pass, "Successfully authenticated");
  } catch (err) {
    recordResult("Correct login", "/api/auth/login", "POST", 200, 500, false, err.message);
  }

  // 5. Incorrect password (401 Unauthorized)
  try {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: testCustomerEmail,
        password: "IncorrectPassword!999",
      },
    });

    const pass =
      res.status === 401 &&
      res.data?.success === false &&
      (res.data?.error === "Invalid email or password" || res.data?.message === "Invalid email or password");
    recordResult("Incorrect password", "/api/auth/login", "POST", 401, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Incorrect password", "/api/auth/login", "POST", 401, 500, false, err.message);
  }

  // 6. Get current user (200 OK)
  try {
    const res = await request("/api/user/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    const pass = res.status === 200 && res.data?.user?.email === testCustomerEmail;
    recordResult("Get current user", "/api/user/me", "GET", 200, res.status, pass, `User ID: ${res.data?.user?.id}`);
  } catch (err) {
    recordResult("Get current user", "/api/user/me", "GET", 200, 500, false, err.message);
  }

  // 7. Access without token (401 Unauthorized)
  try {
    const res = await request("/api/user/me", {
      method: "GET",
    });

    const pass =
      res.status === 401 &&
      res.data?.success === false &&
      Boolean(res.data?.error?.toLowerCase().includes("unauthorized"));
    recordResult("Access without token", "/api/user/me", "GET", 401, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Access without token", "/api/user/me", "GET", 401, 500, false, err.message);
  }

  // 8. Customer accesses admin API (403 Forbidden)
  try {
    const res = await request("/api/admin/dashboard", {
      method: "GET",
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    const pass = res.status === 403;
    recordResult("Customer accesses admin API", "/api/admin/dashboard", "GET", 403, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Customer accesses admin API", "/api/admin/dashboard", "GET", 403, 500, false, err.message);
  }

  // 9. Provider accesses customer-only API (403 Forbidden)
  try {
    const res = await request("/api/customer/dashboard", {
      method: "GET",
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    const pass = res.status === 403;
    recordResult("Provider accesses customer-only API", "/api/customer/dashboard", "GET", 403, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Provider accesses customer-only API", "/api/customer/dashboard", "GET", 403, 500, false, err.message);
  }

  // 10. Provider accesses Provider Dashboard (200 OK)
  try {
    const res = await request("/api/provider/dashboard", {
      method: "GET",
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    const pass = res.status === 200 && res.data?.dashboard?.displayName === "EcoSpeed Couriers";
    recordResult("Provider accesses Provider dashboard", "/api/provider/dashboard", "GET", 200, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Provider accesses Provider dashboard", "/api/provider/dashboard", "GET", 200, 500, false, err.message);
  }

  // 11. Super Admin login & dashboard (200 OK)
  try {
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: "superadmin@ecopartnerhub.com",
        password: "SuperAdmin@2026",
      },
    });

    superAdminToken = loginRes.data?.token;

    const dashRes = await request("/api/super-admin/dashboard", {
      method: "GET",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    const pass = dashRes.status === 200 && !!dashRes.data?.platformOverview;
    recordResult("Super Admin dashboard access", "/api/super-admin/dashboard", "GET", 200, dashRes.status, pass, dashRes.data?.message || "");
  } catch (err) {
    recordResult("Super Admin dashboard access", "/api/super-admin/dashboard", "GET", 200, 500, false, err.message);
  }

  // 12. Super Admin invites/creates new Admin (201 Created)
  const newAdminEmail = `admin_created_${timestamp}@ecopartnerhub.com`;
  try {
    const res = await request("/api/super-admin/admins", {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        email: newAdminEmail,
        password: "AdminPassword@2026!",
        phone: `+9196${String(timestamp).slice(-8)}`,
      },
    });

    const pass = res.status === 201 && res.data?.admin?.role === "ADMIN";
    recordResult("Super Admin creates Admin account", "/api/super-admin/admins", "POST", 201, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Super Admin creates Admin account", "/api/super-admin/admins", "POST", 201, 500, false, err.message);
  }

  // 13. Operations Admin login & dashboard (200 OK)
  try {
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: "admin@ecopartnerhub.com",
        password: "AdminUser@2026",
      },
    });

    adminToken = loginRes.data?.token;

    const dashRes = await request("/api/admin/dashboard", {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const pass = dashRes.status === 200 && !!dashRes.data?.stats;
    recordResult("Operations Admin dashboard access", "/api/admin/dashboard", "GET", 200, dashRes.status, pass, dashRes.data?.message || "");
  } catch (err) {
    recordResult("Operations Admin dashboard access", "/api/admin/dashboard", "GET", 200, 500, false, err.message);
  }

  // 14. Update user profile information (200 OK)
  try {
    const res = await request("/api/user/me", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        customerProfile: {
          fullName: "Updated Test Fullname",
          city: "Bengaluru South",
        },
      },
    });

    const pass = res.status === 200 && res.data?.user?.customerProfile?.fullName === "Updated Test Fullname";
    recordResult("Update user information", "/api/user/me", "PATCH", 200, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Update user information", "/api/user/me", "PATCH", 200, 500, false, err.message);
  }

  // 15. Get user account status (200 OK)
  try {
    const res = await request("/api/user/status", {
      method: "GET",
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    const pass = res.status === 200 && res.data?.status?.accountStatus === "ACTIVE";
    recordResult("Get account status", "/api/user/status", "GET", 200, res.status, pass, `Status: ${res.data?.status?.accountStatus}`);
  } catch (err) {
    recordResult("Get account status", "/api/user/status", "GET", 200, 500, false, err.message);
  }

  // 16. Admin suspends customer account (200 OK)
  try {
    const res = await request(`/api/admin/users/${customerId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: "SUSPENDED",
        reason: "Compliance audit verification required",
      },
    });

    const pass = res.status === 200 && res.data?.user?.accountStatus === "SUSPENDED";
    recordResult("Admin suspends user account", `/api/admin/users/:id/status`, "PATCH", 200, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Admin suspends user account", `/api/admin/users/:id/status`, "PATCH", 200, 500, false, err.message);
  }

  // 17. Suspended user login attempt blocked (403 Forbidden)
  try {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: testCustomerEmail,
        password,
      },
    });

    const pass = res.status === 403;
    recordResult("Suspended user login blocked", "/api/auth/login", "POST", 403, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Suspended user login blocked", "/api/auth/login", "POST", 403, 500, false, err.message);
  }

  // 18. Admin reactivates customer account (200 OK)
  try {
    const res = await request(`/api/admin/users/${customerId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: "ACTIVE",
        reason: "Compliance audit resolved",
      },
    });

    const pass = res.status === 200 && res.data?.user?.accountStatus === "ACTIVE";
    recordResult("Admin reactivates user account", `/api/admin/users/:id/status`, "PATCH", 200, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Admin reactivates user account", `/api/admin/users/:id/status`, "PATCH", 200, 500, false, err.message);
  }

  // 19. Customer re-logs in and changes password (200 OK)
  let newPasswordToken = null;
  const newPassword = "BrandNewPassword@2026#";
  try {
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: testCustomerEmail,
        password,
      },
    });

    customerToken = loginRes.data?.token;

    const changeRes = await request("/api/user/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        currentPassword: password,
        newPassword,
      },
    });

    const pass = changeRes.status === 200 && !!changeRes.data?.token;
    newPasswordToken = changeRes.data?.token;
    recordResult("Change password", "/api/user/change-password", "POST", 200, changeRes.status, pass, changeRes.data?.message || "");
  } catch (err) {
    recordResult("Change password", "/api/user/change-password", "POST", 200, 500, false, err.message);
  }

  // 20. Customer logout & session invalidation (200 OK)
  try {
    const res = await request("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${newPasswordToken}` },
    });

    const pass = res.status === 200;
    recordResult("Logout / session invalidation", "/api/auth/logout", "POST", 200, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Logout / session invalidation", "/api/auth/logout", "POST", 200, 500, false, err.message);
  }

  // 21. Re-access with logged-out token blocked (401 Unauthorized)
  try {
    const res = await request("/api/user/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${newPasswordToken}` },
    });

    const pass =
      res.status === 401 &&
      res.data?.success === false &&
      Boolean(res.data?.error?.toLowerCase().includes("revoked"));
    recordResult("Access after logout revoked", "/api/user/me", "GET", 401, res.status, pass, res.data?.error || "");
  } catch (err) {
    recordResult("Access after logout revoked", "/api/user/me", "GET", 401, 500, false, err.message);
  }

  // 22. Forgot password request (200 OK)
  let resetToken = null;
  try {
    const res = await request("/api/auth/forgot-password", {
      method: "POST",
      body: {
        email: testCustomerEmail,
      },
    });

    resetToken = res.data?.resetToken;
    const pass = res.status === 200 && !!resetToken;
    recordResult("Forgot password request", "/api/auth/forgot-password", "POST", 200, res.status, pass, "Reset token issued");
  } catch (err) {
    recordResult("Forgot password request", "/api/auth/forgot-password", "POST", 200, 500, false, err.message);
  }

  // 23. Reset password with token (200 OK)
  try {
    const res = await request("/api/auth/reset-password", {
      method: "POST",
      body: {
        token: resetToken,
        newPassword: "FinalResetPassword@2026!",
      },
    });

    const pass = res.status === 200;
    recordResult("Reset password with token", "/api/auth/reset-password", "POST", 200, res.status, pass, res.data?.message || "");
  } catch (err) {
    recordResult("Reset password with token", "/api/auth/reset-password", "POST", 200, 500, false, err.message);
  }

  // PRINT SUMMARY TABLE
  console.log("\n================================================================================");
  console.log("📊 WEEK 1 AUTHENTICATION & RBAC TEST VERIFICATION MATRIX");
  console.log("================================================================================");
  console.log(
    "| " +
      "API Test Scenario".padEnd(36) +
      " | Method | Expected | Actual | Status  |"
  );
  console.log("|" + "-".repeat(38) + "|--------|----------|--------|---------|");

  let passedCount = 0;
  for (const r of results) {
    if (r.status.includes("PASS")) passedCount++;
    console.log(
      `| ${r.testName.padEnd(36)} | ${r.method.padEnd(6)} | ${String(r.expectedStatus).padEnd(8)} | ${String(r.actualStatus).padEnd(6)} | ${r.status} |`
    );
  }

  console.log("================================================================================");
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
  console.log("================================================================================\n");

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
