import type { AtRiskInputRow } from "@/lib/types";

export function parseRiskCsv(text: string, sourceName = "upload.csv"): { sourceName: string; rows: AtRiskInputRow[] } {
  const rows: AtRiskInputRow[] = [];

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parts = trimmed.split(",").map((part) => part.trim());
    if (index === 0 && parts[0]?.toLowerCase().includes("student")) {
      continue;
    }
    const [studentNumber, attended, total, score, maxScore] = parts;
    if (!studentNumber || !attended || !total || !score || !maxScore) {
      throw new Error("Each row must be student_number,attended,total,score,max_score.");
    }
    const numericValues = [attended, total, score, maxScore].map(Number);
    if (numericValues.some((item) => !Number.isFinite(item))) {
      throw new Error("Attendance and assessment values must be numbers.");
    }
    rows.push({
      student_number: studentNumber,
      attended: numericValues[0],
      total: numericValues[1],
      score: numericValues[2],
      max_score: numericValues[3],
      label: sourceName,
    });
  }

  if (rows.length === 0) {
    throw new Error("Add at least one student row.");
  }

  return { sourceName, rows };
}

export async function readRiskCsvFile(file: File): Promise<{ sourceName: string; rows: AtRiskInputRow[] }> {
  const text = await file.text();
  return parseRiskCsv(text, file.name);
}
