import type { EvaluationResult } from "./types"

export async function generateReportPDF(evaluation: EvaluationResult): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>AI Prospect Simulation - Call Evaluation Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            color: #1f2937;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f9fafb;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          h1 {
            color: #06b6d4;
            border-bottom: 3px solid #06b6d4;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          h2 {
            color: #1f2937;
            margin-top: 25px;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .student-info {
            background: linear-gradient(to right, #06b6d4, #a855f7);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .student-info-item {
            display: flex;
            flex-direction: column;
          }
          .student-info-label {
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 4px;
          }
          .student-info-value {
            font-size: 18px;
            font-weight: 600;
          }
          .score-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .overall-score {
            font-size: 48px;
            font-weight: bold;
            color: #06b6d4;
          }
          .score-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
          }
          tr:last-child td {
            border-bottom: none;
          }
          ul {
            list-style: none;
            padding: 0;
          }
          li {
            padding: 8px 0;
            padding-left: 20px;
            position: relative;
            color: #4b5563;
          }
          li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
          }
          .mistakes li:before {
            content: "✕";
            color: #ef4444;
          }
          .section {
            margin-bottom: 25px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>AI Prospect Simulation - Call Evaluation Report</h1>
          
          ${
            evaluation.studentInfo
              ? `
          <!-- Added student info banner -->
          <div class="student-info">
            <div class="student-info-item">
              <div class="student-info-label">Student Name</div>
              <div class="student-info-value">${evaluation.studentInfo.name}</div>
            </div>
            <div class="student-info-item">
              <div class="student-info-label">Batch ID</div>
              <div class="student-info-value">${evaluation.studentInfo.batchId}</div>
            </div>
            <div class="student-info-item">
              <div class="student-info-label">Date</div>
              <div class="student-info-value">${new Date(evaluation.timestamp).toLocaleDateString()}</div>
            </div>
          </div>
          `
              : ""
          }

          <div class="score-section">
            <div>
              <div class="overall-score">${evaluation.overallScore}</div>
              <div class="score-label">/100</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 24px; color: #1f2937; font-weight: 600;">${
                evaluation.overallScore >= 85
                  ? "Excellent!"
                  : evaluation.overallScore >= 70
                    ? "Good Job"
                    : evaluation.overallScore >= 50
                      ? "Keep Practicing"
                      : "More Work Needed"
              }</div>
              <div style="color: #6b7280; margin-top: 5px;">Overall Performance</div>
            </div>
          </div>

          <div class="section">
            <h2>Performance Summary</h2>
            <p>${evaluation.summary}</p>
          </div>

          <div class="section">
            <h2>Category Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Introduction</td>
                  <td>${evaluation.categoryScores.introduction}/100</td>
                </tr>
                <tr>
                  <td>Rapport Building</td>
                  <td>${evaluation.categoryScores.rapport}/100</td>
                </tr>
                <tr>
                  <td>Discovery</td>
                  <td>${evaluation.categoryScores.discovery}/100</td>
                </tr>
                <tr>
                  <td>Objection Handling</td>
                  <td>${evaluation.categoryScores.objection_handling}/100</td>
                </tr>
                <tr>
                  <td>Closing</td>
                  <td>${evaluation.categoryScores.closing}/100</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Path Accuracy</h2>
            <table>
              <tbody>
                <tr>
                  <td>Path Accuracy</td>
                  <td>${evaluation.nodePathAccuracy.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Completed Steps</td>
                  <td>${evaluation.completedSteps}/${evaluation.totalRequiredSteps}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section mistakes">
            <h2>Key Mistakes</h2>
            <ul>
              ${evaluation.mistakes.map((m) => `<li>${m}</li>`).join("")}
            </ul>
          </div>

          <div class="section">
            <h2>Recommendations</h2>
            <ul>
              ${evaluation.recommendations.map((r) => `<li>${r}</li>`).join("")}
            </ul>
          </div>

          <div class="footer">
            <p>Generated by AI Prospect Simulation • ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  const filename = evaluation.studentInfo
    ? `evaluation-${evaluation.studentInfo.name.replace(/\s+/g, "-")}-${Date.now()}.html`
    : `evaluation-report-${Date.now()}.html`
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  // Alternatively, user can print to PDF from the browser (Ctrl+P)
  setTimeout(() => {
    // Open in new tab for printing
    const printWindow = window.open()
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.print()
    }
  }, 100)
}
