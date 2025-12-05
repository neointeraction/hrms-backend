const API_URL = "http://localhost:5001/api/admin";

async function verify() {
  try {
    // 1. Get Permissions
    console.log("Fetching permissions...");
    const permRes = await fetch(`${API_URL}/permissions`);
    const perms = await permRes.json();
    console.log(`Fetched ${perms.length} permissions`);
    if (perms.length === 0) throw new Error("No permissions found");

    const permissionId = perms[0]._id;

    // 2. Create Role with Permission
    console.log("Creating role with permission...");
    const roleName = `Test Role ${Date.now()}`;
    const createRes = await fetch(`${API_URL}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: roleName,
        permissions: [permissionId],
      }),
    });
    const createdRoleData = await createRes.json();
    console.log("Role created:", createdRoleData);

    // 3. Get Roles and Verify Permission
    console.log("Fetching roles...");
    const rolesRes = await fetch(`${API_URL}/roles`);
    const roles = await rolesRes.json();
    const createdRole = roles.find((r) => r.name === roleName);

    if (!createdRole) throw new Error("Created role not found");
    console.log(
      "Created role from list:",
      JSON.stringify(createdRole, null, 2)
    );

    if (
      !createdRole.permissions ||
      createdRole.permissions.length === 0 ||
      !createdRole.permissions[0].name
    ) {
      throw new Error("Permissions not populated correctly");
    }

    console.log("Verification Successful!");
  } catch (err) {
    console.error("Verification Failed:", err.message);
  }
}

verify();
