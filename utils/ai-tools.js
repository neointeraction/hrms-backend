const employeeController = require("../controllers/employee.controller");
const leaveController = require("../controllers/leave.controller");
const Employee = require("../models/Employee");
const Leave = require("../models/Leave");

// --- Adapter to run Express Controllers ---
const runController = async (controllerFn, reqData) => {
  return new Promise(async (resolve, reject) => {
    const req = {
      body: reqData.body || {},
      user: reqData.user || {}, // Permissions context
      params: reqData.params || {},
      query: reqData.query || {},
      files: [], // Mock empty files
    };

    const res = {
      status: (code) => {
        const result = {
          json: (data) => {
            if (code >= 400) {
              reject({ status: code, message: data.message || "Error" });
            } else {
              resolve(data);
            }
          },
          send: (data) => {
            if (code >= 400) reject({ status: code, ...data });
            else resolve(data);
          },
        };
        return result;
      },
      json: (data) => resolve(data),
      send: (data) => resolve(data),
    };

    try {
      await controllerFn(req, res);
    } catch (e) {
      console.error("Controller Execution Error:", e);
      reject(e);
    }
  });
};

// --- Tool Definitions (Gemini Schema) ---
const tools = [
  {
    name: "list_employees",
    description:
      "List all employees in the organization. Use this to find someone's ID or check who is in the team.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_employee_details",
    description: "Get detailed profile of a specific employee.",
    parameters: {
      type: "OBJECT",
      properties: {
        identifier: {
          type: "STRING",
          description: "Name, Email, or Employee ID of the person.",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "create_employee",
    description: "Onboard a new employee. Requires basic details.",
    parameters: {
      type: "OBJECT",
      properties: {
        firstName: { type: "STRING" },
        lastName: { type: "STRING" },
        email: { type: "STRING" },
        role: {
          type: "STRING",
          description: "Role name e.g., 'Employee', 'HR', 'Project Manager'",
        },
        designation: {
          type: "STRING",
          description: "Designation ID if known, else ignore",
        },
        employeeId: {
          type: "STRING",
          description:
            "Unique Employee ID e.g. EMP001. Generate one if not provided.",
        },
      },
      required: ["firstName", "lastName", "email", "role", "employeeId"],
    },
  },
  {
    name: "apply_leave",
    description:
      "Apply for leave on behalf of the current user (or specified user if admin).",
    parameters: {
      type: "OBJECT",
      properties: {
        type: {
          type: "STRING",
          description: "Type of leave: 'Casual', 'Sick', etc.",
        },
        startDate: { type: "STRING", description: "YYYY-MM-DD" },
        endDate: { type: "STRING", description: "YYYY-MM-DD" },
        reason: { type: "STRING" },
      },
      required: ["type", "startDate", "endDate", "reason"],
    },
  },
  {
    name: "list_pending_leaves",
    description: "List all leave requests waiting for approval.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "approve_leave",
    description: "Approve a specific leave request.",
    parameters: {
      type: "OBJECT",
      properties: {
        employeeName: {
          type: "STRING",
          description: "Name of employee to verify context",
        },
        leaveId: {
          type: "STRING",
          description:
            "The ID of the leave request found via list_pending_leaves",
        },
        comments: { type: "STRING" },
      },
      required: ["leaveId"],
    },
  },
];

// --- Tool Implementations ---
const toolFunctions = {
  list_employees: async (args, userContext) => {
    return await runController(employeeController.getDirectory, {
      user: userContext,
    });
  },

  get_employee_details: async (args, userContext) => {
    // 1. Resolve identifier to ID
    const { identifier } = args;
    const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
    const isEmail = identifier.includes("@");

    let employee;
    if (isObjectId) {
      employee = await Employee.findById(identifier);
    } else if (isEmail) {
      employee = await Employee.findOne({
        email: identifier,
        tenantId: userContext.tenantId,
      });
    } else {
      // Search by name
      const nameParts = identifier.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[1] : "";

      let query = { tenantId: userContext.tenantId };
      if (lastName) {
        query.firstName = { $regex: new RegExp(firstName, "i") };
        query.lastName = { $regex: new RegExp(lastName, "i") };
      } else {
        query.$or = [
          { firstName: { $regex: new RegExp(firstName, "i") } },
          { lastName: { $regex: new RegExp(firstName, "i") } },
        ];
      }
      employee = await Employee.findOne(query);
    }

    if (!employee) return "Employee not found.";

    // 2. Call Controller
    return await runController(employeeController.getEmployeeById, {
      user: userContext,
      params: { id: employee._id },
    });
  },

  create_employee: async (args, userContext) => {
    // Clean up args to match controller expectations
    // e.g. mapping simple 'role' string to what controller expects?
    // Controller expects 'role' name, so that's fine.
    return await runController(employeeController.createEmployee, {
      user: userContext,
      body: {
        ...args,
        password: "Welcome@123", // Default password
      },
    });
  },

  apply_leave: async (args, userContext) => {
    return await runController(leaveController.applyLeave, {
      user: userContext,
      body: args,
    });
  },

  list_pending_leaves: async (args, userContext) => {
    return await runController(leaveController.getPendingApprovals, {
      user: userContext,
    });
  },

  approve_leave: async (args, userContext) => {
    return await runController(leaveController.approveLeave, {
      user: userContext,
      params: { id: args.leaveId },
      body: { comments: args.comments || "Approved via AI Agent" },
    });
  },
};

module.exports = {
  tools,
  toolFunctions,
};
