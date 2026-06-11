<p align="center">
  <img src="https://img.shields.io/badge/ExpenseIQ-AI%20Powered-6c5ce7?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn5KwPC90ZXh0Pjwvc3ZnPg==&logoColor=white" alt="ExpenseIQ" />
  <br/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/PWA-ready-blueviolet?style=flat-square&logo=pwa" alt="PWA" />
  <img src="https://img.shields.io/badge/Offline-Capable-orange?style=flat-square" alt="Offline" />
  <img src="https://img.shields.io/badge/No%20Backend-100%25%20Client%20Side-success?style=flat-square" alt="No Backend" />
</p>

<h1 align="center">💰 ExpenseIQ — Smart Spending Insights</h1>

<p align="center">
  <strong>An AI-powered expense tracker that helps you understand and optimize your spending habits — right in your browser.</strong>
</p>

<p align="center">
  <a href="https://hamdankha9.github.io/AI-Expense-Tracker/">🌐 Live Demo</a> •
  <a href="#-features">✨ Features</a> •
  <a href="#-tech-stack">🛠 Tech Stack</a> •
  <a href="#-getting-started">🚀 Getting Started</a>
</p>

---

## ✨ Features

### 📊 Dashboard
- **Real-time summary cards** — Total spent, monthly spending, transaction count, and daily average
- **Month-over-month trend** — See if you're spending more or less than last month
- **Smart insights banner** — AI-generated tips based on your current spending patterns
- **Interactive charts** — Doughnut chart for category breakdown + bar chart for monthly spending

### 🤖 AI Assistant
- **Natural Language Processing** — Add expenses by typing naturally (e.g., *"spent 500 on pizza yesterday"*)
- **Voice Input** — Use your microphone to dictate expenses hands-free via the Web Speech API
- **AI Category Detection** — Automatically suggests the right category based on your description
- **Smart Budget Recommendations** — AI analyzes your history and suggests 10%-reduced monthly budgets per category
- **Anomaly Detection** — Flags unusually large expenses using Z-score statistical analysis
- **Spending Personality** — Discover if you're a *Foodie*, *Explorer*, *Shopaholic*, *Steady Saver*, or *Balanced* spender
- **Savings Tips** — Personalized money-saving suggestions based on your patterns

### 📈 Analytics
- **GitHub-style Spending Heatmap** — Visualize your spending intensity across the last 6 months
- **Timeline Chart** — Daily spending trend over the past 30 days
- **Category Distribution** — Pie chart for a full breakdown
- **Top Spending Days** — Horizontal bar chart showing which days of the week you spend the most
- **Deep Insights** — Top category, biggest expense, month-over-month comparisons, and more

### 📋 Expense Management
- **Add / Edit / Delete** expenses with a clean modal form
- **Category filters** — Food 🍔, Travel ✈️, Shopping 🛍️, Others 📦
- **Full-text search** — Instantly find any expense
- **Data backup** — Export and import your data as JSON
- **Clear all data** with confirmation safeguard

### 📱 Progressive Web App
- **Installable** — Add to your home screen on any device
- **Offline capable** — Service Worker caches assets for offline use
- **Responsive design** — Works beautifully on desktop, tablet, and mobile
- **Bottom navigation** on mobile with a floating action button
- **Dark / Light mode** toggle with persistent preference

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Structure** | HTML5 Semantic |
| **Styling** | Vanilla CSS (Custom Properties, Glassmorphism, Animations) |
| **Logic** | Vanilla JavaScript (ES6+) |
| **Charts** | [Chart.js 4.4](https://www.chartjs.org/) |
| **Fonts** | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |
| **PWA** | Service Worker + Web App Manifest |
| **Voice** | Web Speech API |
| **Storage** | `localStorage` with auto-backup |

> **Zero dependencies. No build step. No backend.** Just open `index.html` and go.

---

## 🚀 Getting Started

### Option 1 — Use the Live App
👉 **[https://hamdankha9.github.io/AI-Expense-Tracker/](https://hamdankha9.github.io/AI-Expense-Tracker/)**

### Option 2 — Run Locally
```bash
# Clone the repository
git clone https://github.com/Hamdankha9/AI-Expense-Tracker.git

# Open in your browser
cd AI-Expense-Tracker
# Simply open index.html — no server needed!
start index.html   # Windows
open index.html    # macOS
xdg-open index.html # Linux
```

### Option 3 — With a Local Server (for full PWA support)
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx serve .
```

---

## 🧠 How the AI Works

ExpenseIQ's AI features run **entirely in the browser** — no API calls, no cloud processing, complete privacy.

| Feature | Algorithm |
|---------|-----------|
| **Category Detection** | Keyword scoring with weighted matching |
| **NLP Parser** | Regex-based amount, date, and description extraction |
| **Spending Forecast** | Linear regression on monthly totals |
| **Anomaly Detection** | Z-score analysis (threshold: 1.8σ) |
| **Budget Suggestions** | Historical average with 10% reduction target |
| **Spending Personality** | Category distribution + coefficient of variation analysis |

---

## 📂 Project Structure

```
AI-Expense-Tracker/
├── index.html        # Main app layout (single-page)
├── style.css         # Complete styling with dark mode & animations
├── script.js         # Core logic + AI engine (1280 lines)
├── sw.js             # Service Worker for offline caching
├── manifest.json     # PWA manifest
└── README.md         # You're here!
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Hamdankha9">Hamdankha9</a>
</p>
