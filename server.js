const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ideavault_super_secret";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const users = [
  {
    id: 1,
    name: "Avery Chen",
    email: "avery@ideavault.dev",
    password: "Password123!",
  },
];

let ideaIdCounter = 4;
const ideas = [
  {
    id: 1,
    title: "Solar-Powered Community Garden",
    description: "Create a shared urban garden powered by solar irrigation systems and IoT soil sensors.",
    tags: ["sustainability", "community", "iot"],
    priority: "High",
    createdAt: "2024-08-01T10:15:00Z",
    updatedAt: "2024-08-11T14:20:00Z",
    shared: true,
  },
  {
    id: 2,
    title: "Mindful Focus Studio",
    description: "A mobile app that uses breathwork timers, ambient soundscapes, and adaptive task batching.",
    tags: ["wellness", "productivity", "mobile"],
    priority: "Medium",
    createdAt: "2024-08-12T09:00:00Z",
    updatedAt: "2024-08-14T08:30:00Z",
    shared: false,
  },
  {
    id: 3,
    title: "Creative Co-Living Retreat",
    description: "Design a temporary co-living space where creators collaborate and host weekly showcases.",
    tags: ["community", "events", "creative"],
    priority: "Low",
    createdAt: "2024-08-18T15:10:00Z",
    updatedAt: "2024-08-20T12:00:00Z",
    shared: false,
  },
];

const reminders = [
  {
    id: 1,
    message: "Review your sustainability ideas this week.",
    due: "2024-09-10T09:00:00Z",
  },
  {
    id: 2,
    message: "Reconnect with your mobile productivity concepts.",
    due: "2024-09-12T11:00:00Z",
  },
];

const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const exists = users.find((user) => user.email === email);
  if (exists) {
    return res.status(409).json({ message: "User already exists." });
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
    password,
  };

  users.push(newUser);

  return res.json({ token: generateToken(newUser), user: { id: newUser.id, name, email } });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  return res.json({ token: generateToken(user), user: { id: user.id, name: user.name, email } });
});

app.get("/api/profile", authenticate, (req, res) => {
  const user = users.find((item) => item.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({ id: user.id, name: user.name, email: user.email });
});

app.get("/api/ideas", authenticate, (req, res) => {
  res.json(ideas);
});

app.post("/api/ideas", authenticate, (req, res) => {
  const { title, description, tags, priority } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required." });
  }

  const now = new Date().toISOString();
  const newIdea = {
    id: ideaIdCounter++,
    title,
    description,
    tags: tags || [],
    priority: priority || "Medium",
    createdAt: now,
    updatedAt: now,
    shared: false,
  };

  ideas.unshift(newIdea);
  return res.status(201).json(newIdea);
});

app.patch("/api/ideas/:id", authenticate, (req, res) => {
  const idea = ideas.find((item) => item.id === Number(req.params.id));
  if (!idea) {
    return res.status(404).json({ message: "Idea not found." });
  }

  const { title, description, tags, priority, shared } = req.body;
  if (title) idea.title = title;
  if (description) idea.description = description;
  if (tags) idea.tags = tags;
  if (priority) idea.priority = priority;
  if (typeof shared === "boolean") idea.shared = shared;
  idea.updatedAt = new Date().toISOString();

  return res.json(idea);
});

app.post("/api/ideas/:id/share", authenticate, (req, res) => {
  const idea = ideas.find((item) => item.id === Number(req.params.id));
  if (!idea) {
    return res.status(404).json({ message: "Idea not found." });
  }
  idea.shared = true;
  idea.updatedAt = new Date().toISOString();
  return res.json(idea);
});

app.get("/api/analytics", authenticate, (req, res) => {
  const categories = new Set(ideas.flatMap((idea) => idea.tags));
  const activity = ideas.reduce((acc, idea) => {
    const month = idea.updatedAt.slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalIdeas: ideas.length,
    categories: categories.size,
    activity,
  });
});

app.get("/api/timeline", authenticate, (req, res) => {
  const timeline = [...ideas].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(timeline);
});

app.get("/api/notifications", authenticate, (req, res) => {
  res.json(reminders);
});

app.get("/api/suggestions/:id", authenticate, (req, res) => {
  const current = ideas.find((item) => item.id === Number(req.params.id));
  if (!current) {
    return res.status(404).json({ message: "Idea not found." });
  }

  const suggestions = ideas
    .filter((idea) => idea.id !== current.id)
    .map((idea) => {
      const sharedTags = idea.tags.filter((tag) => current.tags.includes(tag));
      return {
        ...idea,
        sharedTags,
        relevance: sharedTags.length,
      };
    })
    .filter((idea) => idea.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);

  res.json(suggestions);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`IdeaVault server running on http://localhost:${PORT}`);
});
