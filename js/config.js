// 共通設定
// Google Apps Script のウェブアプリ URL（デプロイ後に書き換えてください）
const API_URL = "https://script.google.com/macros/s/AKfycbwPD--d92BdReb2cB57Va02UI18q5hac5QbvBYzxHuP5QoNpVOCkuZW0w81gROI5Vfl/exec";

/*
 Apps Script 側が返す想定のJSON形式（このフロントエンドはこの形を前提に実装しています）

 [GET] ?action=getGames
   -> [{
        id, name, officialName, genre,
        minPlayers, maxPlayers, recommendedPlayers,
        playTime,        // "30~150分" のような文字列
        ageRange, difficulty,
        imageId, youtubeUrl, description,
        available        // true/false または "TRUE"/"FALSE"
      }, ...]

 [GET] ?action=getComments&gameId=xxx
   -> 指定ゲームのコメント一覧
 [GET] ?action=getComments（gameId省略）
   -> 全コメント一覧（admin.html で使用）
   -> [{ gameId, name, text, rating, date }, ...]
      ※ 行を特定できるID列がある場合は id / row も返してよい（あれば利用する）

 [POST] { action: "postComment", gameId, name, text, rating, date }
   -> { success: true } 等
*/

// GET リクエスト共通ヘルパー
async function apiGet(params) {
  const url = new URL(API_URL);
  Object.keys(params || {}).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      url.searchParams.set(key, params[key]);
    }
  });
  const res = await fetch(url.toString());
  return res.json();
}

// POST リクエスト共通ヘルパー
// Content-Type を text/plain にすることで CORS プリフライト(OPTIONS)を回避する
// （Apps Script 側では e.postData.contents を JSON.parse して受け取る想定）
async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return res.json();
}