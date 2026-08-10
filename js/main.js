// index.html: ゲーム一覧 + フィルター

const UNKNOWN_MARK = "不明";
// これらのいずれかが「不明」のゲームはデータ未整備として検索一覧に出さない
const SPEC_FIELDS = [
  "genre",
  "minPlayers",
  "maxPlayers",
  "recommendedPlayers",
  "playTime",
  "ageRange",
  "difficulty",
];

let allGames = [];

const gameGrid = document.getElementById("gameGrid");
const resultCount = document.getElementById("resultCount");
const searchName = document.getElementById("searchName");
const filterGenre = document.getElementById("filterGenre");
const filterPlayers = document.getElementById("filterPlayers");
const filterTime = document.getElementById("filterTime");
const filterDifficulty = document.getElementById("filterDifficulty");
const resetFiltersBtn = document.getElementById("resetFilters");

init();

async function init() {
  try {
    allGames = await apiGet({ action: "getGames" });
  } catch (err) {
    gameGrid.innerHTML = `<p class="empty-state">ゲーム情報の取得に失敗しました。</p>`;
    console.error(err);
    return;
  }

  allGames = allGames.filter((g) => !hasUnknownSpec(g));

  buildFilterOptions(allGames);
  render();

  [filterGenre, filterPlayers, filterTime, filterDifficulty].forEach((el) =>
    el.addEventListener("change", render)
  );
  searchName.addEventListener("input", render);
  resetFiltersBtn.addEventListener("click", () => {
    searchName.value = "";
    filterGenre.value = "";
    filterPlayers.value = "";
    filterTime.value = "";
    filterDifficulty.value = "";
    render();
  });
}

// ジャンル・難易度はデータから動的に選択肢を生成する
function buildFilterOptions(games) {
  const genres = uniqueSorted(games.map((g) => g.genre));
  const difficulties = uniqueSorted(games.map((g) => g.difficulty));

  genres.forEach((g) => filterGenre.appendChild(new Option(g, g)));
  difficulties.forEach((d) => filterDifficulty.appendChild(new Option(d, d)));
}

function hasUnknownSpec(game) {
  return SPEC_FIELDS.some((key) => String(game[key] ?? "").includes(UNKNOWN_MARK));
}

function uniqueSorted(values) {
  return [...new Set(values.filter((v) => v !== undefined && v !== null && v !== ""))].sort(
    (a, b) => String(a).localeCompare(String(b), "ja")
  );
}

// "30~150分" のような文字列から { min, max } を取り出す
function parsePlayTime(text) {
  if (!text) return null;
  const nums = String(text).match(/\d+/g);
  if (!nums) return null;
  if (nums.length === 1) return { min: Number(nums[0]), max: Number(nums[0]) };
  return { min: Number(nums[0]), max: Number(nums[1]) };
}

function isAvailable(value) {
  return value === true || String(value).toUpperCase() === "TRUE" || value === "貸出可";
}

function matchesFilters(game) {
  const keyword = searchName.value.trim().toLowerCase();
  if (keyword) {
    const target = `${game.name || ""} ${game.officialName || ""}`.toLowerCase();
    if (!target.includes(keyword)) return false;
  }

  if (filterGenre.value && game.genre !== filterGenre.value) return false;
  if (filterDifficulty.value && game.difficulty !== filterDifficulty.value) return false;

  if (filterPlayers.value) {
    const n = Number(filterPlayers.value);
    const min = Number(game.minPlayers) || 0;
    const max = Number(game.maxPlayers) || Infinity;
    if (n === 8) {
      if (max < 8) return false;
    } else if (n < min || n > max) {
      return false;
    }
  }

  if (filterTime.value) {
    const threshold = Number(filterTime.value);
    const time = parsePlayTime(game.playTime);
    if (!time) return false;
    if (threshold === 121) {
      if (time.max < 120) return false;
    } else if (time.min > threshold) {
      return false;
    }
  }

  return true;
}

function thumbUrl(imageId) {
  if (!imageId) return "";
  if (/^https?:\/\//.test(imageId)) return imageId;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(imageId)}&sz=w400`;
}

function render() {
  const filtered = allGames.filter(matchesFilters);
  resultCount.textContent = `${filtered.length} 件のゲームが見つかりました`;

  if (filtered.length === 0) {
    gameGrid.innerHTML = `<p class="empty-state">条件に合うゲームが見つかりませんでした。</p>`;
    return;
  }

  gameGrid.innerHTML = filtered.map(cardHtml).join("");
}

function cardHtml(game) {
  const available = isAvailable(game.available);
  const img = thumbUrl(game.imageId);
  const imgTag = img
    ? `<img class="thumb" src="${img}" alt="${escapeHtml(game.name)}" loading="lazy">`
    : `<div class="thumb"></div>`;

  return `
    <a class="game-card" href="game.html?id=${encodeURIComponent(game.id)}">
      ${imgTag}
      <div class="card-body">
        <span class="badge ${available ? "available" : "unavailable"}">
          ${available ? "貸出可" : "貸出中"}
        </span>
        <div class="card-title">${escapeHtml(game.name)}</div>
        <div class="card-meta">${escapeHtml(game.genre || "")}</div>
        <div class="card-meta">${escapeHtml(game.recommendedPlayers || "")} / ${escapeHtml(game.playTime || "")}</div>
        <div class="card-meta">難易度: ${escapeHtml(game.difficulty || "-")}</div>
      </div>
    </a>
  `;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
