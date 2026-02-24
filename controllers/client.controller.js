const Client = require("../models/Client");
const Project = require("../models/Project");
const Employee = require("../models/Employee");

// Get Client Stats
exports.getClientStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const totalClients = await Client.countDocuments({ tenantId });
    const activeClients = await Client.countDocuments({
      tenantId,
      status: "Active",
    });
    const inactiveClients = totalClients - activeClients;

    // Count projects that have a client assigned (assuming client name is stored in 'client' field)
    const Project = require("../models/Project");
    const totalProjects = await Project.countDocuments({
      tenantId,
      client: { $exists: true, $ne: "" },
    });

    res.json({
      total: totalClients,
      active: activeClients,
      inactive: inactiveClients,
      totalProjects,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all clients (Tenant Scoped)
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ tenantId: req.user.tenantId })
      .sort({
        createdAt: -1,
      })
      .lean(); // Use lean to easily modify the objects

    // Map projects to find associated employees
    const allProjects = await Project.find({
      tenantId: req.user.tenantId,
      status: { $ne: "Cancelled" }, // Exclude cancelled projects if desired
    });

    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        // Find projects matching this client's name
        const clientProjects = allProjects.filter(
          (p) => p.client === client.name,
        );

        // Collect all unique user IDs from manager and members
        const userIds = new Set();
        clientProjects.forEach((p) => {
          if (p.manager) userIds.add(p.manager.toString());
          if (p.members && Array.isArray(p.members)) {
            p.members.forEach((m) => userIds.add(m.toString()));
          }
        });

        // Fetch Employee records for these user IDs
        let associatedEmployees = [];
        if (userIds.size > 0) {
          associatedEmployees = await Employee.find({
            user: { $in: Array.from(userIds) },
            tenantId: req.user.tenantId,
          })
            .select("firstName lastName profilePicture designation")
            .lean();
        }

        return {
          ...client,
          associatedEmployees,
        };
      }),
    );

    res.json(enrichedClients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single client
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new client
exports.createClient = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const tenantId = req.user.tenantId;

    // Check for existing client with same email in tenant
    const existingClient = await Client.findOne({ email, tenantId });
    if (existingClient) {
      return res
        .status(400)
        .json({ message: "Client with this email already exists" });
    }

    const newClient = new Client({
      name,
      email,
      phone,
      address,
      tenantId,
    });

    const savedClient = await newClient.save();
    res.status(201).json(savedClient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update client
exports.updateClient = async (req, res) => {
  try {
    const { name, email, phone, address, status } = req.body;

    const updatedClient = await Client.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { name, email, phone, address, status },
      { new: true },
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json(updatedClient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete client
exports.deleteClient = async (req, res) => {
  try {
    const deletedClient = await Client.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!deletedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
