/* =============================================
   GOD OF WAR — TOURNAMENT HUB
   script.js  |  Full client-side logic
   Sections:
     1.  Theme (dark/light + profile themes)
     2.  Navbar (scroll-spy, hamburger, sticky)
     3.  Popup modal
     4.  Scroll helpers & reveal animation
     5.  Map (Nine Realms — Leaflet)
     6.  Contact map (Leaflet)
     7.  Players (fetch, filter, render cards)
     8.  Tournament (fetch list, register form)
     9.  Leaderboard (podium + table, 3 sort tabs)
     10. Contact form (validate + POST to API)
     11. Auth (sign-up, sign-in, logout, session)
     12. Profile (render, theme swatches)
     13. Auth modals (open/close/switch)
     14. Mimir chatbot
============================================= */

const API = "http://localhost:3000/api";

/* =============================================
   1. THEME
============================================= */

/* Apply saved theme before first paint — avoids flash */
(function applyThemeEarly() {
    const saved = localStorage.getItem("gow_theme");
    if (saved === "light") document.body.classList.add("light-mode");

    /* Apply profile accent theme if saved */
    const accent = localStorage.getItem("gow_accent");
    if (accent) applyAccentVars(accent);
})();

function toggleTheme() {
    const isLight = document.body.classList.toggle("light-mode");
    localStorage.setItem("gow_theme", isLight ? "light" : "dark");
    updateThemeButton(isLight);
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.setAttribute("aria-pressed", String(isLight));
}

function updateThemeButton(isLight) {
    const icon  = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");
    if (!icon || !label) return;
    icon.textContent  = isLight ? "🌙" : "☀️";
    label.textContent = isLight ? "Dark" : "Light";
}

/* Profile accent themes */
function applyProfileTheme(accent) {
    localStorage.setItem("gow_accent", accent);
    applyAccentVars(accent);
    /* Update swatch active state */
    document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
    const active = document.querySelector(`.swatch-${accent}`);
    if (active) active.classList.add("active");
}

function applyAccentVars(accent) {
    const map = {
        crimson: { main: "#dc143c", glow: "rgba(220,20,60,0.4)",   dim: "#8b0e26" },
        gold:    { main: "#f0c040", glow: "rgba(240,192,64,0.4)",  dim: "#b08800" },
        blue:    { main: "#00d4ff", glow: "rgba(0,212,255,0.4)",   dim: "#007ba0" },
        green:   { main: "#28a745", glow: "rgba(40,167,69,0.4)",   dim: "#155724" },
    };
    const t = map[accent];
    if (!t) return;
    document.documentElement.style.setProperty("--crimson",      t.main);
    document.documentElement.style.setProperty("--crimson-glow", t.glow);
    document.documentElement.style.setProperty("--crimson-dim",  t.dim);
}

/* =============================================
   2. NAVBAR
============================================= */
document.addEventListener("DOMContentLoaded", () => {
    /* ── Sync theme button ── */
    const isLight = document.body.classList.contains("light-mode");
    updateThemeButton(isLight);
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.setAttribute("aria-pressed", String(isLight));

    /* ── Sticky navbar shadow on scroll ── */
    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        if (!navbar) return;
        navbar.classList.toggle("scrolled", window.scrollY > 40);
        updateNavActiveLink();
    }, { passive: true });

    /* ── Restore session ── */
    restoreSession();

    /* ── Payment method buttons in tournament form ── */
    document.querySelectorAll(".pay-btn[data-method]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".pay-btn[data-method]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    /* ── Player filter pills ── */
    document.querySelectorAll(".pill[data-filter]").forEach(pill => {
        pill.addEventListener("click", function () {
            const filterType = this.dataset.filter;
            const value      = this.dataset.value;
            filterState[filterType] = value;

            document.querySelectorAll(`.pill[data-filter="${filterType}"]`).forEach(b => {
                b.classList.remove("active", "rank-active-top", "rank-active-mid");
            });
            if (filterType === "rank" && value === "Top") {
                this.classList.add("rank-active-top");
            } else if (filterType === "rank" && value === "Mid") {
                this.classList.add("rank-active-mid");
            } else {
                this.classList.add("active");
            }
            renderCards();
        });
    });

    /* ── Search input ── */
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            filterState.search = this.value;
            renderCards();
        });
    }

    /* ── Chat Enter key ── */
    const chatInp = document.getElementById("chatInp");
    if (chatInp) chatInp.addEventListener("keypress", e => { if (e.key === "Enter") sendMsg(); });

    /* ── Auth modal Enter keys ── */
    document.getElementById("li-password")?.addEventListener("keypress", e => { if (e.key === "Enter") loginUser(); });
    document.getElementById("su-confirm")?.addEventListener("keypress",  e => { if (e.key === "Enter") signupUser(); });

    /* ── Init all data ── */
    initMaps();
    setTimeout(async () => {
        await loadPlayersFromServer();
        renderCards();
        loadTournamentList();
        loadLeaderboard("wins");
    }, 600);

    reveal();
});

/* Scroll-spy — highlight active nav link */
function updateNavActiveLink() {
    const sections = ["hero", "players-section", "tournament", "leaderboard", "contact", "profile"];
    let current = "hero";
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 100) current = id;
    });
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.section === current);
    });
}

function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    if (menu) menu.classList.toggle("open");
}

/* =============================================
   3. POPUP MODAL
============================================= */
function closePopup() {
    const modal = document.getElementById("popup");
    if (!modal) return;
    modal.style.opacity = "0";
    setTimeout(() => { modal.style.display = "none"; }, 500);
}

/* =============================================
   4. SCROLL HELPERS & REVEAL
============================================= */
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
}

/* Legacy aliases kept for any onclick in HTML */
function scrollToTournament() { scrollToSection("tournament"); }
function scrollToPlayers()    { scrollToSection("players-section"); }
function scrollToProfile()    {
    const profileSection = document.getElementById("profile");
    if (profileSection && profileSection.style.display !== "none") {
        profileSection.scrollIntoView({ behavior: "smooth" });
    }
}

