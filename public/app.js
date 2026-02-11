const state = {
  token: localStorage.getItem("ideavault_token"),
  ideas: [],
  analytics: null,
  timeline: [],
  notifications: [],
};

const elements = {
  themeToggle: document.getElementById("themeToggle"),
  logoutBtn: document.getElementById("logoutBtn"),
  authSection: document.getElementById("authSection"),
  dashboard: document.getElementById("dashboard"),
  timeline: document.getElementById("timeline"),
  analytics: document.getElementById("analytics"),
  insights: document.getElementById("insights"),
  registerForm: document.getElementById("registerForm"),
  loginForm: document.getElementById("loginForm"),
  authMessage: document.getElementById("authMessage"),
  ideaGrid: document.getElementById("ideaGrid"),
  timelineList: document.getElementById("timelineList"),
  analyticsIdeas: document.getElementById("analyticsIdeas"),
  analyticsCategories: document.getElementById("analyticsCategories"),
  analyticsActivity: document.getElementById("analyticsActivity"),
  analyticsHighlight: document.getElementById("analyticsHighlight"),
  suggestionContainer: document.getElementById("suggestions"),
  statIdeas: document.getElementById("statIdeas"),
  statCategories: document.getElementById("statCategories"),
  statActivity: document.getElementById("statActivity"),
  nextReminder: document.getElementById("nextReminder"),
  ideaPreview: document.getElementById("ideaPreview"),
  openIdeaForm: document.getElementById("openIdeaForm"),
  ideaModal: document.getElementById("ideaModal"),
  closeIdeaForm: document.getElementById("closeIdeaForm"),
  ideaForm: document.getElementById("ideaForm"),
  notificationList: document.getElementById("notificationList"),
  prioritySummary: document.getElementById("prioritySummary"),
  themeBody: document.body,
};

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
};

const setAuthMessage = (message, isError = false) => {
  elements.authMessage.textContent = message;
  elements.authMessage.style.color = isError ? "#ee4458" : "var(--primary)";
};

const toggleSections = (isAuthenticated) => {
  elements.authSection.classList.toggle("hidden", isAuthenticated);
  elements.dashboard.classList.toggle("hidden", !isAuthenticated);
  elements.timeline.classList.toggle("hidden", !isAuthenticated);
  elements.analytics.classList.toggle("hidden", !isAuthenticated);
  elements.insights.classList.toggle("hidden", !isAuthenticated);
  elements.logoutBtn.classList.toggle("hidden", !isAuthenticated);
};

const updateTheme = (mode) => {
  if (mode === "dark") {
    elements.themeBody.classList.add("dark");
  } else {
    elements.themeBody.classList.remove("dark");
  }
  elements.themeToggle.textContent = mode === "dark" ? "Light mode" : "Dark mode";
  localStorage.setItem("ideavault_theme", mode);
};

const initTheme = () => {
  const stored = localStorage.getItem("ideavault_theme") || "light";
  updateTheme(stored);
};

