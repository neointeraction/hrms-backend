const { spawn } = require("child_process");
const http = require("http");

const PORT = 5002;

function verifyAdminUsers() {
  console.log("Starting test server on port " + PORT);

  const env = { ...process.env, PORT: PORT.toString() };
  const serverProcess = spawn("node", ["server.js"], {
    env,
    cwd: process.cwd(),
  });

  serverProcess.stdout.on("data", (data) => {
    console.log(`Server stdout: ${data}`);
    if (data.toString().includes("Server running")) {
      console.log("Server started. Making request...");
      makeRequest();
    }
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`Server stderr: ${data}`);
  });

  function makeRequest() {
    const options = {
      hostname: "localhost",
      port: PORT,
      path: "/api/admin/users",
      method: "GET",
    };

    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("Response Body:", data);
        if (res.statusCode === 200) {
          try {
            const users = JSON.parse(data);
            if (Array.isArray(users)) {
              console.log("SUCCESS: Received array of users.");
            } else {
              console.log("FAILURE: Response is not an array.");
            }
          } catch (e) {
            console.log("FAILURE: Invalid JSON.");
          }
        } else {
          console.log("FAILURE: Status code is not 200.");
        }
        cleanup();
      });
    });

    req.on("error", (e) => {
      console.error(`Problem with request: ${e.message}`);
      cleanup();
    });

    req.end();
  }

  function cleanup() {
    console.log("Killing test server...");
    serverProcess.kill();
    process.exit(0);
  }

  // Timeout fallback
  setTimeout(() => {
    console.log("Timeout reached. Cleaning up.");
    cleanup();
  }, 10000);
}

verifyAdminUsers();