function reveal() {
    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 150) {
            el.classList.add("active");
        }
    });
}
window.addEventListener("scroll", reveal, { passive: true });

/* =============================================
   5. MAIN MAP — Nine Realms (Leaflet)
============================================= */
let mainMap     = null;
let contactMapL = null;

function initMaps() {
    /* ── Main map ── */
    const mapEl = document.getElementById("map");
    if (mapEl && !mainMap) {
        mainMap = L.map("map").setView([60.5, 7.5], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap"
        }).addTo(mainMap);

        const crimsonIcon = L.divIcon({
            className: "",
            html: `<div style="
                width:28px; height:28px; background:crimson; border-radius:50% 50% 50% 0;
                transform:rotate(-45deg); border:3px solid rgba(255,255,255,0.4);
                box-shadow:0 0 12px rgba(220,20,60,0.8);
            "></div>`,
            iconAnchor: [14, 28]
        });

        const realms = [
            { coords: [60.5,  7.5],  name: "🌲 Wild Woods",      desc: "Kratos's Home — Midgard" },
            { coords: [61.2,  9.4],  name: "⛰ The Mountain",    desc: "Highest peak in Midgard" },
            { coords: [63.0,  12.0], name: "🌊 Lake of Nine",    desc: "Hub of the Nine Realms" },
            { coords: [58.5,  5.5],  name: "🔥 Muspelheim",      desc: "Realm of Fire and Flames" },
            { coords: [65.0,  8.0],  name: "❄ Niflheim",        desc: "Realm of Deadly Mist" },
            { coords: [59.8,  11.2], name: "⚡ Asgard Gate",     desc: "Gateway to Asgard" },
        ];
        realms.forEach(r => {
            L.marker(r.coords, { icon: crimsonIcon })
                .addTo(mainMap)
                .bindPopup(`<b style="color:crimson">${r.name}</b><br>${r.desc}`);
        });
    }

    /* ── Contact map ── */
    const contactMapEl = document.getElementById("contactMap");
    if (contactMapEl && !contactMapL) {
        contactMapL = L.map("contactMap").setView([33.7215, 72.9978], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap"
        }).addTo(contactMapL);

        const hqIcon = L.divIcon({
            className: "",
            html: `<div style="
                width:24px; height:24px; background:crimson; border-radius:50%;
                border:3px solid rgba(255,255,255,0.5);
                box-shadow:0 0 14px rgba(220,20,60,0.9);
            "></div>`,
            iconAnchor: [12, 12]
        });
        L.marker([33.7215, 72.9978], { icon: hqIcon })
            .addTo(contactMapL)
            .bindPopup("<b style='color:crimson'>⚔ GoW Tournament HQ</b><br>Air University, Islamabad")
            .openPopup();
    }
}

/* =============================================
   7. PLAYERS — fetch, filter, render cards
============================================= */
let allPlayers  = [];
let filterState = { search: "", game: "all", rank: "all" };

async function loadPlayersFromServer() {
    try {
        const res  = await fetch(`${API}/players`);
        const data = await res.json();
        allPlayers = data.players || [];
    } catch (err) {
        console.warn("Server offline — players unavailable.", err);
        allPlayers = [];
    }
}

function getFilteredPlayers() {
    const rankOrder = { Top: 0, Mid: 1, Low: 2 };
    return allPlayers
        .filter(p => {
            const matchSearch = p.name.toLowerCase().includes(filterState.search.toLowerCase());
            const matchGame   = filterState.game === "all" || p.game === filterState.game;
            const matchRank   = filterState.rank === "all" || p.rank === filterState.rank;
            return matchSearch && matchGame && matchRank;
        })
        .sort((a, b) => (rankOrder[a.rank] ?? 9) - (rankOrder[b.rank] ?? 9));
}

function renderCards() {
    const grid      = document.getElementById("cards-grid");
    const noResults = document.getElementById("no-results");
    const countEl   = document.getElementById("resultsCount");
    if (!grid) return;

    const players = getFilteredPlayers();
    countEl.innerHTML = players.length > 0
        ? `Showing <span>${players.length}</span> warrior${players.length !== 1 ? "s" : ""}`
        : "";

    grid.innerHTML = "";

    if (players.length === 0) {
        noResults.classList.add("show");
        return;
    }
    noResults.classList.remove("show");

    players.forEach((p, i) => {
        const wrap = document.createElement("div");
        wrap.className = `player-card-wrap ${p.rank === "Top" ? "rank-top-card" : ""}`;
        wrap.style.animationDelay = `${i * 60}ms`;
        wrap.dataset.id = p.id;

        const rankClass  = `rank-${p.rank.toLowerCase()}`;
        const initials   = p.name.slice(0, 2);
        const rankIcon   = p.rank === "Top" ? "👑" : p.rank === "Mid" ? "⚡" : "🛡";

        const statBarsHtml = Object.entries(p.stats).map(([key, val]) => `
            <div class="stat-bar-row">
                <span class="stat-bar-label">${key}</span>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${val}%"></div>
                </div>
                <span class="stat-bar-val">${val}</span>
            </div>
        `).join("");

        const achHtml = p.achievements.map(a => `<span class="ach-pill">${a}</span>`).join("");

        wrap.innerHTML = `
            <div class="player-card">
                <div class="card-face card-front ${rankClass}">
                    <div class="rank-bar"></div>
                    <div class="card-avatar-zone">
                        <div class="avatar-circle">
                            <div class="avatar-inner">${initials}</div>
                        </div>
                        <div class="card-identity">
                            <div class="card-name">${p.name}</div>
                            <div class="card-game-tag">${p.game}</div>
                        </div>
                        ${p.rank === "Top" ? '<span class="diamond-badge">💎</span>' : ""}
                    </div>
                    <span class="rank-badge">${rankIcon} ${p.rank} Rank</span>
                    <div class="card-divider"></div>
                    <div class="card-stats">
                        <div class="stat-item">
                            <div class="stat-value">${p.wins}</div>
                            <div class="stat-label">Wins</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${p.kd}</div>
                            <div class="stat-label">K/D</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${p.hours}</div>
                            <div class="stat-label">Hours</div>
                        </div>
                    </div>
                    <div class="flip-hint">Hover to inspect ↻</div>
                </div>
                <div class="card-face card-back ${rankClass}">
                    <div class="back-header">
                        <span class="back-name">${p.name}</span>
                        <span class="back-close-hint">HOVER OUT TO CLOSE</span>
                    </div>
                    <div class="achievements">${achHtml}</div>
                    ${statBarsHtml}
                    <div class="back-bio">${p.bio}</div>
                </div>
            </div>`;

        grid.appendChild(wrap);
    });
}

