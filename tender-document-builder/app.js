// Main Application Logic for Tender Document Package Builder
// Complies strictly with AI DevFest 2026 Problem Statement & Official Rulebook

const AppState = {
  tender: {
    tender_id: "",
    title: "",
    procuring_entity: "",
    bidder: "",
    submission_deadline: ""
  },
  requirements: [],
  uploadedFiles: [], // { id, name, size, pageCount, hash, isDuplicate, duplicateWith: [], buffer }
  matches: {}, // { [reqId]: fileId }
  expiryDates: {}, // { [reqId]: 'YYYY-MM-DD' }
  alerts: [],
  filterStatus: 'all',
  includeIndex: true,
  sealImageBytes: null,
  sealPlacement: 'cover',
  generatedPdfBytes: null,
  isGenerating: false
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupLanguage();
  setupEventListeners();
  render();
});

function setupLanguage() {
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLang = window.I18N.currentLang === 'en' ? 'bn' : 'en';
      window.I18N.setLang(nextLang);
      updateStaticLabels();
      render();
    });
  }
  updateStaticLabels();
}

function updateStaticLabels() {
  const t = (k, p) => window.I18N.t(k, p);
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  setText('app-title', t('appTitle'));
  setText('app-subtitle', t('appSubtitle'));
  setText('lang-toggle-btn', t('langToggle'));
  setText('load-req-btn-text', t('loadRequirements'));
  setText('load-sample-btn-text', t('loadSamplePack'));
  setText('tender-info-title', t('tenderInfoTitle'));
  setText('lbl-tender-id', t('tenderId'));
  setText('lbl-procuring-entity', t('procuringEntity'));
  setText('lbl-bidder-name', t('bidderName'));
  setText('lbl-submission-deadline', t('submissionDeadline'));
  setText('upload-zone-title', t('uploadZoneTitle'));
  setText('upload-zone-hint', t('uploadZoneHint'));
  setText('uploaded-files-title', t('uploadedFilesTitle'));
  setText('checklist-title', t('checklistTitle'));
  setText('auto-match-btn-text', t('autoMatchButton'));
  setText('export-csv-btn-text', t('exportCsvButton'));
  setText('save-session-btn-text', t('saveSessionButton'));
  setText('load-session-btn-text', t('loadSessionButton'));
  setText('reset-btn-text', t('resetAllButton'));
  setText('stamp-title', t('stampSignatureTitle'));
  setText('stamp-hint', t('stampUploadHint'));
  setText('generate-btn-text', AppState.isGenerating ? t('generatingButton') : t('generateButton'));
  setText('download-btn-text', t('downloadButton'));
  setText('footer-info', t('footerInfo'));
}

// --- Event Listeners ---
function setupEventListeners() {
  // Requirements File Input
  const reqInput = document.getElementById('requirements-file-input');
  if (reqInput) {
    reqInput.addEventListener('change', handleRequirementsUpload);
  }

  // Load Sample Pack Button
  const sampleBtn = document.getElementById('load-sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', loadSampleData);
  }

  // Upload Zone & Input
  const pdfInput = document.getElementById('pdf-files-input');
  const dropzone = document.getElementById('pdf-dropzone');
  if (pdfInput) {
    pdfInput.addEventListener('change', (e) => handlePdfFilesUpload(e.target.files));
  }
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files) {
        handlePdfFilesUpload(e.dataTransfer.files);
      }
    });
  }

  // Stamp / Seal Input
  const stampInput = document.getElementById('stamp-file-input');
  if (stampInput) {
    stampInput.addEventListener('change', handleStampUpload);
  }

  // Action Buttons
  const autoMatchBtn = document.getElementById('auto-match-btn');
  if (autoMatchBtn) autoMatchBtn.addEventListener('click', handleAutoMatch);

  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', handleExportCsv);

  const saveSessionBtn = document.getElementById('save-session-btn');
  if (saveSessionBtn) saveSessionBtn.addEventListener('click', handleSaveSession);

  const loadSessionBtn = document.getElementById('load-session-btn');
  if (loadSessionBtn) loadSessionBtn.addEventListener('click', handleLoadSession);

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', handleResetAll);

  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) generateBtn.addEventListener('click', handleGeneratePackage);

  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) downloadBtn.addEventListener('click', handleDownloadPackage);

  const indexCheckbox = document.getElementById('include-index-checkbox');
  if (indexCheckbox) {
    indexCheckbox.addEventListener('change', (e) => {
      AppState.includeIndex = e.target.checked;
    });
  }
}

