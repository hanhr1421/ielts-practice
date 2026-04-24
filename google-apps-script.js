// ============================================================
// IELTS Practice Hub — Google Apps Script
// Paste this into script.google.com, deploy as Web App
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── SCORES SHEET ──────────────────────────────────────────
    var scoresSheet = ss.getSheetByName("Scores");
    if (!scoresSheet) {
      scoresSheet = ss.insertSheet("Scores");
      scoresSheet.appendRow([
        "Timestamp", "Student Name", "Section", "Unit/Task",
        "Score", "Total", "Percentage (%)", "Notes"
      ]);
      // Format header row
      scoresSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#1a6e6e").setFontColor("white");
      scoresSheet.setFrozenRows(1);
    }

    // Append the score row
    scoresSheet.appendRow([
      new Date(data.timestamp || new Date()),
      data.name || "Unknown",
      data.section || "Vocab/Grammar",
      data.unit || "Unit ?",
      data.correct || 0,
      data.total || 0,
      data.pct || 0,
      data.notes || ""
    ]);

    // ── WRITING SUBMISSIONS SHEET ─────────────────────────────
    if (data.section === "Writing" && data.writingText) {
      var writingSheet = ss.getSheetByName("Writing Submissions");
      if (!writingSheet) {
        writingSheet = ss.insertSheet("Writing Submissions");
        writingSheet.appendRow([
          "Timestamp", "Student Name", "Task", "Prompt", "Submission", "Teacher Feedback", "Band Score"
        ]);
        writingSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#c8402a").setFontColor("white");
        writingSheet.setFrozenRows(1);
        writingSheet.setColumnWidth(5, 400); // Wide column for submission text
        writingSheet.setColumnWidth(6, 250); // Wide column for feedback
      }
      writingSheet.appendRow([
        new Date(data.timestamp || new Date()),
        data.name || "Unknown",
        data.unit || "Task ?",
        data.prompt || "",
        data.writingText || "",
        "", // Teacher feedback — fill manually
        ""  // Band score — fill manually
      ]);
    }

    // ── SUMMARY SHEET ─────────────────────────────────────────
    updateSummary(ss);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Simple health check — visit the URL to confirm it's working
  return ContentService
    .createTextOutput("IELTS Practice Hub — Script is running ✓")
    .setMimeType(ContentService.MimeType.TEXT);
}

function updateSummary(ss) {
  var summarySheet = ss.getSheetByName("Summary");
  if (!summarySheet) {
    summarySheet = ss.insertSheet("Summary");
    summarySheet.appendRow(["Student", "Total Submissions", "Avg Score (%)", "Last Active"]);
    summarySheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#0f0e0d").setFontColor("white");
    summarySheet.setFrozenRows(1);
  }

  var scoresSheet = ss.getSheetByName("Scores");
  if (!scoresSheet) return;

  var data = scoresSheet.getDataRange().getValues();
  if (data.length < 2) return;

  // Build per-student stats
  var students = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = row[1];
    var pct  = parseFloat(row[6]) || 0;
    var ts   = row[0];
    if (!students[name]) students[name] = { count: 0, totalPct: 0, lastActive: ts };
    students[name].count++;
    students[name].totalPct += pct;
    if (ts > students[name].lastActive) students[name].lastActive = ts;
  }

  // Rewrite summary sheet
  summarySheet.clearContents();
  summarySheet.appendRow(["Student", "Total Submissions", "Avg Score (%)", "Last Active"]);
  summarySheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#0f0e0d").setFontColor("white");

  for (var name in students) {
    var s = students[name];
    summarySheet.appendRow([
      name,
      s.count,
      Math.round(s.totalPct / s.count) + "%",
      s.lastActive
    ]);
  }
}