/* =============================================
   8. TOURNAMENT — list + registration form
============================================= */
const TOURNAMENT_FEES = {
    "Midgard Championship":   10,
    "Ragnarök Open":          15,
    "Nine Realms Grand Prix": 20,
    "Ascension Cup":           8,
    "Asgard Invitational":    12,
};

async function loadTournamentList() {
    try {
        const res  = await fetch(`${API}/tournaments`);
        const data = await res.json();
        renderTournamentList(data.tournaments || []);
    } catch {
        document.getElementById("tournamentList").innerHTML =
            `<p style="color:#666;font-size:13px;text-align:center">Server offline — tournament data unavailable.</p>`;
    }
}

function renderTournamentList(tournaments) {
    const container = document.getElementById("tournamentList");
    if (!container) return;
    if (!tournaments.length) {
        container.innerHTML = `<p style="color:#666;font-size:13px;text-align:center">No tournaments found.</p>`;
        return;
    }
    container.innerHTML = tournaments.map(t => `
        <div class="t-item">
            <div class="t-item-name">${t.name}</div>
            <div class="t-item-meta">
                <span class="t-item-tag t-tag-${t.status.toLowerCase()}">${t.status}</span>
                <span class="t-item-tag t-tag-prize">${t.prize}</span>
                <span class="t-item-tag t-tag-fee">$${t.fee} entry</span>
                <span class="t-item-tag" style="background:rgba(255,255,255,0.04);color:#666;border:1px solid #222">${t.participants} players</span>
            </div>
        </div>
    `).join("");
}

/* Auto-update fee display when tournament changes */
document.addEventListener("DOMContentLoaded", () => {
    const tSelect = document.getElementById("tTournament");
    if (tSelect) {
        tSelect.addEventListener("change", () => {
            const fee = TOURNAMENT_FEES[tSelect.value] || 10;
            const btn = document.getElementById("tSubmitText");
            if (btn) btn.textContent = `⚔ Enter Battle — Pay $${fee}`;
        });
    }
});

/* ── Tournament form validation ── */
function validateTournamentForm() {
    let valid = true;

    const warrior = document.getElementById("tWarriorName").value.trim();
    const email   = document.getElementById("tEmail").value.trim();
    const tourney = document.getElementById("tTournament").value;
    const payment = document.querySelector(".pay-btn.active[data-method]");

    setFieldError("err-warrior",    !warrior ? "Warrior name is required."       : "");
    setFieldError("err-email",      !email   ? "Email is required."
                                  : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email address." : "");
    setFieldError("err-tournament", !tourney ? "Please select a tournament."     : "");
    setFieldError("err-payment",    !payment ? "Please select a payment method." : "");

    if (!warrior || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !tourney || !payment)
        valid = false;

    return valid;
}

/* ── Register warrior (POST to API) ── */
/* =============================================
   STRIPE PAYMENT INTEGRATION
   
   SETUP — add this ONE line in your index.html
   <head>, before script.js:

   <script src="https://js.stripe.com/v3/"></script>

   Then replace your PUBLISHABLE key below.
============================================= */

/* ── Stripe publishable key (test mode) ── */
const STRIPE_PK = "pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY";
let   stripeInstance = null;
let   cardElement    = null;

/* ── Lazy-initialise Stripe only when needed ── */
function getStripe() {
    if (!stripeInstance) stripeInstance = Stripe(STRIPE_PK);
    return stripeInstance;
}

/* ── Mount / unmount Stripe card element when payment method changes ── */
function onPaymentMethodChange(method) {
    const cardWrap = document.getElementById("stripeCardWrap");

    if (method === "Stripe") {
        /* Show card input */
        if (cardWrap) cardWrap.style.display = "block";

        /* Mount only once */
        if (!cardElement) {
            const elements = getStripe().elements();
            cardElement = elements.create("card", {
                style: {
                    base: {
                        color:           "#e8e8e8",
                        fontFamily:      "Rajdhani, sans-serif",
                        fontSize:        "16px",
                        "::placeholder": { color: "#888" }
                    },
                    invalid: { color: "#ff6b6b" }
                }
            });
            cardElement.mount("#stripeCardElement");
        }
    } else {
        /* Hide card input for non-Stripe methods */
        if (cardWrap) cardWrap.style.display = "none";
    }
}

/* ── Updated registerWarrior — handles Stripe + other methods ── */
async function registerWarrior() {
    if (!validateTournamentForm()) return;

    const warriorName   = document.getElementById("tWarriorName").value.trim();
    const realName      = document.getElementById("tRealName").value.trim();
    const email         = document.getElementById("tEmail").value.trim();
    const rank          = document.getElementById("tRank").value;
    const tournament    = document.getElementById("tTournament").value;
    const game          = document.getElementById("tGame").value;
    const paymentMethod = document.querySelector(".pay-btn.active[data-method]").dataset.method;
    const paymentAmount = TOURNAMENT_FEES[tournament] || 10;

    const submitBtn  = document.getElementById("tSubmitBtn");
    const submitText = document.getElementById("tSubmitText");
    const spinner    = document.getElementById("tSubmitSpinner");
    const successMsg = document.getElementById("tSuccessMsg");

    submitBtn.disabled       = true;
    submitText.style.display = "none";
    spinner.style.display    = "inline";
    successMsg.style.display = "none";

    try {
        /* ── Stripe path ── */
        if (paymentMethod === "Stripe") {
            if (!cardElement) {
                setFieldError("err-payment", "Please enter your card details.");
                return;
            }

            /* 1. Ask backend to create a PaymentIntent */
            const intentRes  = await fetch(`${API}/payment/create-intent`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ amount: paymentAmount, tournament, warriorName })
            });
            const intentData = await intentRes.json();

            if (!intentData.success) {
                setFieldError("err-payment", intentData.message || "Payment setup failed.");
                return;
            }

            /* 2. Confirm card payment in the browser */
            const { error, paymentIntent } = await getStripe().confirmCardPayment(
                intentData.clientSecret,
                {
                    payment_method: {
                        card:             cardElement,
                        billing_details:  { name: warriorName, email }
                    }
                }
            );

            if (error) {
                setFieldError("err-payment", error.message);
                return;
            }

            if (paymentIntent.status !== "succeeded") {
                setFieldError("err-payment", "Payment did not complete. Please try again.");
                return;
            }

            /* 3. Payment succeeded — save registration with Paid status */
            await saveRegistration({
                warriorName, realName, email, rank, tournament, game,
                paymentMethod: "Stripe",
                paymentStatus: "Paid",
                paymentAmount
            }, successMsg);

        } else {
            /* ── Non-Stripe path (JazzCash, EasyPaisa, PayPal, etc.) ── */
            await saveRegistration({
                warriorName, realName, email, rank, tournament, game,
                paymentMethod,
                paymentStatus: "Pending",   // Manual verification needed
                paymentAmount
            }, successMsg);
        }

    } catch (err) {
        successMsg.style.display    = "block";
        successMsg.style.borderColor = "rgba(220,20,60,0.4)";
        successMsg.style.color       = "#ff6b6b";
        successMsg.innerHTML = `❌ Unexpected error: ${err.message}`;
        console.error("Registration error:", err);
    } finally {
        submitBtn.disabled       = false;
        submitText.style.display = "inline";
        spinner.style.display    = "none";
    }
}

