// ============================================================
// IELTS Practice Hub — Google Apps Script (v2)
// Paste this into script.google.com → deploy as Web App
// Execute as: Me | Access: Anyone
// ============================================================

// ── CONFIG ───────────────────────────────────────────────────
var ROOT_FOLDER_ID = "1tXX8dqEKr3y8q8XbG4Ha1f5oyLpMnbLz"; // IELTS Practice Hub folder

// ── doGet: Read operations ───────────────────────────────────
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "health";

    // 1) Return scores for dashboard
    if (action === "scores") {
      return jsonResponse(getScores());
    }

    // 2) List audio files for a Cambridge version
    //    ?action=audio&cambridge=14&test=1
    if (action === "audio") {
      var cambridge = e.parameter.cambridge || "";
      var test = e.parameter.test || "";
      return jsonResponse(getAudioUrls(cambridge, test));
    }

    // 3) List all available Cambridge audio folders
    //    ?action=audioList
    if (action === "audioList") {
      return jsonResponse(getAudioList());
    }

    // Default: health check
    return ContentService
      .createTextOutput("IELTS Practice Hub v2 — Script is running")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ── doPost: Write operations ─────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "score";

    // 1) Log a score (default)
    if (action === "score") {
      logScore(data);
      return jsonResponse({ status: "ok" });
    }

    // 2) Save writing submission to Drive + Sheets
    if (action === "saveWriting") {
      var result = saveWritingToDrive(data);
      logScore(data); // also log to Scores sheet
      return jsonResponse({ status: "ok", fileId: result.fileId, fileUrl: result.fileUrl });
    }

    // 3) Save speaking recording to Drive
    if (action === "saveRecording") {
      var result = saveRecordingToDrive(data);
      logScore(data); // also log to Scores sheet
      return jsonResponse({ status: "ok", fileId: result.fileId, fileUrl: result.fileUrl });
    }

    // Fallback: treat as score
    logScore(data);
    return jsonResponse({ status: "ok" });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ════════════════════════════════════════════════════════════
// AUDIO — List & serve Google Drive audio URLs
// ════════════════════════════════════════════════════════════

function getAudioUrls(cambridge, test) {
  // Navigate: ROOT > Listening Audio > Cambridge_XX
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var listenFolders = root.getFoldersByName("Listening Audio");
  if (!listenFolders.hasNext()) return { error: "Listening Audio folder not found", files: [] };
  var listenFolder = listenFolders.next();

  var cambridgeFolderName = "Cambridge_" + padTwo(cambridge);
  var cambridgeFolders = listenFolder.getFoldersByName(cambridgeFolderName);
  if (!cambridgeFolders.hasNext()) return { error: "Folder " + cambridgeFolderName + " not found", files: [] };
  var cambridgeFolder = cambridgeFolders.next();

  var files = [];
  var fileIter = cambridgeFolder.getFiles();
  while (fileIter.hasNext()) {
    var file = fileIter.next();
    var name = file.getName();

    // Filter by test number if specified
    if (test && name.indexOf("Test" + test + "_") === -1 && name.indexOf("Test" + test + ".") === -1) {
      continue;
    }

    // Make file accessible to anyone with link
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}

    files.push({
      name: name,
      id: file.getId(),
      url: "https://drive.google.com/uc?export=download&id=" + file.getId(),
      size: file.getSize(),
      mimeType: file.getMimeType()
    });
  }

  // Sort by name
  files.sort(function(a, b) { return a.name.localeCompare(b.name); });

  return { cambridge: cambridge, test: test, files: files };
}

function getAudioList() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var listenFolders = root.getFoldersByName("Listening Audio");
  if (!listenFolders.hasNext()) return { folders: [] };
  var listenFolder = listenFolders.next();

  var folders = [];
  var folderIter = listenFolder.getFolders();
  while (folderIter.hasNext()) {
    var folder = folderIter.next();
    var name = folder.getName(); // e.g. "Cambridge_14"
    var num = name.replace("Cambridge_", "").replace(/^0/, "");

    // Count files per test
    var tests = {};
    var fileIter = folder.getFiles();
    while (fileIter.hasNext()) {
      var f = fileIter.next();
      var match = f.getName().match(/Test(\d+)/);
      if (match) {
        var t = match[1];
        tests[t] = (tests[t] || 0) + 1;
      }
    }

    folders.push({
      name: name,
      cambridge: parseInt(num),
      tests: tests
    });
  }

  folders.sort(function(a, b) { return a.cambridge - b.cambridge; });
  return { folders: folders };
}

// ════════════════════════════════════════════════════════════
// WRITING — Save essay to Drive + Sheets
// ════════════════════════════════════════════════════════════

