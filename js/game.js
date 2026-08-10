// game.html: ゲーム詳細 + コメント

const gameId = new URLSearchParams(location.search).get("id");

const gameDetailEl = document.getElementById("gameDetail");
const commentListEl = document.getElementById("commentList");
const commentForm = document.getElementById("commentForm");
const formMessageEl = document.getElementById("formMessage");

init();

async function init() {
  if (!gameId) {
    gameDetailEl.innerHTML = `<p class="empty-state">ゲームが指定されていません。</p>`;
    return;
  }

  await Promise.all([loadGame(), loadComments()]);

  commentForm.addEventListener("submit", onSubmitComment);
}

async function loadGame() {
  let games;
  try {
    games = await apiGet({ action: "getGames" });
  } catch (err) {
    gameDetailEl.innerHTML = `<p class="empty-state">ゲーム情報の取得に失敗しました。</p>`;
    console.error(err);
    return;
  }

  const game = games.find((g) => String(g.id) === String(gameId));
  if (!game) {
    gameDetailEl.innerHTML = `<p class="empty-state">ゲームが見つかりませんでした。</p>`;
    return;
  }

  document.title = `${game.name} | がるカフェ`;
  gameDetailEl.innerHTML = detailHtml(game);
}

function detailHtml(game) {
  const available = isAvailable(game.available);
  const img = thumbUrl(game.imageId);
  const imgTag = img
    ? `<img class="detail-thumb" src="${img}" alt="${escapeHtml(game.name)}">`
    : `<div class="detail-thumb"></div>`;

  const youtubeEmbed = youtubeEmbedUrl(game.youtubeUrl);

  return `
    <div class="game-detail">
      ${imgTag}
      <div>
        <span class="badge ${available ? "available" : "unavailable"}">
          ${available ? "貸出可" : "貸出中"}
        </span>
        <h2>${escapeHtml(game.name)}</h2>
        ${game.officialName ? `<p class="card-meta">正式名称: ${escapeHtml(game.officialName)}</p>` : ""}

        <table class="spec-table">
          <tr><th>ジャンル</th><td>${escapeHtml(game.genre || "-")}</td></tr>
          <tr><th>推奨人数</th><td>${escapeHtml(game.recommendedPlayers || "-")}</td></tr>
          <tr><th>プレイ人数</th><td>${escapeHtml(game.minPlayers ?? "-")}〜${escapeHtml(game.maxPlayers ?? "-")}人</td></tr>
          <tr><th>プレイ時間</th><td>${escapeHtml(game.playTime || "-")}</td></tr>
          <tr><th>対象年齢</th><td>${escapeHtml(game.ageRange || "-")}</td></tr>
          <tr><th>難易度</th><td>${escapeHtml(game.difficulty || "-")}</td></tr>
        </table>

        ${game.description ? `<p>${escapeHtml(game.description)}</p>` : ""}

        ${youtubeEmbed ? `
          <div class="youtube-wrap">
            <iframe src="${youtubeEmbed}" title="紹介動画" allowfullscreen></iframe>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

async function loadComments() {
  let comments;
  try {
    comments = await apiGet({ action: "getComments", gameId });
  } catch (err) {
    commentListEl.innerHTML = `<p class="empty-state">コメントの取得に失敗しました。</p>`;
    console.error(err);
    return;
  }

  if (!comments || comments.length === 0) {
    commentListEl.innerHTML = `<p class="empty-state">まだコメントはありません。</p>`;
    return;
  }

  commentListEl.innerHTML = comments
    .slice()
    .reverse()
    .map(commentHtml)
    .join("");
}

function commentHtml(c) {
  const rating = Number(c.rating) || 0;
  const stars = "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
  return `
    <div class="comment-item">
      <div class="comment-head">
        <span>${escapeHtml(c.name || "匿名")}</span>
        <span>${escapeHtml(c.date || "")}</span>
      </div>
      <div class="stars">${stars}</div>
      <p>${escapeHtml(c.text || "")}</p>
    </div>
  `;
}

async function onSubmitComment(e) {
  e.preventDefault();
  formMessageEl.textContent = "";
  formMessageEl.className = "form-message";

  const name = document.getElementById("commentName").value.trim();
  const rating = document.getElementById("commentRating").value;
  const text = document.getElementById("commentText").value.trim();

  if (!name || !text) {
    formMessageEl.textContent = "お名前とコメントを入力してください。";
    formMessageEl.className = "form-message error";
    return;
  }

  const submitBtn = commentForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;

  try {
    await apiPost({
      action: "postComment",
      gameId,
      name,
      text,
      rating,
      date: new Date().toISOString().slice(0, 10),
    });
    commentForm.reset();
    document.getElementById("commentRating").value = "3";
    formMessageEl.textContent = "コメントを投稿しました。";
    formMessageEl.className = "form-message success";
    await loadComments();
  } catch (err) {
    console.error(err);
    formMessageEl.textContent = "投稿に失敗しました。時間をおいて再度お試しください。";
    formMessageEl.className = "form-message error";
  } finally {
    submitBtn.disabled = false;
  }
}

function thumbUrl(imageId) {
  if (!imageId) return "";
  if (/^https?:\/\//.test(imageId)) return imageId;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(imageId)}&sz=w600`;
}

function isAvailable(value) {
  return value === true || String(value).toUpperCase() === "TRUE" || value === "貸出可";
}

// 通常のYouTube URL / 短縮URLどちらからも動画IDを取り出し、埋め込み用URLを作る
function youtubeEmbedUrl(url) {
  if (!url) return "";
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return "";
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
