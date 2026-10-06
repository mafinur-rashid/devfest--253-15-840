# Tender Document Package Builder

**AI DevFest 2026 — Official Submission**

## 1. Participant Details
- **Participant Name:** Mafi (Replace with your full name)
- **Registration Number:** devfest-2026-xxx (Replace with your exact registration number)
- **Repository URL:** [GitHub Repository Link]
- **Live Deployment Link:** [Public HTTPS Deployment URL] (e.g. GitHub Pages / Vercel / Netlify)

---

## 2. Overview
A frontend-only, browser-based web application that allows non-technical office staff to assemble, check, and generate compliant, correctly ordered PDF submission packages from tender specifications (`requirements.json`) and uploaded PDF files.

The application operates 100% inside Google Chrome (no backend, no database, no external data uploads) complying strictly with Section 5.1 of the AI DevFest Rulebook.

---

## 3. How to Run the App
Since the application is purely client-side:
1. **Option A (Live Website):** Open the public HTTPS deployment link directly in Google Chrome.
2. **Option B (Local execution):**
   - Clone or extract the repository.
   - Open `index.html` directly in Google Chrome, or serve with any static server:
     ```bash
     npx serve .
     # or python -m http.server 8000
     ```
3. **Option C (1-Click Sample Pack Test):**
   - Click the **"Load Sample Pack"** button in the header to instantly load the official sample tender requirements and candidate documents.

---

## 4. Main Features Completed (Problem Statement Section 4 & 5)
- [x] **4.1 Load the list:** Open and parse any valid `requirements.json`. Displays tender metadata (Tender ID, title, procuring entity, bidder, submission deadline) and all document requirements sorted strictly by `order`.
- [x] **4.2 Upload files:** Multi-file drag-and-drop & file picker. Rejects non-PDF files (e.g. `company_logo.png`) with an explicit alert. Shows file name and exact page count for every uploaded document. Allows deleting/removing files.
- [x] **4.3 Match files:** Intuitive 1-to-1 matching interface. One document gets at most one file; one file goes to at most one document. Matching can be changed or undone at any time.
- [x] **4.4 Enter expiry dates:** For requirements with `has_expiry: true`, an interactive date picker (`YYYY-MM-DD`) is provided.
- [x] **4.5 Check everything:** Real-time status evaluation engine implementing Section 5 rules:
  - `Missing` (Blocks: YES): Mandatory document without a matched file.
  - `Expiry date needed` (Blocks: YES): File matched to expiry document, but no date entered.
  - `Expired` (Blocks: YES): Expiry date is before the submission deadline.
  - `Not provided` (Blocks: NO): Optional document without a file.
  - `OK` (Blocks: NO): File matched and valid on or after deadline (same day as deadline is valid).
- [x] **4.6 Content-based Duplicate Detection:** Calculates SHA-256 binary hash across all uploaded files. Marks identical files with a duplicate badge. Strictly prevents matching duplicate files to different documents.
- [x] **4.7 Package Blocker Guard:** "Generate Package PDF" button remains disabled while any blocking issue exists, displaying a detailed real-time blocker checklist explaining each issue.
- [x] **4.8 Download:** Generates and downloads the final verified PDF as `<tender_id>_Package.pdf` (e.g. `T-2026-0417_Package.pdf`).
- [x] **4.9 Bilingual Support (English & Bangla):** Complete language switcher in header. Switches all UI labels, table columns, status badges, and displays document names dynamically from `title_bn` or `title_en`.

---

## 5. PDF Package Generation Rules (Section 6)
- [x] **6.1 Cover Page (Page 1 in English):** Shows Tender ID, Tender Title, Procuring Entity, Bidder Name, Submission Deadline, Generation Date, and the ordered schedule of included documents.
- [x] **6.2 Document Ordering:** All included document pages appended in strict order by `order`. All pages included in original sequence. Optional documents with no file are cleanly omitted.
- [x] **6.3 & 6.4 Universal Footers:** Every page (including Cover & Index) contains a bottom footer: `<tender_id> | Page X of Y` (where Y is total package page count), formatted in the bottom margin with a clean separator without obscuring content.

---

## 6. Bonus Tasks Completed (Section 7)
- [x] **Table of Contents / Index Page:** Generates an Index page after the cover showing the starting page number for each document.
- [x] **Auto-Match Engine:** Intelligent auto-matching button that pairs uploaded files with requirements based on filename keyword analysis.
- [x] **Seal / Signature Placement:** Allows uploading a PNG company seal/signature and embeds it onto the cover page, last page, or all pages.
- [x] **Export Checklist to CSV:** 1-click export of the full document status table to CSV.
- [x] **Session Persistence:** Auto-save and manual Save/Load session using browser storage (`localStorage`).
- [x] **Graceful Error Handling:** Protected against damaged or password-protected PDFs without application crashes.

---

## 7. Known Problems / Limitations
- External browsers with strict file-origin restrictions (opening via raw `file:///` protocol) may block local asset fetches for `sample-data/`; running via a lightweight static server (or GitHub Pages / Vercel HTTPS) is recommended for 100% functionality.

---

## 8. AI Tools Used & Prompts
- **AI Tools Used:** Google Antigravity (Gemini 3.8 Flash High)
- **Most Useful Prompt:**
  > *"Analyze the tender package requirements and build a frontend-only web app using pdf-lib that strictly enforces Section 5 status rules, detects file duplicates via SHA-256 hash preventing duplicate multi-assignment, supports instant English-Bangla toggling, and generates a combined PDF with an English cover page and <tender_id> | Page X of Y footers on every page."*

---

## 9. License
MIT License (see `LICENSE` file).