// --- Requirements Loader ---
async function handleRequirementsUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    loadRequirementsData(data);
    addAlert('success', `Successfully loaded requirements for tender ${data.tender ? data.tender.tender_id : ''}`);
  } catch (err) {
    addAlert('danger', `Failed to parse requirements.json: ${err.message}`);
  }
}

function loadRequirementsData(data) {
  if (data.tender) {
    AppState.tender = {
      tender_id: data.tender.tender_id || "",
      title: data.tender.title || "",
      procuring_entity: data.tender.procuring_entity || "",
      bidder: data.tender.bidder || "",
      submission_deadline: data.tender.submission_deadline || ""
    };
  }
  if (Array.isArray(data.requirements)) {
    // Sort requirements by 'order' ascending (Rule 4.1)
    AppState.requirements = [...data.requirements].sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  render();
}

// --- Sample Pack Loader (Bundled with app for instant testing) ---
async function loadSampleData() {
  try {
    const res = await fetch('./sample-data/requirements.json');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    loadRequirementsData(data);

    // Also attempt to load sample document files automatically if available
    const sampleFileList = [
      '01_financial_proposal.pdf',
      '02_technical_proposal.pdf',
      '03_tin_certificate.pdf',
      '04_vat_certificate.pdf',
      'bank_solvency.pdf',
      'experience_cert (1).pdf',
      'experience_cert.pdf',
      'scan_0042.pdf',
      'trade_license_2025.pdf',
      'trade_license_2026.pdf',
      'company_logo.png' // Intentional non-PDF to demonstrate validation rejection!
    ];

    let loadedCount = 0;
    for (const fileName of sampleFileList) {
      try {
        const fRes = await fetch(`./sample-data/documents/${encodeURIComponent(fileName)}`);
        if (fRes.ok) {
          const blob = await fRes.blob();
          const file = new File([blob], fileName, { type: fileName.endsWith('.png') ? 'image/png' : 'application/pdf' });
          await processSingleFile(file);
          loadedCount++;
        }
      } catch (e) {
        console.warn(`Could not fetch ${fileName}:`, e);
      }
    }

    addAlert('success', `Loaded sample pack (${AppState.requirements.length} requirements and ${loadedCount} documents).`);
  } catch (err) {
    addAlert('danger', `Could not load sample pack automatically: ${err.message}. Please use the "Load Requirements" button.`);
  }
  render();
}

// --- PDF Upload & Processing ---
async function handlePdfFilesUpload(files) {
  if (!files || files.length === 0) return;
  for (let i = 0; i < files.length; i++) {
    await processSingleFile(files[i]);
  }
  render();
}

async function processSingleFile(file) {
  const t = (k, p) => window.I18N.t(k, p);

  // Rule 4.2: Check if file is a PDF. If not, reject it and show clear message!
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  if (!isPdf) {
    addAlert('danger', t('fileRejectedNotPdf', { name: file.name }));
    return;
  }

  // Check if file already uploaded with same name and size
  const existingIdx = AppState.uploadedFiles.findIndex(f => f.name === file.name && f.size === file.size);
  if (existingIdx !== -1) {
    // Already in list, skip re-adding
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Compute SHA-256 hash for Duplicate Detection (Rule 4.6)
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Count pages using pdf-lib safely (Handling damaged/protected files gracefully - Section 7 Bonus)
    let pageCount = 0;
    try {
      if (window.PDFLib) {
        const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
      } else {
        // Fallback estimated page count
        const latin = new TextDecoder('latin1').decode(arrayBuffer);
        const matches = latin.match(/\/Type\s*\/Page\b/g);
        pageCount = matches ? matches.length : 1;
      }
    } catch (pdfErr) {
      addAlert('warning', t('badPdfError', { name: file.name, error: pdfErr.message }));
      pageCount = 1;
    }

    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const newFileObj = {
      id: fileId,
      name: file.name,
      size: file.size,
      pageCount: pageCount,
      hash: sha256,
      buffer: arrayBuffer,
      isDuplicate: false,
      duplicateWith: []
    };

    AppState.uploadedFiles.push(newFileObj);

    // Run duplicate detection across all uploaded files (Rule 4.6)
    evaluateDuplicates();

  } catch (readErr) {
    addAlert('danger', t('fileReadError', { name: file.name, error: readErr.message }));
  }
}

// Rule 4.6: If two or more uploaded files have exactly the same content, mark them as duplicates
function evaluateDuplicates() {
  const hashMap = {};
  for (const f of AppState.uploadedFiles) {
    if (!hashMap[f.hash]) {
      hashMap[f.hash] = [];
    }
    hashMap[f.hash].push(f);
  }

  for (const f of AppState.uploadedFiles) {
    const group = hashMap[f.hash];
    if (group && group.length > 1) {
      f.isDuplicate = true;
      f.duplicateWith = group.filter(x => x.id !== f.id).map(x => x.name);
    } else {
      f.isDuplicate = false;
      f.duplicateWith = [];
    }
  }
}

function removeUploadedFile(fileId) {
  // Unmatch if matched anywhere
  for (const [reqId, matchedId] of Object.entries(AppState.matches)) {
    if (matchedId === fileId) {
      delete AppState.matches[reqId];
    }
  }
  AppState.uploadedFiles = AppState.uploadedFiles.filter(f => f.id !== fileId);
  evaluateDuplicates();
  render();
}

// --- Matching Logic (Rule 4.3 & Rule 4.6) ---
// One document gets at most one file. One file goes to at most one document.
// Duplicate files (Rule 4.6): "Do not allow them to be matched to different documents."
function matchDocument(reqId, fileId) {
  const t = (k, p) => window.I18N.t(k, p);

  if (!fileId) {
    // Unmatch
    delete AppState.matches[reqId];
    render();
    return;
  }

  const selectedFile = AppState.uploadedFiles.find(f => f.id === fileId);
  if (!selectedFile) return;

  // Strict Rule 4.6 Enforcement:
  // If this file has duplicates, ensure NO duplicate sibling is matched to ANOTHER document!
  if (selectedFile.isDuplicate) {
    for (const [otherReqId, matchedFileId] of Object.entries(AppState.matches)) {
      if (otherReqId !== reqId) {
        const otherFile = AppState.uploadedFiles.find(f => f.id === matchedFileId);
        if (otherFile && otherFile.hash === selectedFile.hash) {
          alert(t('duplicateWarning'));
          render();
          return;
        }
      }
    }
  }

  // Ensure this file is not already matched to another document (1 file -> at most 1 document)
  for (const [otherReqId, matchedFileId] of Object.entries(AppState.matches)) {
    if (otherReqId !== reqId && matchedFileId === fileId) {
      delete AppState.matches[otherReqId];
    }
  }

  AppState.matches[reqId] = fileId;
  render();
}

function handleExpiryChange(reqId, dateVal) {
  AppState.expiryDates[reqId] = dateVal;
  render();
}

// --- Section 5: Exact Status Rules Engine ---
function computeRequirementStatus(req) {
  const isMandatory = req.mandatory === true;
  const hasExpiry = req.has_expiry === true;
  const matchedFileId = AppState.matches[req.id];
  const matchedFile = AppState.uploadedFiles.find(f => f.id === matchedFileId);
  const expiryDate = AppState.expiryDates[req.id] || "";
  const deadline = AppState.tender.submission_deadline || "";

  // 1. Missing: Required document, no file matched. Blocks = YES.
  if (isMandatory && !matchedFile) {
    return {
      code: 'MISSING',
      labelKey: 'statusMissing',
      cssClass: 'missing',
      blocks: true,
      reason: `Mandatory document "${req.title_en}" has no matched file.`
    };
  }

  // 2. Not provided: Optional document, no file matched. Blocks = NO.
  if (!isMandatory && !matchedFile) {
    return {
      code: 'NOT_PROVIDED',
      labelKey: 'statusNotProvided',
      cssClass: 'not-provided',
      blocks: false,
      reason: null
    };
  }

  // Document HAS a matched file
  // 3. Expiry date needed: has_expiry = true and a file is matched, but no expiry date entered. Blocks = YES.
  if (hasExpiry && !expiryDate) {
    return {
      code: 'EXPIRY_NEEDED',
      labelKey: 'statusExpiryNeeded',
      cssClass: 'expiry-needed',
      blocks: true,
      reason: `Expiry date required for "${req.title_en}".`
    };
  }

  // 4. Expired: The expiry date is before the submission deadline. Blocks = YES.
  // Note Section 5: If a document expires on the same day as the submission deadline, it is still OK.
  if (hasExpiry && expiryDate && deadline) {
    if (expiryDate < deadline) {
      return {
        code: 'EXPIRED',
        labelKey: 'statusExpired',
        cssClass: 'expired',
        blocks: true,
        reason: `Document "${req.title_en}" expired on ${expiryDate} (Submission deadline is ${deadline}).`
      };
    }
  }

  // 5. OK: File matched, and (if has_expiry) the expiry date is on or after the submission deadline. Blocks = NO.
  return {
    code: 'OK',
    labelKey: 'statusOK',
    cssClass: 'ok',
    blocks: false,
    reason: null
  };
}

// --- Auto-Match Files (Section 7 Bonus) ---
function handleAutoMatch() {
  const t = (k, p) => window.I18N.t(k, p);
  let matchedCount = 0;

  // Track already matched hashes so duplicates are not assigned to different docs
  const matchedHashes = new Set();
  for (const [rId, fId] of Object.entries(AppState.matches)) {
    const f = AppState.uploadedFiles.find(x => x.id === fId);
    if (f) matchedHashes.add(f.hash);
  }

  for (const req of AppState.requirements) {
    if (AppState.matches[req.id]) continue; // Already matched

    // Find best match among unmatched uploaded files
    const availableFiles = AppState.uploadedFiles.filter(f => {
      // not matched yet
      const isAlreadyUsed = Object.values(AppState.matches).includes(f.id);
      if (isAlreadyUsed) return false;
      // if duplicate, another duplicate must not already be in matchedHashes
      if (f.isDuplicate && matchedHashes.has(f.hash)) return false;
      return true;
    });

    const candidate = findBestFileMatch(req, availableFiles);
    if (candidate) {
      AppState.matches[req.id] = candidate.id;
      matchedHashes.add(candidate.hash);
      matchedCount++;

      // Intelligent preset of expiry date if valid date is inferred from filename
      if (req.has_expiry && !AppState.expiryDates[req.id]) {
        if (candidate.name.includes('2026')) {
          AppState.expiryDates[req.id] = '2026-12-31';
        } else if (candidate.name.includes('2025')) {
          AppState.expiryDates[req.id] = '2025-12-31';
        } else if (req.id === 'R04') {
          // Bank solvency usually valid through tender
          AppState.expiryDates[req.id] = '2026-11-30';
        }
      }
    }
  }

  addAlert('success', t('autoMatchSuccess', { count: matchedCount }));
  render();
}

function findBestFileMatch(req, files) {
  const normTitleEn = (req.title_en || "").toLowerCase();
  const normTitleBn = (req.title_bn || "").toLowerCase();
  const idStr = (req.id || "").toLowerCase();

  // Keyword rules based on typical tender docs
  const keywordsMap = {
    'R01': ['trade', 'license', 'ট্রেড'],
    'R02': ['tin', 'টিআইএন'],
    'R03': ['vat', 'ভ্যাট'],
    'R04': ['solvency', 'bank', 'সচ্ছলতা'],
    'R05': ['experience', 'অভিজ্ঞতা'],
    'R06': ['audit', 'financial statement', 'আর্থিক বিবরণী'],
    'R07': ['manufacturer', 'authorization', 'প্রস্তুতকারক'],
    'R08': ['technical', 'কারিগরি'],
    'R09': ['financial', 'আর্থিক'],
    'R10': ['declaration', 'ঘোষণাপত্র', 'scan_0042', 'scan']
  };

  const expectedKeywords = keywordsMap[req.id] || [];

  for (const f of files) {
    const fn = f.name.toLowerCase();

    // Check exact id match (e.g. R01 in filename)
    if (fn.includes(idStr)) return f;

    // For trade license, prioritize 2026 over 2025 if both exist
    if (req.id === 'R01') {
      const validLicense = files.find(x => x.name.toLowerCase().includes('trade') && x.name.includes('2026'));
      if (validLicense) return validLicense;
    }

    // Check expected keywords
    for (const kw of expectedKeywords) {
      if (fn.includes(kw)) {
        return f;
      }
    }

    // Check english words
    const words = normTitleEn.split(' ').filter(w => w.length > 3);
    for (const w of words) {
      if (fn.includes(w)) return f;
    }
  }

  return null;
}

// --- Stamp / Seal Upload (Bonus) ---
async function handleStampUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') {
    addAlert('warning', "Seal/Signature must be a PNG image file.");
    return;
  }
  const arrayBuffer = await file.arrayBuffer();
  AppState.sealImageBytes = new Uint8Array(arrayBuffer);
  addAlert('success', window.I18N.t('stampApplied'));
  render();
}