/* ── Helper: POST registration to backend ── */
async function saveRegistration(payload, successMsg) {
    const res  = await fetch(`${API}/registrations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        const isPaid = payload.paymentStatus === "Paid";
        successMsg.style.display    = "block";
        successMsg.style.borderColor = "";
        successMsg.style.color       = "";
        successMsg.innerHTML = `
            ✅ <strong>${payload.warriorName}</strong> registered for <strong>${payload.tournament}</strong>!<br>
            💳 $${payload.paymentAmount} via <strong>${payload.paymentMethod}</strong>
            — ${isPaid ? "Payment confirmed ✔" : "Awaiting payment confirmation ⏳"}
        `;

        /* Clear form */
        document.getElementById("tWarriorName").value = "";
        document.getElementById("tRealName").value    = "";
        document.getElementById("tEmail").value       = "";
        document.getElementById("tTournament").value  = "";
        document.querySelectorAll(".pay-btn[data-method]")
            .forEach((b, i) => b.classList.toggle("active", i === 0));

        /* Hide Stripe card element */
        const cardWrap = document.getElementById("stripeCardWrap");
        if (cardWrap) cardWrap.style.display = "none";
        cardElement = null;

        /* Refresh profile registrations if logged in */
        const user = getCurrentUser();
        if (user) loadProfileRegistrations(user.email);

    } else {
        successMsg.style.display    = "block";
        successMsg.style.borderColor = "rgba(220,20,60,0.4)";
        successMsg.style.color       = "#ff6b6b";
        successMsg.innerHTML = `❌ ${data.message || "Registration failed."}`;
    }
}

/* =============================================
   9. LEADERBOARD
============================================= */
let currentSort = "wins";

async function loadLeaderboard(sortBy) {
    currentSort = sortBy;
    if (!allPlayers.length) {
        await loadPlayersFromServer();
    }
    renderLeaderboard(sortBy);
}

function switchLeaderboard(sortBy, tabEl) {
    document.querySelectorAll(".lb-tab").forEach(t => t.classList.remove("active"));
    if (tabEl) tabEl.classList.add("active");
    const header = document.getElementById("lbMetricHeader");
    if (header) {
        header.textContent = sortBy === "wins" ? "Wins" : sortBy === "kd" ? "K/D" : "Hours";
    }
    loadLeaderboard(sortBy);
}

function renderLeaderboard(sortBy) {
    if (!allPlayers.length) return;

    /* Sort players */
    const sorted = [...allPlayers].sort((a, b) => {
        if (sortBy === "wins")  return b.wins - a.wins;
        if (sortBy === "kd")    return parseFloat(b.kd) - parseFloat(a.kd);
        if (sortBy === "hours") return parseInt(b.hours) - parseInt(a.hours);
        return 0;
    });

    /* ── Podium (top 3) ── */
    const podium = document.getElementById("lbPodium");
    if (podium && sorted.length >= 3) {
        const top3 = [sorted[1], sorted[0], sorted[2]]; /* 2nd, 1st, 3rd for podium shape */
        const podiumClasses  = ["podium-2", "podium-1", "podium-3"];
        const podiumRankNums = [2, 1, 3];
        const medals         = ["🥈", "🥇", "🥉"];

        podium.innerHTML = top3.map((p, i) => {
            const metric = sortBy === "wins" ? p.wins : sortBy === "kd" ? p.kd : p.hours;
            const unit   = sortBy === "hours" ? "h" : "";
            const initials = p.name.slice(0, 2);
            return `
                <div class="podium-card ${podiumClasses[i]}">
                    <span class="podium-rank-icon">${medals[i]}</span>
                    <div class="podium-avatar">${initials}</div>
                    <div class="podium-name">${p.name}</div>
                    <div class="podium-score">${metric}${unit}</div>
                    <div class="podium-pedestal">#${podiumRankNums[i]}</div>
                </div>
            `;
        }).join("");
    }

    /* ── Full table ── */
    const tbody = document.getElementById("lbTableBody");
    if (!tbody) return;
    tbody.innerHTML = sorted.map((p, i) => {
        const rankNum    = i + 1;
        const numClass   = rankNum === 1 ? "top1" : rankNum === 2 ? "top2" : rankNum === 3 ? "top3" : "";
        const badgeClass = p.rank === "Top" ? "lb-badge-top" : p.rank === "Mid" ? "lb-badge-mid" : "lb-badge-low";
        const rankIcon   = p.rank === "Top" ? "👑" : p.rank === "Mid" ? "⚡" : "🛡";
        const metric     = sortBy === "wins" ? p.wins : sortBy === "kd" ? p.kd : p.hours;
        const unit       = sortBy === "hours" ? "h" : "";
        const initials   = p.name.slice(0, 2);

        return `
            <tr>
                <td><div class="lb-rank-num ${numClass}">${rankNum === 1 ? "🥇" : rankNum === 2 ? "🥈" : rankNum === 3 ? "🥉" : rankNum}</div></td>
                <td>
                    <div class="lb-warrior-cell">
                        <div class="lb-mini-avatar">${initials}</div>
                        <span class="lb-name">${p.name}</span>
                    </div>
                </td>
                <td style="font-size:12px;color:var(--text-muted)">${p.game}</td>
                <td><span class="lb-badge ${badgeClass}">${rankIcon} ${p.rank}</span></td>
                <td><span class="lb-metric">${metric}${unit}</span></td>
                <td style="font-size:13px">${p.kd}</td>
                <td style="font-size:13px;color:var(--text-muted)">${p.hours}h</td>
            </tr>
        `;
    }).join("");
}

/* =============================================
   10. CONTACT FORM
============================================= */
async function submitContact() {
    const name    = document.getElementById("cName").value.trim();
    const email   = document.getElementById("cEmail").value.trim();
    const subject = document.getElementById("cSubject").value;
    const message = document.getElementById("cMessage").value.trim();

    /* Validate */
    setFieldError("cerr-name",    !name                                        ? "Name is required."                   : "");
    setFieldError("cerr-email",   !email                                       ? "Email is required."
                                : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)   ? "Enter a valid email."                : "");
    setFieldError("cerr-subject", !subject                                     ? "Please select a subject."            : "");
    setFieldError("cerr-msg",     !message                                     ? "Message cannot be empty."
                                : message.length < 10                         ? "Message is too short (min 10 chars)." : "");

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || message.length < 10) return;

    const btn     = document.querySelector("#contact .t-submit-btn");
    const btnText = document.getElementById("cSubmitText");
    const success = document.getElementById("cSuccessMsg");

    btn.disabled        = true;
    btnText.textContent = "⏳ Sending...";

    try {
        const res  = await fetch(`${API}/contacts`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ name, email, subject, message })
        });
        const data = await res.json();

        if (!data.success) {
            setFieldError("cerr-msg", data.message || "Failed to send. Please try again.");
            return;
        }

        success.style.display = "block";
        success.innerHTML = `📨 Raven sent, <strong>${name}</strong>! We'll reply to <strong>${email}</strong> within 24 hours.`;

        /* Clear form */
        document.getElementById("cName").value    = "";
        document.getElementById("cEmail").value   = "";
        document.getElementById("cSubject").value = "";
        document.getElementById("cMessage").value = "";

    } catch (err) {
        setFieldError("cerr-msg", "Server error. Please try again.");
        console.error("Contact submit error:", err);
    } finally {
        btn.disabled        = false;
        btnText.textContent = "📨 Send Raven";
    }
}

