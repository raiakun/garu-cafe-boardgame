// admin.html: コメント確認（削除はスプレッドシートを手動編集）

// パスワードの正解はここには置かない。入力値を Apps Script に送り、
// サーバー側（スクリプト プロパティ ADMIN_PASSWORD）で照合してもらう。

const loginGate = document.getElementById("loginGate");
const loginBtn = document.getElementById("loginBtn");
const adminContent = document.getElementById("adminContent");
const resultCountEl = document.getElementById("resultCount");
const tableBody = document.getElementById("commentTableBody");

loginBtn.addEventListener("click", async () => {
  const input = window.prompt("管理者パスワードを入力してください");
  if (input === null) return;

  loginBtn.disabled = true;
  const ok = await loadComments(input);
  loginBtn.disabled = false;

  if (ok) {
    loginGate.style.display = "none";
    adminContent.style.display = "block";
  } else {
    window.alert("パスワードが違います。");
  }
});

// 戻り値: パスワードが正しく表示できたら true、それ以外は false
async function loadComments(password) {
  tableBody.innerHTML = `<tr><td colspan="7">読み込み中...</td></tr>`;

  let games = [];
  let comments = [];
  try {
    [games, comments] = await Promise.all([
      apiGet({ action: "getGames" }),
      apiGet({ action: "getComments", password }),
    ]);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7">読み込みに失敗しました。</td></tr>`;
    console.error(err);
    return false;
  }

  if (comments && comments.error === "unauthorized") {
    return false;
  }

  const gameNameById = new Map(games.map((g) => [String(g.id), g.name]));

  resultCountEl.textContent = `${comments.length} 件のコメント`;

  if (comments.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7">コメントはまだありません。</td></tr>`;
    return true;
  }

  tableBody.innerHTML = comments.map((c, i) => rowHtml(c, i, gameNameById)).join("");

  tableBody.querySelectorAll("button[data-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = comments[Number(btn.dataset.index)];
      showDeleteGuide(c);
    });
  });

  return true;
}

function rowHtml(c, index, gameNameById) {
  const gameName = gameNameById.get(String(c.gameId)) || "(不明)";
  const stars = "★".repeat(Number(c.rating) || 0);
  return `
    <tr>
      <td>${escapeHtml(c.gameId)}</td>
      <td>${escapeHtml(gameName)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(stars || c.rating)}</td>
      <td>${escapeHtml(c.text)}</td>
      <td>${escapeHtml(c.date)}</td>
      <td><button type="button" data-index="${index}">削除</button></td>
    </tr>
  `;
}

// コメントには一意なIDが無い想定のため、行を特定できる情報を案内する
// （API側が id / row を返す場合はそれを優先して表示する）
function showDeleteGuide(c) {
  const identifier = c.id ?? c.row;
  const lines = identifier
    ? [`ID: ${identifier}`]
    : [
        `ゲームID: ${c.gameId}`,
        `投稿者: ${c.name}`,
        `投稿日: ${c.date}`,
        `コメント: ${c.text}`,
      ];

  window.alert(
    "このコメントの行をスプレッドシート（comments シート）から手動で削除してください。\n\n" +
      lines.join("\n")
  );
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