const formatDate = (value) => new Date(value).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const renderIdeas = () => {
  if (!state.ideas.length) {
    elements.ideaGrid.innerHTML = "<p class='muted'>Start by capturing your first idea.</p>";
    return;
  }

  const groups = state.ideas.reduce((acc, idea) => {
    const primaryTag = idea.tags[0] || "Uncategorized";
    if (!acc[primaryTag]) {
      acc[primaryTag] = [];
    }
    acc[primaryTag].push(idea);
    return acc;
  }, {});

  elements.ideaGrid.innerHTML = Object.entries(groups)
    .map(([tag, ideas]) => {
      const groupCards = ideas
        .map((idea) => {
          const tags = idea.tags.map((item) => `<span class="tag">${item}</span>`).join("");
          return `
            <article class="idea-card">
              <div>
                <h3>${idea.title}</h3>
                <p class="muted">${idea.description}</p>
              </div>
              <div class="tags">${tags || "<span class='muted'>No tags yet</span>"}</div>
              <span class="priority ${idea.priority}">${idea.priority} Priority</span>
              <div class="idea-actions">
                <small class="muted">Updated ${formatDate(idea.updatedAt)}</small>
                <button class="ghost" data-share="${idea.id}">${idea.shared ? "Shared" : "Share"}</button>
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section class="tag-group">
          <div class="tag-group-header">
            <h3>${tag}</h3>
            <span>${ideas.length} idea${ideas.length > 1 ? "s" : ""}</span>
          </div>
          <div class="tag-group-grid">
            ${groupCards}
          </div>
        </section>
      `;
    })
    .join("");
};

const renderTimeline = (filter = "All") => {
  const items = filter === "All" ? state.timeline : state.timeline.filter((idea) => idea.priority === filter);
  elements.timelineList.innerHTML = items
    .map(
      (idea) => `
      <div class="timeline-item">
        <div>
          <strong>${formatDate(idea.createdAt)}</strong>
          <span>${idea.priority} Priority</span>
          <small class="muted">Updated ${formatDate(idea.updatedAt)}</small>
        </div>
        <div>
          <h3>${idea.title}</h3>
          <p class="muted">${idea.description}</p>
        </div>
      </div>
    `
    )
    .join("");
};

const renderAnalytics = () => {
  if (!state.analytics) return;
  elements.analyticsIdeas.textContent = state.analytics.totalIdeas;
  elements.analyticsCategories.textContent = state.analytics.categories;

  elements.analyticsActivity.innerHTML = Object.entries(state.analytics.activity)
    .map(([month, count]) => `<li>${month}: ${count} updates</li>`)
    .join("");

  elements.analyticsHighlight.textContent = `You revisited ideas ${Object.keys(state.analytics.activity).length} times this quarter.`;
};

const renderSuggestions = async () => {
  if (!state.ideas.length) {
    elements.suggestionContainer.innerHTML = "<p class='muted'>Add your first idea to receive smart suggestions.</p>";
    return;
  }

  try {
    const focusIdea = state.ideas[0];
    const suggestions = await api(`/api/suggestions/${focusIdea.id}`);

    if (!suggestions.length) {
      elements.suggestionContainer.innerHTML = "<p class='muted'>We will surface suggestions as you build more ideas.</p>";
      return;
    }

    elements.suggestionContainer.innerHTML = suggestions
      .map(
        (idea) => `
        <div class="suggestion-card">
          <h3>${idea.title}</h3>
          <p class="muted">${idea.description}</p>
          <ul>
            ${idea.sharedTags.map((tag) => `<li class="tag">${tag}</li>`).join("")}
          </ul>
        </div>
      `
      )
      .join("");
  } catch (error) {
    elements.suggestionContainer.innerHTML = `<p class='muted'>${error.message}</p>`;
  }
};

const renderHero = () => {
  elements.statIdeas.textContent = state.analytics?.totalIdeas ?? 0;
  elements.statCategories.textContent = state.analytics?.categories ?? 0;
  elements.statActivity.textContent = Object.keys(state.analytics?.activity || {}).length;

  const nextReminder = state.notifications[0];
  elements.nextReminder.textContent = nextReminder
    ? `${nextReminder.message} • ${formatDate(nextReminder.due)}`
    : "No reminders set. Add a review schedule.";

  elements.ideaPreview.innerHTML = state.ideas.length
    ? state.ideas
        .slice(0, 2)
        .map(
          (idea) => `
      <div class="idea-preview-card">
        <strong>${idea.title}</strong>
        <p class="muted">${idea.priority} priority · ${idea.tags.join(", ") || "No tags"}</p>
      </div>
    `
        )
        .join("")
    : "<p class='muted'>Capture a new idea to see a preview here.</p>";
};

const renderDashboardPanels = () => {
  if (!elements.notificationList || !elements.prioritySummary) return;

  elements.notificationList.innerHTML = state.notifications.length
    ? state.notifications
        .map((reminder) => `<li>${reminder.message} • ${formatDate(reminder.due)}</li>`)
        .join("")
    : "<li class='muted'>No review reminders scheduled yet.</li>";

  const priorities = ["High", "Medium", "Low"];
  const counts = state.ideas.reduce(
    (acc, idea) => {
      acc[idea.priority] = (acc[idea.priority] || 0) + 1;
      return acc;
    },
    { High: 0, Medium: 0, Low: 0 }
  );

  elements.prioritySummary.innerHTML = priorities
    .map(
      (priority) => `
      <div class="priority-pill ${priority}">
        <span>${priority} priority</span>
        <span>${counts[priority]}</span>
      </div>
    `
    )
    .join("");
};

const loadData = async () => {
  const [ideas, analytics, timeline, notifications] = await Promise.all([
    api("/api/ideas"),
    api("/api/analytics"),
    api("/api/timeline"),
    api("/api/notifications"),
  ]);

  state.ideas = ideas;
  state.analytics = analytics;
  state.timeline = timeline;
  state.notifications = notifications;

  renderIdeas();
  renderTimeline();
  renderAnalytics();
  renderHero();
  renderDashboardPanels();
  renderSuggestions();
};

const handleShare = async (id) => {
  try {
    await api(`/api/ideas/${id}/share`, { method: "POST" });
    await loadData();
  } catch (error) {
    setAuthMessage(error.message, true);
  }
};

const handleAuthSuccess = async (token) => {
  state.token = token;
  localStorage.setItem("ideavault_token", token);
  setAuthMessage("Welcome back to IdeaVault.");
  toggleSections(true);
  await loadData();
};

const handleLogout = () => {
  state.token = null;
  localStorage.removeItem("ideavault_token");
  toggleSections(false);
};

const setupEventListeners = () => {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const isRegister = tab.dataset.tab === "register";
      elements.registerForm.classList.toggle("hidden", !isRegister);
      elements.loginForm.classList.toggle("hidden", isRegister);
      setAuthMessage("");
    });
  });

  elements.themeToggle.addEventListener("click", () => {
    const isDark = elements.themeBody.classList.contains("dark");
    updateTheme(isDark ? "light" : "dark");
  });

  elements.logoutBtn.addEventListener("click", handleLogout);

  elements.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.registerForm);
    try {
      const response = await api("/api/register", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      await handleAuthSuccess(response.token);
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.loginForm);
    try {
      const response = await api("/api/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      await handleAuthSuccess(response.token);
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });

  elements.openIdeaForm.addEventListener("click", () => {
    elements.ideaModal.classList.remove("hidden");
  });

  elements.closeIdeaForm.addEventListener("click", () => {
    elements.ideaModal.classList.add("hidden");
  });

  elements.ideaModal.addEventListener("click", (event) => {
    if (event.target === elements.ideaModal) {
      elements.ideaModal.classList.add("hidden");
    }
  });

  elements.ideaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.ideaForm);
    const payload = Object.fromEntries(formData.entries());
    payload.tags = payload.tags
      ? payload.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    try {
      await api("/api/ideas", { method: "POST", body: JSON.stringify(payload) });
      elements.ideaModal.classList.add("hidden");
      elements.ideaForm.reset();
      await loadData();
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });

  elements.ideaGrid.addEventListener("click", (event) => {
    const shareId = event.target.dataset.share;
    if (shareId) {
      handleShare(shareId);
    }
  });

  document.querySelectorAll(".filters button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filters button").forEach((item) => item.classList.remove("primary"));
      button.classList.add("primary");
      renderTimeline(button.dataset.filter);
    });
  });

  document.getElementById("showRegister").addEventListener("click", () => {
    document.querySelector(".tab[data-tab='register']").click();
    elements.authSection.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("showLogin").addEventListener("click", () => {
    document.querySelector(".tab[data-tab='login']").click();
    elements.authSection.scrollIntoView({ behavior: "smooth" });
  });
};

const init = async () => {
  initTheme();
  setupEventListeners();
  toggleSections(Boolean(state.token));

  if (state.token) {
    try {
      await loadData();
    } catch (error) {
      handleLogout();
    }
  }
};

init();
