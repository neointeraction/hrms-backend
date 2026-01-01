const axios = require("axios");

// Configuration
const API_URL = "http://localhost:5001/api/ai/agent";
const ADMIN_EMAIL = "agent_test_admin@example.com";
const ADMIN_PASSWORD = "password123";

const runTest = async () => {
  try {
    // 1. Login to get token
    console.log("Logging in...");
    const loginRes = await axios.post("http://localhost:5001/api/auth/login", {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const token = loginRes.data.token;
    console.log("Got token.");

    // 2. Test Agent Command
    const command =
      "Who is the employee with email shameer@neointeraction.com?";
    console.log(`Sending command: "${command}"`);

    const agentRes = await axios.post(
      API_URL,
      { command },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: "http://localhost:5173",
        },
      }
    );

    console.log("\nAgent Response:");
    console.log(JSON.stringify(agentRes.data, null, 2));
  } catch (error) {
    console.error("Test Failed:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
};

runTest();
