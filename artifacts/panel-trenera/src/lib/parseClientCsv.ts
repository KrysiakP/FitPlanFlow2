/** Reads a list of people to invite from CSV text (comma, semicolon or tab separated, header optional). */

export interface CsvInviteRow {
  email: string;
  firstName: string | null;
}

export interface CsvInviteParseResult {
  rows: CsvInviteRow[];
  problems: { line: number; text: string; reason: string }[];
  truncated: boolean;
}

export const MAX_CSV_INVITES = 100;

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(sample: string): string {
  const counts = [";", "\t", ","].map((delimiter) => ({ delimiter, count: sample.split(delimiter).length - 1 }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ",";
}

export function parseClientCsv(text: string): CsvInviteParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const result: CsvInviteParseResult = { rows: [], problems: [], truncated: false };
  const firstFilled = lines.find((line) => line.trim() !== "");
  if (!firstFilled) return result;
  const delimiter = detectDelimiter(firstFilled);

  let emailColumn = -1;
  let nameColumn = -1;
  const seen = new Set<string>();

  lines.forEach((raw, index) => {
    if (raw.trim() === "") return;
    const cells = splitLine(raw, delimiter);

    // header row: names the columns, so the order does not matter
    if (emailColumn === -1 && cells.some((cell) => /^(e-?mail|adres e-?mail|email)$/i.test(cell))) {
      emailColumn = cells.findIndex((cell) => /^(e-?mail|adres e-?mail|email)$/i.test(cell));
      nameColumn = cells.findIndex((cell) => /^(imi[eę]|first ?name|name)$/i.test(cell));
      return;
    }
    if (emailColumn === -1) {
      // no header: the first cell that looks like an address is the e-mail, the cell next to it the name
      emailColumn = Math.max(cells.findIndex((cell) => EMAIL.test(cell)), 0);
      nameColumn = emailColumn === 0 ? 1 : 0;
    }

    const email = (cells[emailColumn] ?? "").toLowerCase();
    const firstName = (cells[nameColumn] ?? "").trim() || null;
    if (!EMAIL.test(email)) {
      result.problems.push({ line: index + 1, text: raw.trim().slice(0, 60), reason: "to nie wygląda na adres e-mail" });
      return;
    }
    if (seen.has(email)) {
      result.problems.push({ line: index + 1, text: email, reason: "ten adres już jest na liście" });
      return;
    }
    if (result.rows.length >= MAX_CSV_INVITES) {
      result.truncated = true;
      return;
    }
    seen.add(email);
    result.rows.push({ email, firstName: firstName && !EMAIL.test(firstName) ? firstName.slice(0, 100) : null });
  });
  return result;
}