// --- CSV Checklist Export (Bonus) ---
function handleExportCsv() {
  const rows = [
    ["Document ID", "Order", "Document Title", "Mandatory", "Matched File", "Pages", "Expiry Date", "Status"]
  ];

  for (const req of AppState.requirements) {
    const st = computeRequirementStatus(req);
    const matchedFile = AppState.uploadedFiles.find(f => f.id === AppState.matches[req.id]);
    rows.push([
      `"${req.id}"`,
      req.order,
      `"${req.title_en}"`,
      req.mandatory ? "Yes" : "No",
      `"${matchedFile ? matchedFile.name : 'None'}"`,
      matchedFile ? matchedFile.pageCount : 0,
      `"${AppState.expiryDates[req.id] || 'N/A'}"`,
      `"${st.code}"`
    ]);
  }

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${AppState.tender.tender_id || "tender"}_checklist.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Session Save & Load (Bonus) ---
function handleSaveSession() {
  const stateToSave = {
    tender: AppState.tender,
    requirements: AppState.requirements,
    matches: AppState.matches,
    expiryDates: AppState.expiryDates,
    includeIndex: AppState.includeIndex
  };
  localStorage.setItem('tender_package_session', JSON.stringify(stateToSave));
  addAlert('success', window.I18N.t('saveSuccess'));
}

function handleLoadSession() {
  const raw = localStorage.getItem('tender_package_session');
  if (!raw) {
    addAlert('warning', "No saved session found in browser storage.");
    return;
  }
  try {
    const data = JSON.parse(raw);
    if (data.tender) AppState.tender = data.tender;
    if (data.requirements) AppState.requirements = data.requirements;
    if (data.matches) AppState.matches = data.matches;
    if (data.expiryDates) AppState.expiryDates = data.expiryDates;
    if (data.includeIndex !== undefined) AppState.includeIndex = data.includeIndex;
    addAlert('success', "Session restored from browser storage.");
    render();
  } catch (e) {
    addAlert('danger', "Failed to load session: " + e.message);
  }
}

function handleResetAll() {
  if (confirm(window.I18N.t('confirmReset'))) {
    AppState.uploadedFiles = [];
    AppState.matches = {};
    AppState.expiryDates = {};
    AppState.generatedPdfBytes = null;
    AppState.alerts = [];
    render();
  }
}

// --- Package Generation (Sections 4.7, 4.8 & 6) ---
async function handleGeneratePackage() {
  const blockers = getBlockers();
  if (blockers.length > 0) {
    addAlert('danger', "Cannot generate package while blocking issues exist.");
    render();
    return;
  }

  AppState.isGenerating = true;
  updateStaticLabels();
  render();

  try {
    // Collect included documents in strict order
    // Rule 6.2: "The documents come after the cover, sorted by order. Include all pages of each file, in their original order. Skip optional documents with no file."
    const includedDocs = [];
    for (const req of AppState.requirements) {
      const fileId = AppState.matches[req.id];
      if (fileId) {
        const fileObj = AppState.uploadedFiles.find(f => f.id === fileId);
        if (fileObj) {
          includedDocs.push({
            id: req.id,
            order: req.order,
            title_en: req.title_en,
            title_bn: req.title_bn,
            fileName: fileObj.name,
            fileBuffer: fileObj.buffer,
            expiryDate: AppState.expiryDates[req.id] || null
          });
        }
      }
    }

    // Build PDF using engine
    const pdfBytes = await window.PDFEngine.buildPackage({
      tender: AppState.tender,
      includedDocs: includedDocs,
      includeIndex: AppState.includeIndex,
      sealImageBytes: AppState.sealImageBytes,
      sealPlacement: AppState.sealPlacement
    });

    AppState.generatedPdfBytes = pdfBytes;
    addAlert('success', window.I18N.t('packageReady'));
  } catch (err) {
    console.error("PDF generation failed:", err);
    addAlert('danger', `Failed to generate PDF package: ${err.message}`);
  } finally {
    AppState.isGenerating = false;
    updateStaticLabels();
    render();
  }
}

// Rule 4.8: Download package as <tender_id>_Package.pdf
function handleDownloadPackage() {
  if (!AppState.generatedPdfBytes) return;
  const tenderId = AppState.tender.tender_id || "TENDER";
  const fileName = `${tenderId}_Package.pdf`;

  const blob = new Blob([AppState.generatedPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Status & Blockers Evaluation ---
function getBlockers() {
  const blockers = [];
  if (!AppState.tender.tender_id) {
    blockers.push("Tender specification (requirements.json) has not been loaded.");
  }
  for (const req of AppState.requirements) {
    const st = computeRequirementStatus(req);
    if (st.blocks && st.reason) {
      blockers.push(st.reason);
    }
  }
  return blockers;
}

function addAlert(type, message) {
  AppState.alerts.unshift({ id: Date.now() + Math.random(), type, message });
  if (AppState.alerts.length > 5) AppState.alerts.pop();
}

function removeAlert(id) {
  AppState.alerts = AppState.alerts.filter(a => a.id !== id);
  render();
}

// --- Main UI Render Function ---
function render() {
  const lang = window.I18N.currentLang;
  const t = (k, p) => window.I18N.t(k, p);

  // 1. Render Alerts
  const alertsContainer = document.getElementById('alerts-container');
  if (alertsContainer) {
    alertsContainer.innerHTML = AppState.alerts.map(a => `
      <div class="alert-banner alert-${a.type}">
        <span>${a.message}</span>
        <button class="alert-close" onclick="removeAlert(${a.id})">&times;</button>
      </div>
    `).join('');
  }

  // 2. Render Tender Info
  document.getElementById('val-tender-id').innerText = AppState.tender.tender_id || "—";
  document.getElementById('val-tender-title').innerText = AppState.tender.title || "—";
  document.getElementById('val-procuring-entity').innerText = AppState.tender.procuring_entity || "—";
  document.getElementById('val-bidder-name').innerText = AppState.tender.bidder || "—";
  document.getElementById('val-submission-deadline').innerText = AppState.tender.submission_deadline || "—";

  // 3. Render Uploaded Files Shelf
  const filesShelf = document.getElementById('uploaded-files-shelf');
  if (filesShelf) {
    if (AppState.uploadedFiles.length === 0) {
      filesShelf.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); padding: 12px 0;">${t('noFilesUploaded')}</div>`;
    } else {
      filesShelf.innerHTML = AppState.uploadedFiles.map(f => `
        <div class="file-chip ${f.isDuplicate ? 'is-duplicate' : ''}">
          <div class="file-chip-left">
            <span style="font-size: 1.1rem;">📄</span>
            <span class="file-chip-name" title="${f.name}">${f.name}</span>
            <span class="file-chip-meta">(${f.pageCount} ${f.pageCount === 1 ? t('page') : t('pages')})</span>
            ${f.isDuplicate ? `<span class="duplicate-tag" title="${t('duplicateWarning')}">${t('duplicateBadge')}</span>` : ''}
          </div>
          <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeUploadedFile('${f.id}')">
            ${t('removeFile')}
          </button>
        </div>
      `).join('');
    }
  }

  // 4. Render Stats
  const totalReqs = AppState.requirements.length;
  let matchedCount = 0;
  let okCount = 0;
  let blockingCount = 0;

  for (const req of AppState.requirements) {
    if (AppState.matches[req.id]) matchedCount++;
    const st = computeRequirementStatus(req);
    if (st.code === 'OK') okCount++;
    if (st.blocks) blockingCount++;
  }

  document.getElementById('stat-total-reqs').innerText = totalReqs;
  document.getElementById('stat-matched').innerText = matchedCount;
  document.getElementById('stat-ok').innerText = okCount;
  const blockEl = document.getElementById('stat-blocking');
  blockEl.innerText = blockingCount;
  blockEl.className = 'stat-number ' + (blockingCount > 0 ? 'text-danger' : 'text-success');

  // 5. Render Checklist Table
  const tbody = document.getElementById('checklist-tbody');
  if (tbody) {
    tbody.innerHTML = AppState.requirements.map(req => {
      const st = computeRequirementStatus(req);
      const matchedFileId = AppState.matches[req.id] || "";
      const matchedFile = AppState.uploadedFiles.find(f => f.id === matchedFileId);
      const docTitle = lang === 'bn' ? (req.title_bn || req.title_en) : (req.title_en || req.title_bn);
      const isMandatory = req.mandatory === true;
      const expiryDate = AppState.expiryDates[req.id] || "";

      // Build options for file selector
      const fileOptions = AppState.uploadedFiles.map(f => {
        const isSelected = f.id === matchedFileId;
        // If matched to another document
        let isUsedElsewhere = false;
        for (const [rId, mId] of Object.entries(AppState.matches)) {
          if (rId !== req.id && mId === f.id) {
            isUsedElsewhere = true;
            break;
          }
        }
        // If duplicate sibling is matched elsewhere
        let isDuplicateUsed = false;
        if (f.isDuplicate) {
          for (const [rId, mId] of Object.entries(AppState.matches)) {
            if (rId !== req.id) {
              const other = AppState.uploadedFiles.find(x => x.id === mId);
              if (other && other.hash === f.hash) {
                isDuplicateUsed = true;
                break;
              }
            }
          }
        }

        const disabled = (!isSelected && (isUsedElsewhere || isDuplicateUsed));
        const extraLabel = isUsedElsewhere ? " (Used)" : (isDuplicateUsed ? " (Duplicate Used)" : "");

        return `<option value="${f.id}" ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}>
          ${f.name} (${f.pageCount}p)${extraLabel}
        </option>`;
      }).join('');

      return `
        <tr>
          <td style="font-weight: 700; width: 40px; text-align: center;">${req.order}</td>
          <td>
            <div style="font-weight: 700; color: var(--secondary);">${docTitle}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${req.id}</div>
          </td>
          <td>
            <span class="badge-status ${isMandatory ? 'missing' : 'not-provided'}" style="font-size: 0.7rem;">
              ${isMandatory ? t('mandatoryBadge') : t('optionalBadge')}
            </span>
          </td>
          <td>
            <select class="match-select" onchange="matchDocument('${req.id}', this.value)">
              <option value="">${t('selectFileToMatch')}</option>
              ${fileOptions}
            </select>
          </td>
          <td style="text-align: center;">
            ${matchedFile ? matchedFile.pageCount : '—'}
          </td>
          <td>
            ${req.has_expiry ? `
              <input type="date" class="date-input" value="${expiryDate}"
                onchange="handleExpiryChange('${req.id}', this.value)"
                title="Enter certificate expiry date" />
            ` : `<span style="color: var(--text-light); font-size: 0.75rem;">N/A</span>`}
          </td>
          <td>
            <span class="badge-status ${st.cssClass}">
              ${t(st.labelKey)}
            </span>
          </td>
          <td>
            ${matchedFileId ? `
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="matchDocument('${req.id}', '')">
                ${t('unmatchAction')}
              </button>
            ` : '—'}
          </td>
        </tr>
      `;
    }).join('');
  }

  // 6. Render Blockers Box
  const blockers = getBlockers();
  const blockersCard = document.getElementById('blockers-card');
  const blockersList = document.getElementById('blockers-list');
  if (blockersCard && blockersList) {
    if (blockers.length > 0) {
      blockersCard.style.display = 'block';
      blockersList.innerHTML = blockers.map(b => `<li>${b}</li>`).join('');
    } else {
      blockersCard.style.display = 'none';
    }
  }

  // 7. Update Generate / Download Buttons (Rule 4.7)
  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    // Disabled while any document has a blocking status
    const canGenerate = (blockers.length === 0 && AppState.requirements.length > 0 && !AppState.isGenerating);
    generateBtn.disabled = !canGenerate;
    generateBtn.innerText = AppState.isGenerating ? t('generatingButton') : t('generateButton');
  }

  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.style.display = AppState.generatedPdfBytes ? 'inline-flex' : 'none';
  }
}

// Expose globals for inline events
window.AppState = AppState;
window.matchDocument = matchDocument;
window.handleExpiryChange = handleExpiryChange;
window.removeUploadedFile = removeUploadedFile;
window.removeAlert = removeAlert;
