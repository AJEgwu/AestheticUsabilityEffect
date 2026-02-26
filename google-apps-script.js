// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AESTHETIC-USABILITY EFFECT — Google Apps Script
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// SETUP INSTRUCTIONS:
// 1. Create a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code and paste this entire file
// 4. Run the "setupSheet" function once (click Run > setupSheet)
// 5. Deploy as web app:
//    - Click Deploy > New deployment
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
//    - Click Deploy
// 6. Copy the web app URL
// 7. Paste it into the GOOGLE_SCRIPT_URL constant in the React app
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Web App Endpoint ──
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Write session data
    var sessionsSheet = ss.getSheetByName("Raw Sessions");
    var session = data.session;
    sessionsSheet.appendRow([
      session.participantId,
      session.group,
      session.deviceType,
      session.viewportWidth,
      session.startTime,
      session.endTime,
      session.totalDuration,
      session.completed,
      session.usabilityRating,
      session.difficultyRating,
    ]);

    // Write response data
    var responsesSheet = ss.getSheetByName("Raw Responses");
    data.responses.forEach(function (r) {
      responsesSheet.appendRow([
        r.participantId,
        r.group,
        r.questionNumber,
        r.timeToAnswer,
        r.selectedAnswer,
        r.correctAnswer,
        r.isCorrect,
        r.confidence,
        r.answerChanges,
      ]);
    });

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success" })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow GET for testing
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok", message: "Quiz data endpoint is active." })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETUP FUNCTION — Run this ONCE to create all sheets, formulas, charts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Create Raw Sessions Sheet ──
  var sessions = getOrCreateSheet(ss, "Raw Sessions");
  sessions.clear();
  var sessionHeaders = [
    "Participant ID",
    "Group",
    "Device Type",
    "Viewport Width",
    "Start Time",
    "End Time",
    "Total Duration (ms)",
    "Completed",
    "Usability Rating",
    "Difficulty Rating",
  ];
  sessions.getRange(1, 1, 1, sessionHeaders.length).setValues([sessionHeaders]);
  formatHeaderRow(sessions, sessionHeaders.length);

  // ── Create Raw Responses Sheet ──
  var responses = getOrCreateSheet(ss, "Raw Responses");
  responses.clear();
  var responseHeaders = [
    "Participant ID",
    "Group",
    "Question #",
    "Time to Answer (ms)",
    "Selected Answer",
    "Correct Answer",
    "Is Correct",
    "Confidence",
    "Answer Changes",
  ];
  responses
    .getRange(1, 1, 1, responseHeaders.length)
    .setValues([responseHeaders]);
  formatHeaderRow(responses, responseHeaders.length);

  // ── Create Summary Statistics Sheet ──
  var summary = getOrCreateSheet(ss, "Summary Statistics");
  summary.clear();

  // Title
  summary.getRange("A1").setValue("AESTHETIC-USABILITY EFFECT — SUMMARY");
  summary
    .getRange("A1")
    .setFontSize(14)
    .setFontWeight("bold")
    .setFontColor("#1a1a2e");

  // Participant counts
  summary.getRange("A3").setValue("Participants");
  summary.getRange("A3").setFontWeight("bold").setFontSize(11);
  summary.getRange("A4").setValue("Group A Count");
  summary.getRange("A5").setValue("Group B Count");
  summary.getRange("A6").setValue("Total");
  summary
    .getRange("B4")
    .setFormula(
      '=COUNTIF(\'Raw Sessions\'!B:B,"A")'
    );
  summary
    .getRange("B5")
    .setFormula(
      '=COUNTIF(\'Raw Sessions\'!B:B,"B")'
    );
  summary.getRange("B6").setFormula("=B4+B5");

  // Main comparison table
  summary.getRange("A8").setValue("Metric");
  summary.getRange("B8").setValue("Group A");
  summary.getRange("C8").setValue("Group B");
  summary.getRange("D8").setValue("Difference");
  summary
    .getRange("A8:D8")
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#ffffff");

  var metrics = [
    [
      "Overall Accuracy (%)",
      '=IFERROR(COUNTIFS(\'Raw Responses\'!B:B,"A",\'Raw Responses\'!G:G,TRUE)/COUNTIF(\'Raw Responses\'!B:B,"A")*100,0)',
      '=IFERROR(COUNTIFS(\'Raw Responses\'!B:B,"B",\'Raw Responses\'!G:G,TRUE)/COUNTIF(\'Raw Responses\'!B:B,"B")*100,0)',
      "=B9-C9",
    ],
    [
      "Avg Time Per Question (ms)",
      '=IFERROR(AVERAGEIF(\'Raw Responses\'!B:B,"A",\'Raw Responses\'!D:D),0)',
      '=IFERROR(AVERAGEIF(\'Raw Responses\'!B:B,"B",\'Raw Responses\'!D:D),0)',
      "=C10-B10",
    ],
    [
      "Avg Confidence (All)",
      '=IFERROR(AVERAGEIF(\'Raw Responses\'!B:B,"A",\'Raw Responses\'!H:H),0)',
      '=IFERROR(AVERAGEIF(\'Raw Responses\'!B:B,"B",\'Raw Responses\'!H:H),0)',
      "=B11-C11",
    ],
    [
      "Avg Confidence (When Correct)",
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"A",\'Raw Responses\'!G:G,TRUE),0)',
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"B",\'Raw Responses\'!G:G,TRUE),0)',
      "=B12-C12",
    ],
    [
      "Avg Confidence (When WRONG)",
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"A",\'Raw Responses\'!G:G,FALSE),0)',
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"B",\'Raw Responses\'!G:G,FALSE),0)',
      "=B13-C13",
    ],
    [
      "Avg Usability Rating (1-7)",
      '=IFERROR(AVERAGEIF(\'Raw Sessions\'!B:B,"A",\'Raw Sessions\'!I:I),0)',
      '=IFERROR(AVERAGEIF(\'Raw Sessions\'!B:B,"B",\'Raw Sessions\'!I:I),0)',
      "=B14-C14",
    ],
    [
      "Avg Difficulty Rating (1-7)",
      '=IFERROR(AVERAGEIF(\'Raw Sessions\'!B:B,"A",\'Raw Sessions\'!J:J),0)',
      '=IFERROR(AVERAGEIF(\'Raw Sessions\'!B:B,"B",\'Raw Sessions\'!J:J),0)',
      "=C15-B15",
    ],
    [
      "Avg Total Duration (sec)",
      '=IFERROR(AVERAGEIF(\'Raw Sessions\'!B:B,"A",\'Raw Sessions\'!G:G)/1000,0)',
      '=IFERROR(AVERAGEIF(\'Raw Sessions\'!B:B,"B",\'Raw Sessions\'!G:G)/1000,0)',
      "=C16-B16",
    ],
  ];

  for (var i = 0; i < metrics.length; i++) {
    var row = 9 + i;
    summary.getRange(row, 1).setValue(metrics[i][0]);
    summary.getRange(row, 2).setFormula(metrics[i][1]);
    summary.getRange(row, 3).setFormula(metrics[i][2]);
    summary.getRange(row, 4).setFormula(metrics[i][3]);
  }

  // Format
  summary.getRange("B9:D16").setNumberFormat("0.0");
  summary
    .getRange("A9:A16")
    .setFontWeight("bold")
    .setFontColor("#334155");
  summary
    .getRange("A8:D16")
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  summary.setColumnWidth(1, 260);
  summary.setColumnWidth(2, 120);
  summary.setColumnWidth(3, 120);
  summary.setColumnWidth(4, 120);

  // ── Create Per-Question Breakdown Sheet ──
  var perQ = getOrCreateSheet(ss, "Per-Question Breakdown");
  perQ.clear();

  perQ.getRange("A1").setValue("PER-QUESTION BREAKDOWN");
  perQ.getRange("A1").setFontSize(14).setFontWeight("bold");

  // Accuracy table
  perQ.getRange("A3").setValue("ACCURACY BY QUESTION (%)");
  perQ.getRange("A3").setFontWeight("bold").setFontSize(11);
  perQ.getRange("A4").setValue("Question");
  perQ.getRange("B4").setValue("Group A");
  perQ.getRange("C4").setValue("Group B");
  perQ
    .getRange("A4:C4")
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#ffffff");

  var qLabels = [
    "Q1: Table Reading",
    "Q2: Passage Comprehension",
    "Q3: Schedule Proximity",
    "Q4: Score Colors",
    "Q5: Memory Recall",
  ];

  for (var q = 0; q < 5; q++) {
    var row = 5 + q;
    perQ.getRange(row, 1).setValue(qLabels[q]);
    perQ
      .getRange(row, 2)
      .setFormula(
        '=IFERROR(COUNTIFS(\'Raw Responses\'!B:B,"A",\'Raw Responses\'!C:C,' +
          (q + 1) +
          ',\'Raw Responses\'!G:G,TRUE)/COUNTIFS(\'Raw Responses\'!B:B,"A",\'Raw Responses\'!C:C,' +
          (q + 1) +
          ")*100,0)"
      );
    perQ
      .getRange(row, 3)
      .setFormula(
        '=IFERROR(COUNTIFS(\'Raw Responses\'!B:B,"B",\'Raw Responses\'!C:C,' +
          (q + 1) +
          ',\'Raw Responses\'!G:G,TRUE)/COUNTIFS(\'Raw Responses\'!B:B,"B",\'Raw Responses\'!C:C,' +
          (q + 1) +
          ")*100,0)"
      );
  }

  perQ.getRange("B5:C9").setNumberFormat("0.0");

  // Time table
  perQ.getRange("A12").setValue("AVG TIME BY QUESTION (seconds)");
  perQ.getRange("A12").setFontWeight("bold").setFontSize(11);
  perQ.getRange("A13").setValue("Question");
  perQ.getRange("B13").setValue("Group A");
  perQ.getRange("C13").setValue("Group B");
  perQ
    .getRange("A13:C13")
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#ffffff");

  for (var q = 0; q < 5; q++) {
    var row = 14 + q;
    perQ.getRange(row, 1).setValue(qLabels[q]);
    perQ
      .getRange(row, 2)
      .setFormula(
        '=IFERROR(AVERAGEIFS(\'Raw Responses\'!D:D,\'Raw Responses\'!B:B,"A",\'Raw Responses\'!C:C,' +
          (q + 1) +
          ")/1000,0)"
      );
    perQ
      .getRange(row, 3)
      .setFormula(
        '=IFERROR(AVERAGEIFS(\'Raw Responses\'!D:D,\'Raw Responses\'!B:B,"B",\'Raw Responses\'!C:C,' +
          (q + 1) +
          ")/1000,0)"
      );
  }

  perQ.getRange("B14:C18").setNumberFormat("0.0");

  // Confidence table
  perQ.getRange("A21").setValue("AVG CONFIDENCE BY QUESTION (1-5)");
  perQ.getRange("A21").setFontWeight("bold").setFontSize(11);
  perQ.getRange("A22").setValue("Question");
  perQ.getRange("B22").setValue("Group A");
  perQ.getRange("C22").setValue("Group B");
  perQ
    .getRange("A22:C22")
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#ffffff");

  for (var q = 0; q < 5; q++) {
    var row = 23 + q;
    perQ.getRange(row, 1).setValue(qLabels[q]);
    perQ
      .getRange(row, 2)
      .setFormula(
        '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"A",\'Raw Responses\'!C:C,' +
          (q + 1) +
          "),0)"
      );
    perQ
      .getRange(row, 3)
      .setFormula(
        '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"B",\'Raw Responses\'!C:C,' +
          (q + 1) +
          "),0)"
      );
  }

  perQ.getRange("B23:C27").setNumberFormat("0.0");

  perQ.setColumnWidth(1, 240);
  perQ.setColumnWidth(2, 120);
  perQ.setColumnWidth(3, 120);

  // Format borders for all tables
  perQ.getRange("A4:C9").setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  perQ.getRange("A13:C18").setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  perQ.getRange("A22:C27").setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  // ── Create Confidence Analysis Sheet ──
  var conf = getOrCreateSheet(ss, "Confidence Analysis");
  conf.clear();

  conf.getRange("A1").setValue("CONFIDENCE ANALYSIS");
  conf.getRange("A1").setFontSize(14).setFontWeight("bold");

  conf.getRange("A3").setValue("Confidence × Correctness");
  conf.getRange("A3").setFontWeight("bold").setFontSize(11);

  conf.getRange("A4").setValue("");
  conf.getRange("B4").setValue("Group A — Correct");
  conf.getRange("C4").setValue("Group A — Wrong");
  conf.getRange("D4").setValue("Group B — Correct");
  conf.getRange("E4").setValue("Group B — Wrong");
  conf
    .getRange("A4:E4")
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontSize(10);

  conf.getRange("A5").setValue("Avg Confidence");
  conf
    .getRange("B5")
    .setFormula(
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"A",\'Raw Responses\'!G:G,TRUE),0)'
    );
  conf
    .getRange("C5")
    .setFormula(
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"A",\'Raw Responses\'!G:G,FALSE),0)'
    );
  conf
    .getRange("D5")
    .setFormula(
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"B",\'Raw Responses\'!G:G,TRUE),0)'
    );
  conf
    .getRange("E5")
    .setFormula(
      '=IFERROR(AVERAGEIFS(\'Raw Responses\'!H:H,\'Raw Responses\'!B:B,"B",\'Raw Responses\'!G:G,FALSE),0)'
    );

  conf.getRange("A6").setValue("Count");
  conf
    .getRange("B6")
    .setFormula(
      '=COUNTIFS(\'Raw Responses\'!B:B,"A",\'Raw Responses\'!G:G,TRUE)'
    );
  conf
    .getRange("C6")
    .setFormula(
      '=COUNTIFS(\'Raw Responses\'!B:B,"A",\'Raw Responses\'!G:G,FALSE)'
    );
  conf
    .getRange("D6")
    .setFormula(
      '=COUNTIFS(\'Raw Responses\'!B:B,"B",\'Raw Responses\'!G:G,TRUE)'
    );
  conf
    .getRange("E6")
    .setFormula(
      '=COUNTIFS(\'Raw Responses\'!B:B,"B",\'Raw Responses\'!G:G,FALSE)'
    );

  conf.getRange("B5:E5").setNumberFormat("0.00");

  conf.getRange("A4:E6").setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  conf.setColumnWidth(1, 140);
  conf.setColumnWidth(2, 150);
  conf.setColumnWidth(3, 150);
  conf.setColumnWidth(4, 150);
  conf.setColumnWidth(5, 150);

  // ── Create Charts Sheet ──
  var chartsSheet = getOrCreateSheet(ss, "Charts");
  chartsSheet.clear();
  chartsSheet
    .getRange("A1")
    .setValue("Charts are embedded on this sheet. They update automatically as data comes in.");

  // Chart 1: Accuracy by Question (grouped bar)
  var chart1 = chartsSheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(perQ.getRange("A4:C9"))
    .setPosition(3, 1, 0, 0)
    .setOption("title", "Accuracy by Question (%)")
    .setOption("hAxis.title", "Question")
    .setOption("vAxis.title", "Accuracy (%)")
    .setOption("vAxis.minValue", 0)
    .setOption("vAxis.maxValue", 100)
    .setOption("colors", ["#3b82f6", "#ef4444"])
    .setOption("legend.position", "top")
    .setOption("width", 700)
    .setOption("height", 400)
    .build();
  chartsSheet.insertChart(chart1);

  // Chart 2: Avg Time by Question
  var chart2 = chartsSheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(perQ.getRange("A13:C18"))
    .setPosition(3, 6, 0, 0)
    .setOption("title", "Avg Time by Question (seconds)")
    .setOption("hAxis.title", "Question")
    .setOption("vAxis.title", "Time (s)")
    .setOption("vAxis.minValue", 0)
    .setOption("colors", ["#3b82f6", "#ef4444"])
    .setOption("legend.position", "top")
    .setOption("width", 700)
    .setOption("height", 400)
    .build();
  chartsSheet.insertChart(chart2);

  // Chart 3: Confidence by Question
  var chart3 = chartsSheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(perQ.getRange("A22:C27"))
    .setPosition(25, 1, 0, 0)
    .setOption("title", "Avg Confidence by Question (1-5)")
    .setOption("hAxis.title", "Question")
    .setOption("vAxis.title", "Confidence")
    .setOption("vAxis.minValue", 0)
    .setOption("vAxis.maxValue", 5)
    .setOption("colors", ["#3b82f6", "#ef4444"])
    .setOption("legend.position", "top")
    .setOption("width", 700)
    .setOption("height", 400)
    .build();
  chartsSheet.insertChart(chart3);

  // Chart 4: Confidence When Wrong (the key chart)
  var chart4 = chartsSheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(conf.getRange("A4:E5"))
    .setPosition(25, 6, 0, 0)
    .setOption("title", "Confidence × Correctness")
    .setOption("vAxis.title", "Avg Confidence")
    .setOption("vAxis.minValue", 0)
    .setOption("vAxis.maxValue", 5)
    .setOption("colors", ["#22c55e", "#fbbf24", "#16a34a", "#ef4444"])
    .setOption("legend.position", "top")
    .setOption("width", 700)
    .setOption("height", 400)
    .build();
  chartsSheet.insertChart(chart4);

  // Chart 5: Perception Ratings (Summary)
  // We'll build a small helper table on the charts sheet for this
  chartsSheet.getRange("A48").setValue("");
  chartsSheet.getRange("B48").setValue("Group A");
  chartsSheet.getRange("C48").setValue("Group B");
  chartsSheet.getRange("A49").setValue("Usability Rating");
  chartsSheet.getRange("A50").setValue("Question Difficulty");
  chartsSheet.getRange("B49").setFormula("='Summary Statistics'!B14");
  chartsSheet.getRange("C49").setFormula("='Summary Statistics'!C14");
  chartsSheet.getRange("B50").setFormula("='Summary Statistics'!B15");
  chartsSheet.getRange("C50").setFormula("='Summary Statistics'!C15");

  var chart5 = chartsSheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(chartsSheet.getRange("A48:C50"))
    .setPosition(47, 1, 0, 0)
    .setOption("title", "Perception Ratings (1-7 scale)")
    .setOption("vAxis.title", "Rating")
    .setOption("vAxis.minValue", 0)
    .setOption("vAxis.maxValue", 7)
    .setOption("colors", ["#3b82f6", "#ef4444"])
    .setOption("legend.position", "top")
    .setOption("width", 700)
    .setOption("height", 400)
    .build();
  chartsSheet.insertChart(chart5);

  // ── Clean up default Sheet1 if it exists ──
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // ── Set sheet order ──
  ss.setActiveSheet(ss.getSheetByName("Charts"));

  SpreadsheetApp.getUi().alert(
    "Setup complete! Your spreadsheet is ready.\n\n" +
    "Next steps:\n" +
    "1. Deploy this script as a Web App\n" +
    "2. Paste the URL into the React app\n" +
    "3. Run the quiz with your students!"
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function formatHeaderRow(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontSize(10);
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (var i = 1; i <= numCols; i++) {
    sheet.setColumnWidth(i, 140);
  }
}