/* =============================================
   11. AUTH — sign-up, sign-in, session
============================================= */

/* =============================================
   11. AUTH  —  JWT + Database backend
   Replaces the old localStorage-only auth block.
   Token is stored in localStorage under "gow_token".
   Current user object is cached in sessionStorage
   as "gow_current_user" for fast reads, but the
   source of truth is always the server.
============================================= */

/* ── Token helpers ── */
function getToken()        { return localStorage.getItem("gow_token"); }
function setToken(t)       { localStorage.setItem("gow_token", t); }
function clearToken()      { localStorage.removeItem("gow_token"); }

/* ── Current user (cached) ── */
function getCurrentUser() {
    const raw = sessionStorage.getItem("gow_current_user");
    return raw ? JSON.parse(raw) : null;
}
function setCurrentUser(user) {
    sessionStorage.setItem("gow_current_user", JSON.stringify(user));
}
function clearCurrentUser() {
    sessionStorage.removeItem("gow_current_user");
}

/* ── Sign Up ── */
async function signupUser() {
    const warrior  = document.getElementById("su-warrior").value.trim();
    const email    = document.getElementById("su-email").value.trim();
    const password = document.getElementById("su-password").value;
    const confirm  = document.getElementById("su-confirm").value;

    /* Client-side validation */
    setFieldError("su-err-warrior", !warrior ? "Warrior name is required." : "");
    setFieldError("su-err-email",
        !email                                        ? "Email is required."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)  ? "Enter a valid email address."
        : "");
    setFieldError("su-err-pass",    password.length < 6     ? "Password must be at least 6 characters." : "");
    setFieldError("su-err-confirm", password !== confirm     ? "Passwords do not match."                 : "");

    if (!warrior || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || password.length < 6 || password !== confirm) return;

    const btn = document.getElementById("su-submit-btn");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Creating account..."; }

    try {
        const res  = await fetch(`${API}/auth/signup`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ warriorName: warrior, email, password })
        });
        const data = await res.json();

        if (!data.success) {
            /* Show server error on the right field */
            if (data.message.includes("email"))        setFieldError("su-err-email",   data.message);
            else if (data.message.includes("warrior")) setFieldError("su-err-warrior", data.message);
            else                                        setFieldError("su-err-confirm", data.message);
            return;
        }

        /* Persist token + cache user */
        setToken(data.token);
        setCurrentUser(data.user);

        const succ = document.getElementById("su-success");
        succ.style.display = "block";
        succ.textContent   = `✅ Welcome, ${data.user.warriorName}! Account created.`;

        await new Promise(r => setTimeout(r, 1000));
        closeModal("signupModal");
        onLogin(data.user);

    } catch (err) {
        setFieldError("su-err-confirm", "Server error. Please try again.");
        console.error("Signup error:", err);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "⚔ Create Account"; }
    }
}

