#!/usr/bin/env node
// 文体統計レポート。docs配下のMarkdownから「反復の兆候」を測って報告する。
//
// WRITING_GUIDE.md「機械による検出」の第3層にあたる。prhが既知の癖を列挙で
// 見つけるのに対し、このツールは何が反復しているかを事前に知らなくても、
// 反復そのものを観測する。出力は警告ではなく観測であり、直すかどうかは
// 通読の2問（説明が前進しているか・流れが自然か）に照らして判断する。
//
// 使い方:
//   npm run style:stats                       # docs配下すべて
//   npm run style:stats -- docs/13-claude.md  # ファイル指定

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// しきい値。観測ノイズが多い／少ないと感じたらここを調整する
const WORD_MIN_PER_FILE = 8; // 章内の頻出語として報告する最小回数
const WORD_TOP_PER_FILE = 8; // 章内の頻出語の表示件数
const CROSS_WORD_MIN_TOTAL = 20; // 横断頻出語として報告する最小合計回数
const CROSS_WORD_MIN_FILES = 5; // 横断頻出語として報告する最小ファイル数
const TAIL_LEN = 7; // 文末の型として比較する文字数
const TAIL_MIN = 4; // 文末の型を報告する最小回数
const OPENER_LEN = 12; // 節の冒頭文の型として比較する文字数
const CLOSER_LEN = 10; // 節の締め文の型として比較する文字数
const BOLD_MAX_PER_SECTION = 2; // 量の目安: 太字は1節0〜2箇所
const SUMMARY_MAX_ITEMS = 4; // 量の目安: まとめは4点以内

const args = process.argv.slice(2).filter((a) => a !== "--");
const files =
  args.length > 0
    ? args
    : readdirSync("docs")
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map((f) => join("docs", f));

// ---- 前処理 -----------------------------------------------------------

// コードブロック・HTMLコメント・インラインコード・URLを落とし、本文だけ残す
function stripNonProse(src) {
  return src
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<https?:\/\/[^>]*>/g, "")
    .replace(/https?:\/\/\S+/g, "");
}

