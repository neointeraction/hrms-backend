// Test script to check if getRoles API works
const axios = require("axios");

async function testGetRoles() {
  try {
    console.log("Testing GET /api/admin/roles...\n");

    // You need to replace this with your actual JWT token
    // Get it from browser localStorage: localStorage.getItem('token')
    const token = process.argv[2];

    if (!token) {
      console.log("ERROR: No token provided!");
      console.log("Usage: node scripts/test_roles_api.js YOUR_JWT_TOKEN");
      console.log("\nTo get your token:");
      console.log("1. Open browser console (F12)");
      console.log('2. Type: localStorage.getItem("token")');
      console.log("3. Copy the token and run this script again");
      process.exit(1);
    }

    const response = await axios.get("http://localhost:5001/api/admin/roles", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("SUCCESS! Status:", response.status);
    console.log("Roles returned:", response.data.length);
    console.log("\nRoles:");
    response.data.forEach((role) => {
      console.log(`  - ${role.name} (ID: ${role._id})`);
    });
  } catch (error) {
    console.log("ERROR:", error.response?.status, error.response?.statusText);
    console.log("Message:", error.response?.data?.message || error.message);
  }
}

testGetRoles();
