// PDF Generation Engine using pdf-lib
// Complies strictly with Problem Statement Section 6 and Bonus Section 7

const PDFEngine = {
  /**
   * Generates the complete tender package PDF
   * @param {Object} options
   * @param {Object} options.tender - Tender metadata (tender_id, title, procuring_entity, bidder, submission_deadline)
   * @param {Array} options.includedDocs - Array of matched requirements sorted by order
   * @param {boolean} options.includeIndex - Whether to include Table of Contents / Index page
   * @param {Uint8Array|null} options.sealImageBytes - Optional PNG seal/signature
   * @param {string} options.sealPlacement - 'cover' | 'last' | 'all'
   * @returns {Promise<Uint8Array>}
   */
  async buildPackage({ tender, includedDocs, includeIndex = true, sealImageBytes = null, sealPlacement = 'cover' }) {
    if (!window.PDFLib) {
      throw new Error("pdf-lib library is not loaded. Please ensure pdf-lib.min.js is available.");
    }
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

    const mergedPdf = await PDFDocument.create();
    const helvetica = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await mergedPdf.embedFont(StandardFonts.HelveticaOblique);

    // Embed seal image if provided
    let embeddedSeal = null;
    if (sealImageBytes) {
      try {
        embeddedSeal = await mergedPdf.embedPng(sealImageBytes);
      } catch (e) {
        console.warn("Could not embed PNG seal:", e);
      }
    }

    const todayDate = new Date().toISOString().split('T')[0];

    // Calculate document pages and starting page numbers
    // Cover page is Page 1.
    // If includeIndex is true, Index is Page 2, so documents start on Page 3.
    // Otherwise documents start on Page 2.
    let startPageOffset = 1; // Cover is page 1
    if (includeIndex) {
      startPageOffset = 2; // Index is page 2
    }

    const docIndexMap = [];
    let currentDocStartPage = startPageOffset + 1;

    // Load and prepare each document's pages
    const loadedDocPages = [];
    for (const doc of includedDocs) {
      const docPdf = await PDFDocument.load(doc.fileBuffer, { ignoreEncryption: true });
      const pageIndices = docPdf.getPageIndices();
      const pageCount = pageIndices.length;

      docIndexMap.push({
        id: doc.id,
        order: doc.order,
        title_en: doc.title_en,
        fileName: doc.fileName,
        pageCount: pageCount,
        startPage: currentDocStartPage,
        endPage: currentDocStartPage + pageCount - 1,
        expiryDate: doc.expiryDate || 'N/A'
      });

      loadedDocPages.push({
        docInfo: doc,
        sourcePdf: docPdf,
        pageIndices: pageIndices
      });

      currentDocStartPage += pageCount;
    }

    // --- 1. COVER PAGE (Page 1) - Section 6.1 (Strictly in English) ---
    const coverPage = mergedPdf.addPage([595.28, 841.89]); // Standard A4 (points)
    const { width: cW, height: cH } = coverPage.getSize();

    // Top Header Banner
    coverPage.drawRectangle({
      x: 36,
      y: cH - 84,
      width: cW - 72,
      height: 48,
      color: rgb(0.12, 0.23, 0.38) // Deep Navy
    });

    coverPage.drawText("TENDER SUBMISSION PACKAGE", {
      x: 52,
      y: cH - 55,
      size: 16,
      font: helveticaBold,
      color: rgb(1, 1, 1)
    });

    coverPage.drawText("OFFICIAL BID COMPLIANCE DOSSIER", {
      x: 52,
      y: cH - 72,
      size: 9,
      font: helvetica,
      color: rgb(0.8, 0.88, 0.98)
    });

    // Tender Details Card
    const cardTop = cH - 100;
    const cardHeight = 135;
    coverPage.drawRectangle({
      x: 36,
      y: cardTop - cardHeight,
      width: cW - 72,
      height: cardHeight,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1
    });

    const metaFields = [
      { label: "Tender ID:", val: tender.tender_id || "N/A" },
      { label: "Tender Title:", val: tender.title || "N/A" },
      { label: "Procuring Entity:", val: tender.procuring_entity || "N/A" },
      { label: "Bidder Name:", val: tender.bidder || "N/A" },
      { label: "Submission Deadline:", val: tender.submission_deadline || "N/A" },
      { label: "Date Package Created:", val: todayDate }
    ];

    let metaY = cardTop - 22;
    for (const item of metaFields) {
      coverPage.drawText(item.label, {
        x: 52,
        y: metaY,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.2, 0.25, 0.3)
      });
      // Truncate or fit value cleanly
      const maxValWidth = cW - 240;
      let displayVal = item.val;
      if (helvetica.widthOfTextAtSize(displayVal, 9.5) > maxValWidth) {
        while (displayVal.length > 3 && helvetica.widthOfTextAtSize(displayVal + '...', 9.5) > maxValWidth) {
          displayVal = displayVal.slice(0, -1);
        }
        displayVal += '...';
      }
      coverPage.drawText(displayVal, {
        x: 180,
        y: metaY,
        size: 9.5,
        font: helvetica,
        color: rgb(0.1, 0.15, 0.2)
      });
      metaY -= 19;
    }

    // Section 6.1: List of included documents in order
    const tableTop = cardTop - cardHeight - 24;
    coverPage.drawText("Included Documents Schedule (In Order of Submission)", {
      x: 36,
      y: tableTop,
      size: 11,
      font: helveticaBold,
      color: rgb(0.12, 0.23, 0.38)
    });

    // Table Header
    const tHeaderY = tableTop - 20;
    coverPage.drawRectangle({
      x: 36,
      y: tHeaderY - 5,
      width: cW - 72,
      height: 20,
      color: rgb(0.9, 0.93, 0.97)
    });

    coverPage.drawText("#", { x: 44, y: tHeaderY, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
    coverPage.drawText("Document Title", { x: 65, y: tHeaderY, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
    coverPage.drawText("Matched File", { x: 270, y: tHeaderY, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
    coverPage.drawText("Pages", { x: 450, y: tHeaderY, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
    coverPage.drawText("Expiry Date", { x: 500, y: tHeaderY, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });

    let rowY = tHeaderY - 20;
    for (let i = 0; i < docIndexMap.length; i++) {
      const doc = docIndexMap[i];
      // Alternate row background
      if (i % 2 === 1) {
        coverPage.drawRectangle({
          x: 36,
          y: rowY - 4,
          width: cW - 72,
          height: 18,
          color: rgb(0.98, 0.98, 0.99)
        });
      }

      coverPage.drawText(String(doc.order), { x: 44, y: rowY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });

      let title = doc.title_en;
      if (helvetica.widthOfTextAtSize(title, 8.5) > 195) {
        title = title.substring(0, 32) + '...';
      }
      coverPage.drawText(title, { x: 65, y: rowY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });

      let fname = doc.fileName;
      if (helvetica.widthOfTextAtSize(fname, 8) > 170) {
        fname = fname.substring(0, 26) + '...';
      }
      coverPage.drawText(fname, { x: 270, y: rowY, size: 8, font: helveticaOblique, color: rgb(0.3, 0.35, 0.4) });

      coverPage.drawText(String(doc.pageCount), { x: 458, y: rowY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      coverPage.drawText(doc.expiryDate, { x: 500, y: rowY, size: 8.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });

      rowY -= 19;
      if (rowY < 90) break; // Keep safe bottom margin for footer
    }

    // Seal on Cover Page if selected
    if (embeddedSeal && (sealPlacement === 'cover' || sealPlacement === 'all')) {
      const sealDims = embeddedSeal.scaleToFit(90, 45);
      coverPage.drawImage(embeddedSeal, {
        x: cW - 36 - sealDims.width - 15,
        y: 45,
        width: sealDims.width,
        height: sealDims.height,
        opacity: 0.85
      });
    }

    // --- 2. INDEX / TABLE OF CONTENTS PAGE (Section 7 Bonus) ---
    if (includeIndex) {
      const indexPage = mergedPdf.addPage([595.28, 841.89]);
      const { width: iW, height: iH } = indexPage.getSize();

      indexPage.drawRectangle({
        x: 36,
        y: iH - 74,
        width: iW - 72,
        height: 38,
        color: rgb(0.16, 0.28, 0.44)
      });

      indexPage.drawText("TABLE OF CONTENTS / DOCUMENT INDEX", {
        x: 52,
        y: iH - 50,
        size: 13,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });

      indexPage.drawText("Tender Dossier Sequence & Page Navigation", {
        x: 52,
        y: iH - 64,
        size: 8.5,
        font: helvetica,
        color: rgb(0.85, 0.9, 0.98)
      });

      const iTableHeaderY = iH - 100;
      indexPage.drawRectangle({
        x: 36,
        y: iTableHeaderY - 5,
        width: iW - 72,
        height: 22,
        color: rgb(0.9, 0.93, 0.97)
      });

      indexPage.drawText("Order", { x: 44, y: iTableHeaderY + 2, size: 9, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
      indexPage.drawText("Document Title", { x: 80, y: iTableHeaderY + 2, size: 9, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
      indexPage.drawText("File Name", { x: 280, y: iTableHeaderY + 2, size: 9, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
      indexPage.drawText("Pages", { x: 440, y: iTableHeaderY + 2, size: 9, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });
      indexPage.drawText("Starts at Page", { x: 490, y: iTableHeaderY + 2, size: 9, font: helveticaBold, color: rgb(0.2, 0.25, 0.3) });

      let iRowY = iTableHeaderY - 22;
      for (let i = 0; i < docIndexMap.length; i++) {
        const item = docIndexMap[i];
        if (i % 2 === 1) {
          indexPage.drawRectangle({
            x: 36,
            y: iRowY - 4,
            width: iW - 72,
            height: 20,
            color: rgb(0.98, 0.98, 0.99)
          });
        }

        indexPage.drawText(String(item.order), { x: 48, y: iRowY + 1, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        indexPage.drawText(item.title_en, { x: 80, y: iRowY + 1, size: 9, font: helveticaBold, color: rgb(0.1, 0.15, 0.2) });
        indexPage.drawText(item.fileName, { x: 280, y: iRowY + 1, size: 8.5, font: helveticaOblique, color: rgb(0.35, 0.4, 0.45) });
        indexPage.drawText(String(item.pageCount), { x: 448, y: iRowY + 1, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        indexPage.drawText(`Page ${item.startPage}`, { x: 505, y: iRowY + 1, size: 9, font: helveticaBold, color: rgb(0.12, 0.4, 0.75) });

        iRowY -= 22;
      }
    }

    // --- 3. MERGE DOCUMENT PAGES (Section 6.2) ---
    // Append in strict order, keeping all pages of each file
    for (const item of loadedDocPages) {
      const copiedPages = await mergedPdf.copyPages(item.sourcePdf, item.pageIndices);
      for (let pIdx = 0; pIdx < copiedPages.length; pIdx++) {
        const page = copiedPages[pIdx];
        mergedPdf.addPage(page);
      }
    }

    // Total number of pages in final package (Y)
    const totalPages = mergedPdf.getPageCount();

    // --- 4. FOOTERS ON EVERY PAGE (Section 6.3 & 6.4) ---
    // Format: <tender_id> | Page X of Y
    // Easy to read and must not cover the document's content
    for (let i = 0; i < totalPages; i++) {
      const page = mergedPdf.getPage(i);
      const { width: pW, height: pH } = page.getSize();

      const tenderId = tender.tender_id || "TENDER";
      const footerText = `${tenderId} | Page ${i + 1} of ${totalPages}`;
      const footerFontSize = 8.5;
      const textWidth = helvetica.widthOfTextAtSize(footerText, footerFontSize);

      // Clean bottom margin background bar (semi-transparent or white backing to ensure readability)
      // Placed at the very bottom margin (y = 12 to 28)
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pW,
        height: 28,
        color: rgb(1, 1, 1),
        opacity: 0.92
      });

      // Subtle divider line
      page.drawRectangle({
        x: 36,
        y: 28,
        width: pW - 72,
        height: 0.6,
        color: rgb(0.82, 0.86, 0.9)
      });

      // Left notice
      page.drawText("Official Tender Submission Package", {
        x: 36,
        y: 11,
        size: 7.5,
        font: helveticaOblique,
        color: rgb(0.55, 0.6, 0.65)
      });

      // Right-aligned / Center footer text
      page.drawText(footerText, {
        x: pW - 36 - textWidth,
        y: 11,
        size: footerFontSize,
        font: helveticaBold,
        color: rgb(0.18, 0.24, 0.32)
      });

      // Seal placement on last page or all pages
      if (embeddedSeal) {
        if (sealPlacement === 'all' && i > 0) {
          const sealDims = embeddedSeal.scaleToFit(70, 35);
          page.drawImage(embeddedSeal, {
            x: pW - 36 - sealDims.width,
            y: 35,
            width: sealDims.width,
            height: sealDims.height,
            opacity: 0.8
          });
        } else if (sealPlacement === 'last' && i === totalPages - 1) {
          const sealDims = embeddedSeal.scaleToFit(80, 40);
          page.drawImage(embeddedSeal, {
            x: pW - 36 - sealDims.width,
            y: 35,
            width: sealDims.width,
            height: sealDims.height,
            opacity: 0.85
          });
        }
      }
    }

    const pdfBytes = await mergedPdf.save();
    return pdfBytes;
  }
};

window.PDFEngine = PDFEngine;
