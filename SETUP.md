# Aesthetic-Usability Effect Quiz — Setup Guide

## Overview

This project has three parts:
1. **React Quiz App** (`quiz-app.jsx`) — The student-facing quiz with Group A (clean) and Group B (degraded) designs
2. **Google Apps Script** (`google-apps-script.js`) — Backend that receives quiz data and writes to Google Sheets
3. **Google Sheet** — Auto-generated with formulas and charts that update in real-time

---

## Step 1: Set Up the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a **new blank spreadsheet**
2. Name it something like "Aesthetic-Usability Study Results"
3. Go to **Extensions → Apps Script**
4. Delete any code in the default `Code.gs` file
5. Copy the entire contents of `google-apps-script.js` and paste it in
6. Click the **Save** icon (💾) or press Ctrl+S
7. In the function dropdown (top toolbar), select **`setupSheet`**
8. Click **Run** (▶)
9. You'll be prompted to authorize — click through the permissions (Review Permissions → choose your account → Advanced → Go to project → Allow)
10. The script will create all sheets, formulas, and charts automatically
11. You should see a confirmation popup when done

### What gets created:
- **Raw Sessions** — One row per participant (ID, group, timing, ratings)
- **Raw Responses** — One row per question per participant (answers, time, confidence)
- **Summary Statistics** — Automated comparison table (accuracy, time, confidence by group)
- **Per-Question Breakdown** — Accuracy, time, and confidence broken down per question
- **Confidence Analysis** — The key "confident but wrong" analysis
- **Charts** — 5 auto-updating charts ready for presentation

---

## Step 2: Deploy the Apps Script as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Settings:
   - **Description**: Quiz data endpoint
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web App URL** — you'll need this in the next step
6. Click Done

> ⚠️ If you make changes to the script later, you need to create a **new deployment** (Deploy → New deployment) for changes to take effect. Or use Deploy → Manage deployments → Edit → Version: New version.

---

## Step 3: Connect the React App

Open `quiz-app.jsx` and find this line near the top:

```javascript
const GOOGLE_SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
```

Replace the placeholder with your actual Web App URL:

```javascript
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

---

## Step 4: Deploy the React App

You have several options for hosting the quiz:

### Option A: Use Claude's Artifact Viewer (Easiest for Testing)
The `.jsx` file can be rendered directly as a React artifact in Claude. Good for testing, but students would need access to the same Claude conversation.

### Option B: Quick Deploy with Vite
```bash
npm create vite@latest quiz-app -- --template react
cd quiz-app
# Replace src/App.jsx with the contents of quiz-app.jsx
npm install
npm run dev
```

### Option C: Deploy to Vercel/Netlify (Recommended for Class)
1. Create a Vite project as above
2. Push to GitHub
3. Connect to [Vercel](https://vercel.com) or [Netlify](https://netlify.app)
4. Auto-deploys on push
5. Share the URL with students

### Option D: Single HTML File (Simplest Hosting)
You can convert the React app to a single HTML file using a CDN for React. This can be hosted anywhere including GitHub Pages.

---

## Running the Experiment in Class

### Before class:
1. Verify the Google Sheet is set up (check that all 6 tabs exist)
2. Test by opening the quiz, selecting Group A, completing it, and checking the sheet
3. Delete the test row from Raw Sessions and Raw Responses
4. Have the quiz URL ready to share

### During class:
1. Split the class into two groups (Group A and Group B)
2. **Do not tell students what the difference is** — just say "Select the group I assigned you"
3. Share the quiz URL
4. Give them ~5 minutes to complete it
5. Open your Google Sheet — data should be appearing in real-time

### The reveal:
1. Once all students have submitted, open the **Charts** tab
2. Project it for the class
3. Walk through each chart:
   - **Accuracy by Question**: Shows performance difference on identical questions
   - **Time by Question**: Shows how bad design slows people down
   - **Confidence by Question**: Shows whether confidence tracks with design quality
   - **Confidence × Correctness**: The headline finding — Group B students who got answers wrong were still confident
   - **Perception Ratings**: Group B rates the *questions* as harder, not just the interface
4. Then ask: "Both groups had the exact same questions. What was different?"
5. Show a side-by-side of the two versions (the quiz's reveal page does this automatically for individual students)

---

## Data You're Collecting

### Per Participant (Session Level):
| Field | Description |
|-------|-------------|
| Participant ID | Auto-generated anonymous ID |
| Group | A or B |
| Device Type | Mobile or desktop |
| Viewport Width | Screen width in pixels |
| Start/End Time | Session timestamps |
| Total Duration | How long the entire quiz took (ms) |
| Usability Rating | 1-7 self-reported ease of use |
| Difficulty Rating | 1-7 self-reported question difficulty |

### Per Question (Response Level):
| Field | Description |
|-------|-------------|
| Question # | 1-5 |
| Time to Answer | Milliseconds from question appearing to clicking Next |
| Selected Answer | What they chose |
| Correct Answer | What was right |
| Is Correct | Boolean |
| Confidence | 1-5 self-rated confidence |
| Answer Changes | How many times they changed their selection |

---

## The Five Questions and What They Test

| # | Task | What It Tests | Why B is Harder |
|---|------|--------------|-----------------|
| 1 | Table Reading | Row scanning accuracy | No alternating rows, cramped spacing, headers blend with data |
| 2 | Passage Comprehension | Reading under poor formatting | 12px font, no paragraphs, low contrast, justified text |
| 3 | Schedule Proximity | Gestalt grouping errors | Excessive row spacing makes labels appear associated with wrong rows |
| 4 | Score Colors | Color misdirection + buried instruction | "Second highest" not emphasized, green on highest score draws eye |
| 5 | Memory Recall | Encoding quality + access to reference | No passage review available, poor initial encoding from Q2's bad format |

---

## Expected Findings

- **Group A**: Higher accuracy, faster times, higher confidence, higher usability ratings
- **Group B**: More errors (especially Q3 and Q4), slower times, possibly high confidence even when wrong, lower usability ratings, AND higher question difficulty ratings (attributing design problems to content)
- **Key insight**: Group B rates the *questions themselves* as harder — even though they're identical. This is the aesthetic-usability effect in action.

---

## Troubleshooting

**Data not appearing in Google Sheet:**
- Check that the Google Script URL is correct in the React app
- Verify the web app is deployed with "Anyone" access
- Check the Apps Script execution log (Executions tab in Apps Script editor)

**Charts showing 0:**
- Charts need at least 1-2 data points to display. Submit a test response first.

**CORS errors in console:**
- The app uses `mode: 'no-cors'` which means you won't get a readable response, but data will still be sent. This is expected behavior.

**Students on mobile:**
- The quiz works on mobile. Version B will be even harder on small screens, which actually amplifies the effect.
