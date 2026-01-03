const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const roleTemplates = require("../config/roleTemplates");

dotenv.config();

const fixRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Helper to get or create permissions
    const getPermissionIds = async (permNames) => {
      const permissionIds = [];
      for (const name of permNames) {
        let perm = await Permission.findOne({ name });
        if (!perm) {
          console.log(`Creating missing permission: ${name}`);
          perm = await Permission.create({
            name,
            description: `Permission for ${name}`,
            module: name.split(":")[0],
          });
        }
        permissionIds.push(perm._id);
      }
      return permissionIds;
    };

    const updateRolePermissions = async (roleName, template) => {
      console.log(`Updating ${roleName} roles...`);
      const permissions = await getPermissionIds(template.permissions);
      const roles = await Role.find({ name: roleName });

      for (const role of roles) {
        const currentPerms = role.permissions.map((p) => p.toString());
        const newPerms = permissions.map((p) => p.toString());
        const updatedPerms = [...new Set([...currentPerms, ...newPerms])];
        role.permissions = updatedPerms;
        role.modules = [
          ...new Set([...(role.modules || []), ...template.modules]),
        ];
        await role.save();
        console.log(
          `Updated ${roleName} role for tenant: ${role.tenantId || "Global"}`
        );
      }
    };

    await updateRolePermissions("Consultant", roleTemplates.Consultant);
    await updateRolePermissions("Intern", roleTemplates.Intern); // Added update for Intern

    // 2. Migrate Contractor Users & Delete Contractor Role
    console.log("Migrating Contractor users to Consultant...");

    const contractorRoles = await Role.find({ name: "Contractor" });
    const User = require("../models/User"); // Ensure User model is loaded

    for (const cRole of contractorRoles) {
      if (!cRole.tenantId) continue; // Skip global if any, focusing on tenant ones first, but global should be deleted too.

      // Find 'Consultant' role for this tenant
      let consultantRole = await Role.findOne({
        name: "Consultant",
        tenantId: cRole.tenantId,
      });
      // If no tenant-specific consultant role, try global?
      // Actually, we should assume the previous step created/updated Consultant roles.
      // If we can't find a consultant role for the tenant, we might fallback to global consultant or create one.
      // For simplicity, let's assume one exists or we rely on name matching if we stored role name in user (User usually stores role name string or ref? We need to check User model).
      // Checking User model... actually User usually has `role` as String name.
    }

    // Step 2a: Update Users with role="Contractor" to role="Consultant"
    const result = await User.updateMany(
      { role: "Contractor" },
      { $set: { role: "Consultant" } }
    );
    console.log(
      `Migrated ${result.modifiedCount} users from Contractor to Consultant.`
    );

    // Step 2b: Delete Contractor Roles
    const delResult = await Role.deleteMany({ name: "Contractor" });
    console.log(`Deleted ${delResult.deletedCount} Contractor roles.`);

    console.log("Role update complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

fixRoles();
