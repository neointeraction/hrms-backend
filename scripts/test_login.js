const axios = require("axios");
const jwt = require("jsonwebtoken");

const API_URL = "http://localhost:5001/api/auth/login";
const EMAIL = "shameer@neointeraction.com";
const PASSWORD = "password123"; // Using the password from the Quick Login button

async function testLogin() {
  try {
    console.log(`Attempting login for ${EMAIL} at ${API_URL}...`);
    const response = await axios.post(API_URL, {
      email: EMAIL,
      password: PASSWORD,
    });

    const { token, user } = response.data;
    console.log("Login Successful!");

    // Decode token without verifying (we trust the server we just called)
    const decoded = jwt.decode(token);

    console.log("\n--- Token Payload ---");
    console.log("User ID:", decoded.userId);
    console.log("Roles:", decoded.roles);

    const hasPerm = decoded.permissions.includes("organization:view");
    console.log(
      `\nHas 'organization:view' in Token?: ${hasPerm ? "YES" : "NO"}`
    );

    if (!hasPerm) {
      console.log("Permissions in token:", decoded.permissions);
      console.log("FAIL: Server is issuing tokens without the permission.");
    } else {
      console.log("SUCCESS: Server is issuing correct tokens.");
      console.log(
        "Conclusion: The user's browser is likely holding a stale token."
      );
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "Login Failed:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("Error:", error.message);
    }
  }
}

testLogin();
