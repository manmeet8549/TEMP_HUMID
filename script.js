/* =========================================================
   USER LOGIN (DEMO)
========================================================= */
const userCredentials = {
  "user@gmail.com": { password: "1234" }
};

/* =========================================================
   THINGSPEAK CONFIG (READ ONLY)
========================================================= */
const THINGSPEAK_URL =
  "https://api.thingspeak.com/channels/3235139/feeds/last.json?api_key=D335IVKX60TK0MCY";

/* =========================================================
   ZONE DATA (Zone A = REAL DATA FROM ESP via ThingSpeak)
========================================================= */
const zones = {
  A: {
    name: "Zone 1 (Room)",
    deviceStatus: {
      online: true,
      lastSeen: new Date(),
      rssi: "-",
      dataQuality: "Cloud"
    },
    metrics: [
      { title: "Temperature", value: "--", unit: "°C", icon: "🌡️", color: "var(--amber)" },
      { title: "Humidity", value: "--", unit: "%", icon: "💧", color: "var(--blue)" }
    ],
    comfortIndex: { score: "Waiting for data" },
    ai: "Fetching data from ESP8266 via ThingSpeak...",
    chartTitle: "Temperature & Humidity (Cloud)",
    chartSeries: {
      labels: [],
      temp: [],
      humidity: []
    }
  },

  B: {
    name: "Zone 2 (Demo)",
    deviceStatus: { online: false },
    metrics: [
      { title: "Temperature", value: 24.5, unit: "°C", icon: "🌡️", color: "var(--amber)" },
      { title: "Humidity", value: 85, unit: "%", icon: "💧", color: "var(--blue)" }
    ],
    ai: "Demo data only."
  },

  C: {
    name: "Zone 3 (Demo)",
    deviceStatus: { online: false },
    metrics: [
      { title: "Temperature", value: -2, unit: "°C", icon: "🥶", color: "var(--cyan)" },
      { title: "Humidity", value: 38, unit: "%", icon: "💧", color: "var(--blue)" }
    ],
    ai: "Demo data only."
  }
};

let currentZone = "A";
let chartInstance = null;

/* =========================================================
   DOM HELPERS
========================================================= */
const zoneContainer = document.getElementById("zoneContainer");
const zoneSelector = document.getElementById("zoneSelector");
const loginForm = document.getElementById("loginForm");
const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");
const errorMessage = document.getElementById("errorMessage");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

/* =========================================================
   LOGIN LOGIC
========================================================= */
loginForm.addEventListener("submit", e => {
  e.preventDefault();

  const email = email.value = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (
    userCredentials[email] &&
    userCredentials[email].password === password
  ) {
    loginPage.style.display = "none";
    dashboardPage.style.display = "block";
    userInfo.textContent = email;
    loadZone("A");
    fetchThingSpeakData();
  } else {
    errorMessage.textContent = "Invalid credentials";
    errorMessage.classList.add("show");
  }
});

logoutBtn.addEventListener("click", () => location.reload());

/* =========================================================
   BUILD UI
========================================================= */
function buildPanel(zoneKey) {
  const zone = zones[zoneKey];
  const panel = document.createElement("div");
  panel.className = "zonePanel";

  zone.metrics.forEach(m => {
    const card = document.createElement("div");
    card.className = "card span6";
    card.innerHTML = `
      <div class="cardHeader">
        <div class="cardTitle">${m.title}</div>
        <div class="badgeIcon">${m.icon}</div>
      </div>
      <div class="metric">
        <div class="metricValue">${m.value}</div>
        <div class="metricUnit">${m.unit}</div>
      </div>
    `;
    panel.appendChild(card);
  });

  const aiCard = document.createElement("div");
  aiCard.className = "card";
  aiCard.innerHTML = `
    <div class="cardTitle">System Status</div>
    <div class="hr"></div>
    <div class="subtle">${zone.ai}</div>
  `;
  panel.appendChild(aiCard);

  const chartCard = document.createElement("div");
  chartCard.className = "card";
  chartCard.innerHTML = `
    <div class="cardTitle">${zone.chartTitle}</div>
    <div class="chartWrap tall">
      <canvas id="mainChart"></canvas>
    </div>
  `;
  panel.appendChild(chartCard);

  return panel;
}

/* =========================================================
   LOAD ZONE
========================================================= */
function loadZone(zoneKey) {
  currentZone = zoneKey;
  zoneContainer.innerHTML = "";
  zoneContainer.appendChild(buildPanel(zoneKey));
  initChart();
}

zoneSelector.addEventListener("change", e => loadZone(e.target.value));

/* =========================================================
   CHART
========================================================= */
function initChart() {
  const canvas = document.getElementById("mainChart");
  if (!canvas) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: zones.A.chartSeries.labels,
      datasets: [
        {
          label: "Temperature",
          data: zones.A.chartSeries.temp,
          borderColor: "#f59e0b",
          tension: 0.3
        },
        {
          label: "Humidity",
          data: zones.A.chartSeries.humidity,
          borderColor: "#60a5fa",
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/* =========================================================
   THINGSPEAK FETCH (CLOUD SAFE)
========================================================= */
async function fetchThingSpeakData() {
  try {
    const res = await fetch(THINGSPEAK_URL);
    const data = await res.json();

    const temp = parseFloat(data.field1);
    const hum = parseFloat(data.field2);
    const mode = data.field3 || "unknown";

    zones.A.metrics[0].value = temp;
    zones.A.metrics[1].value = hum;
    zones.A.ai = `ESP Mode: ${mode.toUpperCase()}`;
    zones.A.deviceStatus.lastSeen = new Date();

    // chart update
    const time = new Date(data.created_at).toLocaleTimeString();
    zones.A.chartSeries.labels.push(time);
    zones.A.chartSeries.temp.push(temp);
    zones.A.chartSeries.humidity.push(hum);

    if (zones.A.chartSeries.labels.length > 10) {
      zones.A.chartSeries.labels.shift();
      zones.A.chartSeries.temp.shift();
      zones.A.chartSeries.humidity.shift();
    }

    if (currentZone === "A") {
      loadZone("A");
    }

  } catch (err) {
    zones.A.ai = "Unable to fetch ThingSpeak data";
    console.warn("ThingSpeak fetch failed");
  }
}

/* =========================================================
   AUTO REFRESH (ThingSpeak rule: ≥15s)
========================================================= */
setInterval(fetchThingSpeakData, 16000);