// H2・H3見出しで節・小節に分割する。最初の見出しより前はリード扱い。
// 量の目安（太字0〜2など）も、締め文の型も、この粒度で観測する
function splitSections(text) {
  const sections = [];
  let current = { title: "（リード）", lines: [] };
  for (const line of text.split("\n")) {
    const m = line.match(/^#{2,3}\s+(.+)/);
    if (m && !/^####/.test(line)) {
      sections.push(current);
      current = { title: m[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

// 地の文（表・見出し・箇条書き記号を除いた本文）から文を取り出す
function sentencesOf(lines) {
  const prose = lines
    .filter((l) => !/^\s*[|#]/.test(l))
    .map((l) => l.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""))
    .join("\n");
  return prose
    .split("。")
    .map((s) => s.replace(/\s+/g, "").trim())
    .filter((s) => s.length >= 8);
}

// 内容語の抽出: 漢字の連なり（2文字以上）とカタカナ語（3文字以上）
function contentWords(text) {
  const words = [];
  for (const m of text.matchAll(/[々一-鿿]{2,}/g)) words.push(m[0]);
  for (const m of text.matchAll(/[ァ-ヺー]{3,}/g)) words.push(m[0]);
  return words;
}

function tally(items) {
  const map = new Map();
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1);
  return map;
}

function sortedEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

// ---- 解析 -------------------------------------------------------------

const crossWordTotal = new Map(); // 語 → 合計回数
const crossWordFiles = new Map(); // 語 → 出現ファイル数

let anyFinding = false;

for (const file of files) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    console.error(`読み込めません: ${file}`);
    continue;
  }
  const text = stripNonProse(src);
  // 参考節はURLと最終確認日の列挙なので、文体の観測対象から外す
  const sections = splitSections(text).filter((s) => s.title !== "参考");
  const bodyText = sections.map((s) => s.lines.join("\n")).join("\n");
  const findings = [];

  // 1. 章内の頻出語
  const wordCounts = tally(contentWords(bodyText));
  for (const [w, c] of wordCounts) {
    crossWordTotal.set(w, (crossWordTotal.get(w) ?? 0) + c);
    crossWordFiles.set(w, (crossWordFiles.get(w) ?? 0) + 1);
  }
  const topWords = sortedEntries(wordCounts)
    .filter(([, c]) => c >= WORD_MIN_PER_FILE)
    .slice(0, WORD_TOP_PER_FILE);
  if (topWords.length > 0) {
    findings.push(
      `頻出語: ${topWords.map(([w, c]) => `${w}(${c})`).join(" / ")}`,
    );
  }

  // 2. 文末の型の反復。日付・数値の括弧書き（最終確認など）はノイズなので除く
  const tails = tally(
    sentencesOf(bodyText.split("\n"))
      .map((s) => s.slice(-TAIL_LEN))
      .filter((t) => !/[0-9０-９]/.test(t)),
  );
  const repeatedTails = sortedEntries(tails).filter(([, c]) => c >= TAIL_MIN);
  for (const [t, c] of repeatedTails) {
    findings.push(`文末の型「〜${t}。」が ${c} 回`);
  }

  // 3. 節の冒頭文・締め文の型の重複
  const openers = new Map();
  const closers = new Map();
  for (const sec of sections) {
    const ss = sentencesOf(sec.lines);
    if (ss.length === 0) continue;
    const op = ss[0].slice(0, OPENER_LEN);
    const cl = ss[ss.length - 1].slice(-CLOSER_LEN);
    (openers.get(op) ?? openers.set(op, []).get(op)).push(sec.title);
    if (!/[0-9０-９]/.test(cl)) {
      (closers.get(cl) ?? closers.set(cl, []).get(cl)).push(sec.title);
    }
  }
  for (const [op, titles] of openers) {
    if (titles.length >= 2)
      findings.push(`節の冒頭が同型「${op}…」: ${titles.join(" / ")}`);
  }
  for (const [cl, titles] of closers) {
    if (titles.length >= 2)
      findings.push(`節の締めが同型「…${cl}。」: ${titles.join(" / ")}`);
  }

  // 4. 節ごとの太字の数（コード・コメント除去後の本文で数える）
  for (const sec of sections) {
    const bolds = sec.lines.join("\n").match(/\*\*[^*\n]+\*\*/g) ?? [];
    if (bolds.length > BOLD_MAX_PER_SECTION) {
      findings.push(`節「${sec.title}」の太字が ${bolds.length} 箇所（目安は0〜2）`);
    }
  }

  // 5. まとめの点数
  for (const sec of sections) {
    if (!sec.title.includes("まとめ")) continue;
    const items = sec.lines.filter((l) => /^- /.test(l)).length;
    if (items > SUMMARY_MAX_ITEMS) {
      findings.push(`「${sec.title}」が ${items} 点（目安は4点以内）`);
    }
  }

  if (findings.length > 0) {
    anyFinding = true;
    console.log(`\n## ${file}`);
    for (const f of findings) console.log(`- ${f}`);
  }
}

// ---- 横断レポート -----------------------------------------------------

if (files.length > 1) {
  const cross = sortedEntries(crossWordTotal).filter(
    ([w, total]) =>
      total >= CROSS_WORD_MIN_TOTAL &&
      (crossWordFiles.get(w) ?? 0) >= CROSS_WORD_MIN_FILES,
  );
  if (cross.length > 0) {
    anyFinding = true;
    console.log("\n## 章をまたぐ頻出語（上位20）");
    console.log(
      "製品名・主題語が上位に来るのは正常。比喩・評価・つなぎの語が混じっていないかを見る。",
    );
    for (const [w, total] of cross.slice(0, 20)) {
      console.log(`- ${w}: 計${total}回 / ${crossWordFiles.get(w)}ファイル`);
    }
  }
}

if (!anyFinding) {
  console.log("報告する観測はありません。");
}