/* ── Sign In ── */
async function loginUser() {
    const email    = document.getElementById("li-email").value.trim();
    const password = document.getElementById("li-password").value;

    setFieldError("li-err-email",
        !email ? "Email is required."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email." : "");
    setFieldError("li-err-pass", !password ? "Password is required." : "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return;

    const btn = document.getElementById("li-submit-btn");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Entering realm..."; }

    try {
        const res  = await fetch(`${API}/auth/login`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!data.success) {
            setFieldError("li-err-pass", data.message);
            return;
        }

        /* Persist token + cache user */
        setToken(data.token);
        setCurrentUser(data.user);

        const succ = document.getElementById("li-success");
        succ.style.display = "block";
        succ.textContent   = `✅ Welcome back, ${data.user.warriorName}! Entering the realm...`;

        await new Promise(r => setTimeout(r, 800));
        closeModal("loginModal");
        onLogin(data.user);

    } catch (err) {
        setFieldError("li-err-pass", "Server error. Please try again.");
        console.error("Login error:", err);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Sign In"; }
    }
}

/* ── After login ── */
function onLogin(user) {
    const initials = user.warriorName.slice(0, 2).toUpperCase();
    document.getElementById("navAvatarInitials").textContent = initials;
    document.getElementById("navUsername").textContent       = user.warriorName;
    document.getElementById("navProfile").style.display      = "flex";
    document.querySelector(".nav-btn-login").style.display   = "none";
    document.querySelector(".nav-btn-signup").style.display  = "none";

    const profileSection = document.getElementById("profile");
    if (profileSection) profileSection.style.display = "block";

    renderProfile(user);

    if (user.accent) applyProfileTheme(user.accent);

    const mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) {
        const existing = mobileMenu.querySelector(".mobile-profile-link");
        if (!existing) {
            const link = document.createElement("a");
            link.href = "#profile";
            link.className = "mobile-profile-link";
            link.textContent = `👤 ${user.warriorName}`;
            link.onclick = () => { scrollToProfile(); toggleMobileMenu(); };
            mobileMenu.appendChild(link);
        }
    }
}

/* ── Restore session on page reload ── */
async function restoreSession() {
    const token = getToken();
    if (!token) return;

    try {
        const res  = await fetch(`${API}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            setCurrentUser(data.user);
            onLogin(data.user);
        } else {
            /* Token expired or invalid — clean up */
            clearToken();
            clearCurrentUser();
        }
    } catch (err) {
        console.warn("Session restore failed:", err);
    }
}

/* ── Logout ── */
function logoutUser() {
    clearToken();
    clearCurrentUser();

    document.getElementById("navProfile").style.display     = "none";
    document.querySelector(".nav-btn-login").style.display  = "";
    document.querySelector(".nav-btn-signup").style.display = "";

    const profileSection = document.getElementById("profile");
    if (profileSection) profileSection.style.display = "none";

    applyAccentVars("crimson");
    scrollToSection("hero");
}

/* ── Save profile accent theme to DB ── */
async function saveThemeToDB(accent) {
    const token = getToken();
    if (!token) return;
    try {
        await fetch(`${API}/auth/theme`, {
            method:  "PATCH",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ accent })
        });
        /* Update cached user */
        const user = getCurrentUser();
        if (user) { user.accent = accent; setCurrentUser(user); }
    } catch (err) {
        console.warn("Theme save failed:", err);
    }
}

/* =============================================
   12. PROFILE
============================================= */
function renderProfile(user) {
    const initials = user.warrior.slice(0, 2).toUpperCase();
    document.getElementById("profileAvatar").textContent = initials;
    document.getElementById("profileName").textContent   = user.warrior;
    document.getElementById("profileEmail").textContent  = user.email;
    document.getElementById("profileBadge").textContent  = "Warrior of Midgard";
    document.getElementById("profileJoined").textContent =
        new Date(user.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

    /* Set active swatch */
    document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
    const accSwatch = document.querySelector(`.swatch-${user.accent || "crimson"}`);
    if (accSwatch) accSwatch.classList.add("active");

    loadProfileRegistrations(user.email);
}

async function loadProfileRegistrations(email) {
    const countEl   = document.getElementById("profileRegCount");
    const regList   = document.getElementById("profileRegList");
    if (!countEl || !regList) return;

    try {
        const res  = await fetch(`${API}/registrations`);
        const data = await res.json();
        const regs = (data.data || []).filter(r => r.email === email);

        countEl.textContent = regs.length;

        if (!regs.length) {
            regList.innerHTML = `<p style="color:#666;font-size:13px">No tournaments registered yet.</p>`;
            return;
        }
        regList.innerHTML = regs.map(r => `
            <div class="profile-reg-item">
                <div>
                    <div style="font-weight:700;font-size:13px">${r.tournament}</div>
                    <div style="font-size:11px;color:var(--text-muted);letter-spacing:1px">${r.game} · ${r.rank} Rank</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:13px;color:crimson;font-weight:700">$${r.paymentAmount}</div>
                    <div style="font-size:11px;margin-top:2px">
                        ${r.paymentStatus === "Paid"
                            ? '<span style="color:#28c76f">✅ Paid</span>'
                            : r.paymentStatus === "Pending"
                            ? '<span style="color:#ffc107">⏳ Pending</span>'
                            : '<span style="color:#ff6b6b">❌ Failed</span>'}
                    </div>
                </div>
            </div>
        `).join("");
    } catch {
        regList.innerHTML = `<p style="color:#666;font-size:13px">Could not load registrations (server offline).</p>`;
        countEl.textContent = "—";
    }
}

/* Save accent choice to user record */
function applyProfileTheme(accent) {
    localStorage.setItem("gow_accent", accent);
    applyAccentVars(accent);

    /* Update swatch UI */
    document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
    const active = document.querySelector(`.swatch-${accent}`);
    if (active) active.classList.add("active");

    /* Persist in user record */
    const user = getCurrentUser();
    if (user) {
        user.accent = accent;
        setCurrentUser(user);
        const users = getUsers().map(u => u.id === user.id ? user : u);
        saveUsers(users);
    }
}

/* =============================================
   13. AUTH MODALS — open / close / switch
============================================= */
function openModal(id) {
    /* Clear errors and old success messages first */
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.querySelectorAll(".field-error").forEach(el => el.textContent = "");
    modal.querySelectorAll(".auth-success").forEach(el => {
        el.style.display = "none";
        el.textContent   = "";
    });
    modal.querySelectorAll("input").forEach(inp => inp.value = "");
    modal.classList.add("open");
    /* Focus first input */
    setTimeout(() => { modal.querySelector("input")?.focus(); }, 150);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("open");
}

function switchModal(closeId, openId) {
    closeModal(closeId);
    setTimeout(() => openModal(openId), 180);
}

/* Close auth modal by clicking overlay */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".auth-modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", function(e) {
            if (e.target === this) this.classList.remove("open");
        });
    });
});

/* Password show/hide toggle */
function togglePassword(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === "password") {
        inp.type    = "text";
        btn.textContent = "🙈";
    } else {
        inp.type    = "password";
        btn.textContent = "👁";
    }
}

/* ── Shared helper: set/clear a field error ── */
function setFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

/* =============================================
   14. MIMIR CHATBOT
============================================= */
let mimirHistory = [];

function toggleChat() {
    const win    = document.getElementById("chatWin");
    const isOpen = win.style.display === "flex";
    win.style.display = isOpen ? "none" : "flex";
    if (!isOpen) setTimeout(() => document.getElementById("chatInp")?.focus(), 100);
}

function sendMsg() {
    const inp      = document.getElementById("chatInp");
    const logs     = document.getElementById("chatLogs");
    const userText = inp.value.trim();
    if (!userText) return;

    inp.value = "";
    logs.innerHTML += `<div class="msg user">${escapeHtml(userText)}</div>`;
    logs.scrollTop = logs.scrollHeight;

    const typingId = "mimir-typing-" + Date.now();
    logs.innerHTML += `
        <div class="msg bot mimir-typing" id="${typingId}">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>`;
    logs.scrollTop = logs.scrollHeight;

    mimirHistory.push({ role: "user", content: userText });

    setTimeout(() => {
        const reply = mimirThink(userText);
        mimirHistory.push({ role: "assistant", content: reply });
        document.getElementById(typingId)?.remove();
        logs.innerHTML += `<div class="msg bot">${reply}</div>`;
        logs.scrollTop = logs.scrollHeight;
    }, 700);
}

function mimirThink(input) {
    const q           = input.toLowerCase().trim();
    const players     = allPlayers;
    const rankOrder   = { Top: 0, Mid: 1, Low: 2 };
    const sorted      = [...players].sort((a, b) => (rankOrder[a.rank] ?? 9) - (rankOrder[b.rank] ?? 9));
    const currentUser = getCurrentUser();

    /* Greetings */
    if (/^(hi|hello|hey|greetings|hail|sup|yo|howdy|good\s*(morning|evening|day))/.test(q))
        return `Aye, greetings${currentUser ? " " + currentUser.warrior : " brother"}! I am Mimir — the smartest man alive, and your guide to this tournament. Ask me about warriors, rankings, the leaderboard, how to register, or anything on this site!`;

    /* Auth / login */
    if (/sign\s*up|register\s*account|create\s*account|make\s*account/.test(q))
        return `To create an account, click the <strong>Sign Up</strong> button in the top navbar, brother! Fill in your warrior name, email, and password. It takes only seconds to join the realm.`;
    if (/sign\s*in|log\s*in|login|my\s*account/.test(q))
        return currentUser
            ? `You are already signed in as <strong>${currentUser.warrior}</strong>, brother! Scroll down to see your profile and tournament registrations.`
            : `To sign in, click the <strong>Sign In</strong> button in the top navbar and enter your email and password, brother!`;
    if (/profile|my\s*reg|my\s*tournament/.test(q))
        return currentUser
            ? `Your profile is below the contact section, ${currentUser.warrior}! It shows your tournament registrations, joined date, and lets you pick a personalized theme.`
            : `You need to sign in first, brother! Click <strong>Sign In</strong> in the navbar.`;

    /* Admin */
    if (/admin|panel|dashboard/.test(q))
        return `The Admin Panel is accessible via the <strong>⚙ Admin</strong> gold button in the navbar, brother! It requires a username and password — it's restricted to authorized personnel only.`;

    /* Leaderboard */
    if (/leaderboard|ranking|top\s*player|who.*lead|champion/.test(q)) {
        if (!players.length) return "The leaderboard is loading, brother — scroll to the Leaderboard section to see the rankings!";
        const top = [...players].sort((a, b) => b.wins - a.wins)[0];
        return `👑 ${top.name} leads the leaderboard with ${top.wins} wins, brother! The leaderboard section lets you switch between rankings by Wins, K/D Ratio, and Hours played.`;
    }

    /* Tournament registration */
    if (/register|join.*tournament|enter.*battle|how.*join/.test(q))
        return `To join a tournament, scroll to the <strong>Tournament Registry</strong> section, brother! Fill in your warrior name, email, select a tournament, choose your payment method, and click "Enter Battle — Pay Now". The registration is saved to the database.`;

    /* Contact */
    if (/contact|reach|message|raven|support/.test(q))
        return `The Contact section is at the bottom of the page, brother! Fill in your name, email, subject, and message — then hit "Send Raven". There's also an interactive map showing our HQ location in Islamabad.`;

    /* Next match */
    if (/next\s*match|upcoming|who.*fight|next\s*battle/.test(q)) {
        const top = sorted.filter(p => p.rank === "Top");
        return top.length >= 2
            ? `The next clash will be between ${top[0].name} (${top[0].wins} wins) and ${top[1].name} (${top[1].wins} wins), brother — both Top-ranked warriors!`
            : `The ravens haven't whispered the next match schedule yet, brother!`;
    }

    /* Specific warrior */
    const warriorMatch = players.find(p => q.includes(p.name.toLowerCase()));
    if (warriorMatch) {
        const p = warriorMatch;
        const icon = p.rank === "Top" ? "👑" : p.rank === "Mid" ? "⚡" : "🛡";
        return `${icon} ${p.name} fights for ${p.game}! ${p.bio} Stats: ${p.wins} wins, ${p.kd} K/D, ${p.hours}h played. Rank: ${p.rank}. Achievements: ${p.achievements.join(", ")}.`;
    }
    if (/\bkratos\b/.test(q)) return replyFor("KRATOSXV", players, "👑");
    if (/\batreus\b/.test(q)) return replyFor("ATREUS_BOY", players, "👑");
    if (/\bthor\b/.test(q))   return replyFor("THOR_HAMMER", players, "👑");
    if (/\bfreya\b/.test(q))  return replyFor("FREYA_WAR", players, "👑");
    if (/\bbaldur\b/.test(q)) return replyFor("BALDUR_CURSE", players, "⚡");
    if (/\bmimir\b/.test(q) && !/bot|ai|chat/.test(q)) return replyFor("MIMIR_HEAD", players, "⚡");
    if (/\bthor\b/.test(q))   return replyFor("THOR_HAMMER", players, "👑");

    /* Stats queries */
    if (/most\s*wins|highest\s*wins|who.*win.*most/.test(q)) {
        const p = [...players].sort((a, b) => b.wins - a.wins)[0];
        return `👑 ${p.name} leads with ${p.wins} wins, brother! A fearsome record.`;
    }
    if (/k[\s/]?d|kill.*death|kd\s*ratio/.test(q)) {
        const p = [...players].sort((a, b) => parseFloat(b.kd) - parseFloat(a.kd))[0];
        return `⚔ ${p.name} holds the best K/D ratio at ${p.kd}, brother! Ruthless efficiency.`;
    }
    if (/most\s*hours|most\s*time|dedicated/.test(q)) {
        const p = [...players].sort((a, b) => parseInt(b.hours) - parseInt(a.hours))[0];
        return `⏳ ${p.name} has spent the most time in battle — ${p.hours} hours! Dedication worthy of Odin.`;
    }
    if (/top\s*rank|best\s*warrior|strongest/.test(q)) {
        const top  = sorted.filter(p => p.rank === "Top").map(p => `${p.name} (${p.wins}W)`).join(", ");
        return `👑 Top-ranked warriors: ${top}. Each one a legend, brother!`;
    }

    /* Map / realms */
    if (/map|realm|midgard|nine\s*realms?|location/.test(q))
        return `The Nine Realms map near the top shows 6 sacred locations — Wild Woods, The Mountain, Lake of Nine, Muspelheim, Niflheim, and the Asgard Gate. The Contact section also has a map showing our HQ in Islamabad!`;

    /* Theme / dark mode */
    if (/dark\s*mode|light\s*mode|theme|toggle/.test(q)) {
        const mode = document.body.classList.contains("light-mode") ? "Light" : "Dark";
        return `You are in ${mode} Mode, brother! Click the ☀️/🌙 button at the top-right to switch. If you're signed in, you can also pick a personalized accent colour in your Profile section.`;
    }

    /* About the site / chatbot */
    if (/who are you|what are you|chatbot|bot|about.*site|features/.test(q))
        return `I am MIMIR — the smartest man alive and your guide to the God of War Tournament Hub! The site has: a Warrior Registry with flip-cards, search & filter, a Leaderboard with 3 sort modes, Tournament Registration with payment gateway, a Contact section with map, Sign Up / Sign In with a Profile page, and an Admin Panel for management. What would you like to know, brother?`;

    /* Farewell */
    if (/bye|goodbye|farewell|thanks|thank you/.test(q))
        return `Fare thee well, brother! May your axe fly true. Return whenever you seek wisdom — Mimir's head is always here! ⚔`;

    /* Fallback */
    const rnd = players[Math.floor(Math.random() * players.length)];
    return `I've pondered your question, brother, but need more detail! Ask me about warriors, rankings, leaderboard, registration, the map, dark/light mode, sign-up, or the admin panel. Perhaps you'd like to know about ${rnd ? rnd.name : "Kratos"} instead?`;
}

function replyFor(name, players, icon) {
    const p = players.find(p => p.name === name);
    return p
        ? `${icon} ${p.name}! ${p.bio} ${p.wins} wins, ${p.kd} K/D. Rank: ${p.rank}.`
        : `${name} roams these halls but their entry eludes me, brother.`;
}

function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function clearChat() {
    mimirHistory = [];
    document.getElementById("chatLogs").innerHTML =
        `<div class="msg bot">Speak when you are ready, brother.</div>`;
    toggleChat();
}