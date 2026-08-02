document.addEventListener("DOMContentLoaded", () => {
    
    // Допоміжні функції для шляхів
    const getLogoPath = (teamName) => {
        if (!teamName) return "";
        const fileName = teamName.toLowerCase().replace(/\s+/g, '-') + ".png";
        return `logos/${fileName}`;
    };

    const getFlagPath = (countryName) => {
        if (!countryName) return "";
        const fileName = countryName.toLowerCase().replace(/\s+/g, '-') + ".png";
        return `flags/${fileName}`;
    };

    // --- 1. ГЕНЕРАЦІЯ КАЛЕНДАРЯ ---
    const calendarContainer = document.getElementById("calendar-container");
    if (calendarContainer && typeof calendar !== "undefined") {
        calendarContainer.innerHTML = ""; 
        calendar.forEach((race) => {
            const raceCard = document.createElement("div");
            raceCard.classList.add("race-card");

            const statusClass = race.status === "Completed" ? "status-completed" : "status-upcoming";
            const statusText = race.status === "Completed" ? "Completed" : "Upcoming";
            const sprintBadge = race.hasSprint ? `<span class="sprint-badge">SPRINT</span>` : "";

            raceCard.innerHTML = `
                <div class="race-header">
                    <span class="race-number">ROUND ${race.round}</span>
                    ${sprintBadge}
                    <span class="race-status ${statusClass}">${statusText}</span>
                </div>
                <div class="race-body">
                    <div class="race-flag-wrapper">
                        <img src="${getFlagPath(race.country)}" alt="${race.country}" class="race-flag-img" onerror="this.style.display='none'">
                    </div>
                    <div class="race-info">
                        <h3>${race.country.toUpperCase()}</h3>
                        <p>${race.track}</p>
                    </div>
                    <div class="race-date">${race.date}</div>
                </div>
            `;
            calendarContainer.appendChild(raceCard);
        });
    }

    // --- 2. ГЕНЕРАЦІЯ ІНТЕРАКТИВНИХ ВКЛАДОК КОМАНД (TEAMS) ---
    const teamsTabs = document.getElementById("teams-tabs");
    const teamDetails = document.getElementById("team-details");

    if (teamsTabs && teamDetails && typeof teams !== "undefined" && typeof drivers !== "undefined") {
        teamsTabs.innerHTML = "";

        function showTeamDetails(teamName) {
            const teamData = teams.find(t => t.name === teamName);
            if (!teamData) return;

            const teamDrivers = drivers.filter(d => d.team === teamName);

            let driversHTML = teamDrivers.map(d => `
                <div class="driver-card custom-card">
                    <div class="card-number">#${d.number}</div>
                    <div class="card-info">
                        <h3>${d.country} ${d.name}</h3>
                        <div class="driver-team-info">
                            <img src="${getLogoPath(d.team)}" alt="${d.team}" class="driver-team-logo" onerror="this.style.display='none'">
                            <span class="team-name">${d.team}</span>
                        </div>
                    </div>
                </div>
            `).join("");

            teamDetails.innerHTML = `
                <div class="team-detail-card">
                    <div class="team-detail-header">
                        <img src="${getLogoPath(teamData.name)}" alt="${teamData.name}" class="team-detail-logo" onerror="this.style.display='none'">
                        <h2>${teamData.name}</h2>
                    </div>
                    <h3 class="lineup-title">Склад пілотів:</h3>
                    <div class="team-drivers-grid">
                        ${driversHTML}
                    </div>
                </div>
            `;
        }

        teams.forEach((team, index) => {
            const tabBtn = document.createElement("button");
            tabBtn.classList.add("team-tab-btn");
            if (index === 0) tabBtn.classList.add("active");

            tabBtn.innerHTML = `
                <img src="${getLogoPath(team.name)}" alt="${team.name}" class="tab-logo" onerror="this.style.display='none'">
                <span>${team.name}</span>
            `;

            tabBtn.addEventListener("click", () => {
                document.querySelectorAll(".team-tab-btn").forEach(btn => btn.classList.remove("active"));
                tabBtn.classList.add("active");
                showTeamDetails(team.name);
            });

            teamsTabs.appendChild(tabBtn);
        });

        if (teams.length > 0) {
            showTeamDetails(teams[0].name);
        }
    }

    // --- 3. ГЕНЕРАЦІЯ STANDINGS (DRIVER & TEAM) ТА СЕСІЙ ---
    const stageSelect = document.getElementById("stage-select");
    const sessionSelectWrapper = document.getElementById("session-select-wrapper");
    const sessionSelect = document.getElementById("session-select");
    const tableHead = document.getElementById("table-head");
    const tableBody = document.getElementById("table-body");
    const standingsTitle = document.getElementById("standings-title");
    
    const driverTabBtn = document.getElementById("tab-driver-standings");
    const teamTabBtn = document.getElementById("tab-team-standings");

    let currentViewMode = "driver"; // "driver" або "team"

    if (stageSelect && tableHead && tableBody && typeof drivers !== "undefined" && typeof teams !== "undefined") {

        // Заповнення випадаючого списку етапів
        if (typeof raceResults !== "undefined") {
            stageSelect.innerHTML = `<option value="overall">Overall Season 1</option>`;
            raceResults.forEach(race => {
                const option = document.createElement("option");
                option.value = race.round;
                option.textContent = `Round ${race.round} - ${race.country}`;
                stageSelect.appendChild(option);
            });
        }

        // Головна функція рендеру таблиці
        function updateTable() {
            const selectedStage = stageSelect.value;
            const selectedSession = sessionSelect ? sessionSelect.value : "race";

            if (selectedStage === "overall") {
                if (sessionSelectWrapper) sessionSelectWrapper.style.display = "none";
                if (currentViewMode === "driver") {
                    renderDriverOverall();
                } else {
                    renderTeamOverall();
                }
            } else {
                if (sessionSelectWrapper) sessionSelectWrapper.style.display = "flex";
                if (currentViewMode === "driver") {
                    renderDriverSession(selectedStage, selectedSession);
                } else {
                    renderTeamSession(selectedStage, selectedSession);
                }
            }
        }

        // Наповнення доступних сесій при виборі етапу
        function populateSessions(roundNum) {
            if (!sessionSelect) return;
            const raceData = raceResults.find(r => r.round == roundNum);
            sessionSelect.innerHTML = "";

            if (!raceData || !raceData.sessions) return;

            const sessionLabels = {
                sprintQualifying: "Sprint Shootout",
                sprintRace: "Sprint Race",
                qualifying: "Qualifying",
                race: "Race"
            };

            Object.keys(raceData.sessions).forEach(sType => {
                const opt = document.createElement("option");
                opt.value = sType;
                opt.textContent = sessionLabels[sType] || sType.toUpperCase();
                sessionSelect.appendChild(opt);
            });

            if (raceData.sessions.race) {
                sessionSelect.value = "race";
            }
        }

        // --- DRIVER OVERALL (РУЧНЕ ВВЕДЕННЯ З DATA.JS) ---
        function renderDriverOverall() {
            if (standingsTitle) standingsTitle.innerHTML = "DRIVER <span>STANDINGS</span>";

            tableHead.innerHTML = `
                <tr>
                    <th>POS</th>
                    <th>NO</th>
                    <th>DRIVER</th>
                    <th>TEAM</th>
                    <th>PTS</th>
                    <th>WINS</th>
                    <th>POLES</th>
                    <th>RACES</th>
                    <th>DNF</th>
                    <th>PODIUMS</th>
                </tr>
            `;

            // Сортування пілотів за очками
            const sortedDrivers = [...drivers].sort((a, b) => (b.points || 0) - (a.points || 0));

            tableBody.innerHTML = sortedDrivers.map((d, index) => `
                <tr>
                    <td class="pos-cell">${index + 1}</td>
                    <td class="driver-no">#${d.number}</td>
                    <td class="driver-name-cell">${d.country} ${d.name}</td>
                    <td class="team-cell">
                        <img src="${getLogoPath(d.team)}" class="table-team-logo" onerror="this.style.display='none'">
                        <span>${d.team}</span>
                    </td>
                    <td class="pts-cell">${d.points || 0}</td>
                    <td>${d.wins || 0}</td>
                    <td>${d.poles || 0}</td>
                    <td>${d.races || 0}</td>
                    <td>${d.dnf || 0}</td>
                    <td>${d.podiums || 0}</td>
                </tr>
            `).join("");
        }

        // --- TEAM OVERALL (БЕРЕ ДАНІ ПРЯМО З МАСИВУ TEAMS) ---
        function renderTeamOverall() {
            if (standingsTitle) standingsTitle.innerHTML = "CONSTRUCTORS <span>STANDINGS</span>";

            tableHead.innerHTML = `
                <tr>
                    <th>POS</th>
                    <th>TEAM</th>
                    <th>PTS</th>
                    <th>WINS</th>
                    <th>PODIUMS</th>
                </tr>
            `;

            // Беремо дані з масиву teams (ігноруємо Reserve) та сортуємо за очками в порядку спадання
            const sortedTeams = teams
                .filter(t => t.name !== "Reserve")
                .sort((a, b) => (b.points || 0) - (a.points || 0));

            tableBody.innerHTML = sortedTeams.map((t, index) => `
                <tr>
                    <td class="pos-cell">${index + 1}</td>
                    <td class="team-cell">
                        <img src="${getLogoPath(t.name)}" class="table-team-logo" onerror="this.style.display='none'">
                        <strong>${t.name}</strong>
                    </td>
                    <td class="pts-cell">${t.points || 0}</td>
                    <td>${t.wins || 0}</td>
                    <td>${t.podiums || 0}</td>
                </tr>
            `).join("");
        }

        // --- DRIVER SESSION ---
        function renderDriverSession(roundNum, sessionType) {
            const raceData = raceResults.find(r => r.round == roundNum);
            if (!raceData || !raceData.sessions || !raceData.sessions[sessionType]) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Немає даних для сесії</td></tr>`;
                return;
            }

            if (standingsTitle) {
                standingsTitle.innerHTML = `ROUND ${raceData.round} <span>${raceData.country.toUpperCase()} (${sessionType.toUpperCase()})</span>`;
            }

            const isQualy = sessionType.toLowerCase().includes("qualifying");

            tableHead.innerHTML = `
                <tr>
                    <th>POS</th>
                    <th>NO</th>
                    <th>DRIVER</th>
                    <th>TEAM</th>
                    <th>TIME</th>
                    <th>GAP</th>
                    ${isQualy ? "" : "<th>PTS</th>"}
                </tr>
            `;

            const sessionData = raceData.sessions[sessionType];

            tableBody.innerHTML = sessionData.map(res => `
                <tr>
                    <td class="pos-cell">${res.pos}</td>
                    <td class="driver-no">#${res.number}</td>
                    <td class="driver-name-cell">${res.name}</td>
                    <td class="team-cell">
                        <img src="${getLogoPath(res.team)}" class="table-team-logo" onerror="this.style.display='none'">
                        <span>${res.team}</span>
                    </td>
                    <td>${res.time}</td>
                    <td>${res.gap}</td>
                    ${isQualy ? "" : `<td class="pts-cell">+${res.points || 0}</td>`}
                </tr>
            `).join("");
        }

        // --- TEAM SESSION ---
        function renderTeamSession(roundNum, sessionType) {
            const raceData = raceResults.find(r => r.round == roundNum);
            if (!raceData || !raceData.sessions || !raceData.sessions[sessionType]) {
                tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Немає даних для сесії</td></tr>`;
                return;
            }

            if (standingsTitle) {
                standingsTitle.innerHTML = `ROUND ${raceData.round} <span>${raceData.country.toUpperCase()} - TEAM (${sessionType.toUpperCase()})</span>`;
            }

            const sessionData = raceData.sessions[sessionType];
            const teamMap = {};

            teams.forEach(t => {
                if (t.name !== "Reserve") {
                    teamMap[t.name] = { name: t.name, points: 0, drivers: [] };
                }
            });

            sessionData.forEach(res => {
                if (teamMap[res.team]) {
                    teamMap[res.team].points += (res.points || 0);
                    teamMap[res.team].drivers.push(`${res.name} (P${res.pos})`);
                }
            });

            const sortedTeams = Object.values(teamMap).sort((a, b) => b.points - a.points);
            const isQualy = sessionType.toLowerCase().includes("qualifying");

            tableHead.innerHTML = `
                <tr>
                    <th>POS</th>
                    <th>TEAM</th>
                    <th>DRIVERS IN SESSION</th>
                    ${isQualy ? "" : "<th>SESSION PTS</th>"}
                </tr>
            `;

            tableBody.innerHTML = sortedTeams.map((t, index) => `
                <tr>
                    <td class="pos-cell">${index + 1}</td>
                    <td class="team-cell">
                        <img src="${getLogoPath(t.name)}" class="table-team-logo" onerror="this.style.display='none'">
                        <strong>${t.name}</strong>
                    </td>
                    <td>${t.drivers.join(", ") || "—"}</td>
                    ${isQualy ? "" : `<td class="pts-cell">+${t.points}</td>`}
                </tr>
            `).join("");
        }

        // --- ОБРОБНИКИ ПОДІЙ ---
        if (driverTabBtn && teamTabBtn) {
            driverTabBtn.addEventListener("click", () => {
                driverTabBtn.classList.add("active");
                teamTabBtn.classList.remove("active");
                currentViewMode = "driver";
                updateTable();
            });

            teamTabBtn.addEventListener("click", () => {
                teamTabBtn.classList.add("active");
                driverTabBtn.classList.remove("active");
                currentViewMode = "team";
                updateTable();
            });
        }

        stageSelect.addEventListener("change", () => {
            if (stageSelect.value !== "overall") {
                populateSessions(stageSelect.value);
            }
            updateTable();
        });

        if (sessionSelect) {
            sessionSelect.addEventListener("change", updateTable);
        }

        // Перший рендер
        updateTable();
    }
});