const PERMISSION_HIERARCHY = [
  {
    module: "employees",
    label: "Employee Management",
    permissions: [
      { key: "view", label: "View Employees" },
      { key: "create", label: "Add Employee" },
      { key: "edit", label: "Edit Employee" },
      { key: "delete", label: "Delete Employee" },
      { key: "manage_documents", label: "Manage Documents" },
    ],
  },
  {
    module: "roles",
    label: "Role Management",
    permissions: [
      { key: "view", label: "View Roles" },
      { key: "create", label: "Create Role" },
      { key: "edit", label: "Edit Role" },
      { key: "delete", label: "Delete Role" },
    ],
  },
  {
    module: "attendance",
    label: "Attendance",
    permissions: [
      { key: "view", label: "View Attendance" },
      { key: "check_in_out", label: "Check In/Out" },
      { key: "manage", label: "Manage Attendance" },
      { key: "regularize", label: "Regularize Attendance" },
    ],
  },
  {
    module: "shifts",
    label: "Shift Management",
    permissions: [
      { key: "view", label: "View Shifts" },
      { key: "manage", label: "Manage Shifts" },
      { key: "assign", label: "Assign Shifts" },
    ],
  },
  {
    module: "leave",
    label: "Leave Management",
    permissions: [
      { key: "view", label: "View Leaves" },
      { key: "apply", label: "Apply Leave" },
      { key: "approve", label: "Approve Leaves" },
      { key: "manage_policies", label: "Manage Policies" },
      { key: "manage_balances", label: "Manage Balances" },
      { key: "view_all", label: "View All Leaves" }, // Added view_all explicitly
    ],
  },
  {
    module: "payroll",
    label: "Payroll",
    permissions: [
      { key: "view", label: "View Payroll" },
      { key: "manage_structure", label: "Manage Salary Structures" },
      { key: "process", label: "Process Payroll" },
      { key: "view_payslips", label: "View Payslips" },
    ],
  },
  {
    module: "projects",
    label: "Project Management",
    permissions: [
      { key: "view", label: "View Projects" },
      { key: "create", label: "Create Project" },
      { key: "edit", label: "Edit Project" },
      { key: "manage_members", label: "Manage Members" },
      { key: "manage_members", label: "Manage Members" },
      { key: "delete", label: "Delete Project" },
      { key: "task_view", label: "View Project Tasks" },
      { key: "task_create", label: "Create Task" },
      { key: "task_edit", label: "Edit Task" },
      { key: "task_delete", label: "Delete Task" },
      { key: "task_assign", label: "Assign Task" },
    ],
  },
  {
    module: "clients",
    label: "Client Management",
    permissions: [
      { key: "view", label: "View Clients" },
      { key: "create", label: "Add Client" },
      { key: "edit", label: "Edit Client" },
      { key: "delete", label: "Delete Client" },
    ],
  },

  {
    module: "timesheet",
    label: "Timesheet Management",
    permissions: [
      { key: "view", label: "View Timesheets" },
      { key: "submit", label: "Submit Timesheet" },
      { key: "approve", label: "Approve Timesheets" },
    ],
  },
  {
    module: "organization",
    label: "Organization Structure",
    permissions: [
      { key: "view", label: "View Hierarchy" },
      { key: "manage", label: "Manage Structure" },
    ],
  },
  {
    module: "assets",
    label: "Asset Management",
    permissions: [
      { key: "view", label: "View Assets" },
      { key: "add", label: "Add Asset" },
      { key: "allocate", label: "Allocate/Return Asset" },
      { key: "manage_categories", label: "Manage Categories" },
    ],
  },
  {
    module: "documents",
    label: "Document Management",
    permissions: [
      { key: "view", label: "View Documents" },
      { key: "upload", label: "Upload Documents" },
      { key: "delete", label: "Delete Documents" },
    ],
  },
  {
    module: "audit",
    label: "Audit Trail",
    permissions: [{ key: "view", label: "View Audit Logs" }],
  },
  {
    module: "social",
    label: "Social Wall",
    permissions: [
      { key: "view", label: "View Posts" },
      { key: "post", label: "Create Post" },
      { key: "comment", label: "Comment" },
      { key: "moderate", label: "Moderate Posts" },
    ],
  },
  {
    module: "feedback",
    label: "Feedback",
    permissions: [
      { key: "view_received", label: "View Received Feedback" },
      { key: "submit", label: "Submit Feedback" },
    ],
  },
  {
    module: "appreciation",
    label: "Appreciation",
    permissions: [
      { key: "view", label: "View Appreciations" },
      { key: "give", label: "Give Appreciation" },
    ],
  },
  {
    module: "email_automation",
    label: "Email Automation",
    permissions: [{ key: "manage", label: "Manage Automation" }],
  },
  {
    module: "ai_chatbot",
    label: "AI Chatbot",
    permissions: [{ key: "manage", label: "Configure Chatbot" }],
  },
  {
    module: "my_journey",
    label: "My Journey",
    permissions: [{ key: "view", label: "View Timeline" }],
  },
  {
    module: "designations",
    label: "Designation Management",
    permissions: [
      { key: "view", label: "View Designations" },
      { key: "manage", label: "Manage Designations" },
    ],
  },
  {
    module: "exit_management",
    label: "Exit Management",
    permissions: [
      { key: "view", label: "View Resignations" },
      { key: "process", label: "Process Resignations" },
      { key: "manage", label: "Manage Settings" },
    ],
  },
];

module.exports = PERMISSION_HIERARCHY;
