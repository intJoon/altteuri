import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, '$1<a href="$2">$2</a>');
}

function isTableDivider(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function tableCells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
}

function startsBlock(lines, index) {
  const line = lines[index] || "";
  const next = lines[index + 1] || "";
  return !line.trim()
    || /^#{1,6}\s/.test(line)
    || /^>\s?/.test(line)
    || /^---+$/.test(line.trim())
    || /^[-*]\s+/.test(line)
    || /^\d+\.\s+/.test(line)
    || (line.includes("|") && isTableDivider(next));
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      output.push("<hr>");
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const parts = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        parts.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      output.push(`<blockquote>${parts.map(part => `<p>${inline(part)}</p>`).join("")}</blockquote>`);
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] || "")) {
      const headers = tableCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      output.push(`<div class="table-wrap"><table><thead><tr>${headers.map(cell => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const tag = unordered ? "ul" : "ol";
      const pattern = unordered ? /^[-*]\s+(.+)$/ : /^\d+\.\s+(.+)$/;
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(pattern);
        if (!match) break;
        let content = inline(match[1]);
        index += 1;
        const nested = [];
        while (index < lines.length) {
          const nestedMatch = lines[index].match(/^\s{2,}[-*]\s+(.+)$/);
          if (!nestedMatch) break;
          nested.push(`<li>${inline(nestedMatch[1])}</li>`);
          index += 1;
        }
        if (nested.length) content += `<ul>${nested.join("")}</ul>`;
        items.push(`<li>${content}</li>`);
      }
      output.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !startsBlock(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }

  return output.join("\n");
}

const privacy = readFileSync(join(root, "docs", "개인정보처리방침.md"), "utf8");
const terms = readFileSync(join(root, "docs", "이용약관.md"), "utf8");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>알뜰이 · 개인정보처리방침 및 이용약관</title>
  <style>
    :root { --blue:#346aff; --ink:#212b36; --muted:#68717c; --line:#e7e9ed; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; background:#f5f6f8; color:var(--ink); font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","Malgun Gothic",sans-serif; }
    .wrap { max-width:900px; margin:0 auto; padding:32px 20px 64px; }
    .hero,.card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:26px; margin-bottom:20px; }
    .brand { display:flex; align-items:center; gap:12px; }
    .brand img { width:44px; height:44px; }
    .brand h1 { margin:0; font-size:22px; }
    .hero > p { color:var(--muted); margin:10px 0 0; }
    nav { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
    nav a { color:#fff; background:var(--blue); border-radius:8px; padding:7px 14px; text-decoration:none; font-weight:700; font-size:13px; }
    .card h2 { margin:0 0 16px; padding-bottom:12px; border-bottom:2px solid var(--blue); font-size:22px; }
    .card h3 { margin:28px 0 8px; font-size:18px; }
    .card h4 { margin:22px 0 6px; font-size:16px; }
    p { margin:8px 0; }
    blockquote { margin:0 0 18px; padding:10px 14px; color:var(--muted); background:#f7f8fa; border-left:3px solid var(--blue); }
    blockquote p { margin:2px 0; }
    ul,ol { padding-left:24px; }
    li { margin:5px 0; }
    code { padding:2px 5px; background:#f1f3f5; border-radius:4px; font-size:.92em; }
    a { color:var(--blue); overflow-wrap:anywhere; }
    hr { border:0; border-top:1px solid var(--line); margin:28px 0; }
    .table-wrap { overflow-x:auto; margin:12px 0; }
    table { width:100%; border-collapse:collapse; min-width:620px; font-size:14px; }
    th,td { border:1px solid var(--line); padding:9px 10px; text-align:left; vertical-align:top; }
    th { background:#f7f8fa; }
    footer { text-align:center; color:var(--muted); font-size:12px; }
    @media (max-width:600px) { .wrap { padding:16px 10px 40px; } .hero,.card { padding:20px 16px; border-radius:10px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <div class="brand"><img src="icon128.png" alt="알뜰이 아이콘"><h1>알뜰이 법적 고지</h1></div>
      <p>알뜰이의 개인정보처리방침과 이용약관입니다.</p>
      <nav><a href="#privacy">개인정보처리방침</a><a href="#terms">이용약관</a></nav>
    </header>
    <section class="card" id="privacy">${markdownToHtml(privacy)}</section>
    <section class="card" id="terms">${markdownToHtml(terms)}</section>
  </div>
</body>
</html>
`;

writeFileSync(join(root, "legal.html"), html, "utf8");
writeFileSync(join(root, "web", "public", "legal.html"), html, "utf8");