function saveWritingToDrive(data) {
  var studentName = data.name || "Unknown";
  var taskLabel = data.unit || "Task";
  var text = data.writingText || "";
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmm");

  // Create folder: ROOT > Submissions > Writing > StudentName
  var submissionsFolder = getOrCreateSubfolder(DriveApp.getFolderById(ROOT_FOLDER_ID), "Submissions");
  var writingFolder = getOrCreateSubfolder(submissionsFolder, "Writing");
  var studentFolder = getOrCreateSubfolder(writingFolder, sanitizeName(studentName));

  // Create .txt file
  var fileName = timestamp + "_" + sanitizeName(taskLabel) + ".txt";
  var header = "Student: " + studentName + "\n"
    + "Task: " + taskLabel + "\n"
    + "Date: " + timestamp + "\n"
    + "Prompt: " + (data.prompt || "N/A") + "\n"
    + "Word count: " + (text.split(/\s+/).length) + "\n"
    + "Time spent: " + (data.notes || "N/A") + "\n"
    + "═══════════════════════════════════════\n\n";
  var file = studentFolder.createFile(fileName, header + text, MimeType.PLAIN_TEXT);

  // Also log to Writing Submissions sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var writingSheet = ss.getSheetByName("Writing Submissions");
  if (!writingSheet) {
    writingSheet = ss.insertSheet("Writing Submissions");
    writingSheet.appendRow(["Timestamp", "Student Name", "Task", "Prompt", "Submission", "Drive Link", "Teacher Feedback", "Band Score"]);
    writingSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#c8402a").setFontColor("white");
    writingSheet.setFrozenRows(1);
    writingSheet.setColumnWidth(5, 400);
    writingSheet.setColumnWidth(7, 250);
  }
  writingSheet.appendRow([
    new Date(),
    studentName,
    taskLabel,
    data.prompt || "",
    text,
    file.getUrl(),
    "", ""
  ]);

  return { fileId: file.getId(), fileUrl: file.getUrl() };
}

// ════════════════════════════════════════════════════════════
// SPEAKING — Save recording to Drive
// ════════════════════════════════════════════════════════════

function saveRecordingToDrive(data) {
  var studentName = data.name || "Unknown";
  var taskLabel = data.unit || "Recording";
  var base64Audio = data.audioData || "";
  var mimeType = data.mimeType || "audio/webm";
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmm");

  // Create folder: ROOT > Submissions > Speaking > StudentName
  var submissionsFolder = getOrCreateSubfolder(DriveApp.getFolderById(ROOT_FOLDER_ID), "Submissions");
  var speakingFolder = getOrCreateSubfolder(submissionsFolder, "Speaking");
  var studentFolder = getOrCreateSubfolder(speakingFolder, sanitizeName(studentName));

  // Decode base64 audio and save
  var ext = mimeType === "audio/webm" ? ".webm" : ".wav";
  var fileName = timestamp + "_" + sanitizeName(taskLabel) + ext;
  var decoded = Utilities.base64Decode(base64Audio);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  var file = studentFolder.createFile(blob);

  // Log to a Speaking Submissions sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var speakingSheet = ss.getSheetByName("Speaking Submissions");
  if (!speakingSheet) {
    speakingSheet = ss.insertSheet("Speaking Submissions");
    speakingSheet.appendRow(["Timestamp", "Student Name", "Task", "Drive Link", "Duration", "Teacher Feedback", "Band Score"]);
    speakingSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#7c3aed").setFontColor("white");
    speakingSheet.setFrozenRows(1);
  }
  speakingSheet.appendRow([
    new Date(),
    studentName,
    taskLabel,
    file.getUrl(),
    data.duration || "",
    "", ""
  ]);

  return { fileId: file.getId(), fileUrl: file.getUrl() };
}

// ════════════════════════════════════════════════════════════
// SCORES — Log & retrieve
// ════════════════════════════════════════════════════════════

function logScore(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoresSheet = ss.getSheetByName("Scores");
  if (!scoresSheet) {
    scoresSheet = ss.insertSheet("Scores");
    scoresSheet.appendRow(["Timestamp", "Student Name", "Section", "Unit/Task", "Score", "Total", "Percentage (%)", "Notes"]);
    scoresSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#1a6e6e").setFontColor("white");
    scoresSheet.setFrozenRows(1);
  }
  scoresSheet.appendRow([
    new Date(data.timestamp || new Date()),
    data.name || "Unknown",
    data.section || "",
    data.unit || "",
    data.correct || 0,
    data.total || 0,
    data.pct || 0,
    data.notes || ""
  ]);
  updateSummary(ss);
}

function getScores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoresSheet = ss.getSheetByName("Scores");
  if (!scoresSheet || scoresSheet.getLastRow() < 2) return { rows: [] };

  var data = scoresSheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    rows.push({
      date: Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"),
      name: data[i][1],
      section: data[i][2],
      unit: data[i][3],
      correct: data[i][4],
      total: data[i][5],
      pct: data[i][6]
    });
  }
  return { rows: rows };
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

  var students = {};
  for (var i = 1; i < data.length; i++) {
    var name = data[i][1];
    var pct  = parseFloat(data[i][6]) || 0;
    var ts   = data[i][0];
    if (!students[name]) students[name] = { count: 0, totalPct: 0, lastActive: ts };
    students[name].count++;
    students[name].totalPct += pct;
    if (ts > students[name].lastActive) students[name].lastActive = ts;
  }

  summarySheet.clearContents();
  summarySheet.appendRow(["Student", "Total Submissions", "Avg Score (%)", "Last Active"]);
  summarySheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#0f0e0d").setFontColor("white");
  for (var name in students) {
    var s = students[name];
    summarySheet.appendRow([name, s.count, Math.round(s.totalPct / s.count) + "%", s.lastActive]);
  }
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function getOrCreateSubfolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function sanitizeName(name) {
  return (name || "unknown").replace(/[^a-zA-Z0-9_\- ]/g, "").substring(0, 50);
}

function padTwo(n) {
  var s = String(n);
  return s.length === 1 ? "0" + s : s;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
