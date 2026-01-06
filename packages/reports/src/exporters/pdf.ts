/**
 * PDF Exporter
 *
 * Exports data to PDF format with:
 * - Page orientation (portrait/landscape)
 * - Page size (A4, Letter, Legal)
 * - Margins
 * - Title and watermark
 * - Auto-pagination
 * - Page numbers
 */

import PDFDocument from "pdfkit";
import type {
  ColumnConfig,
  Exporter,
  ExportResult,
  PdfOptions,
  ReportFormat,
} from "../types";
import { formatValue, getAccessor } from "./utils";

// Page sizes in points (72 points per inch)
const PAGE_SIZES = {
  a4: [595.28, 841.89] as [number, number],
  letter: [612, 792] as [number, number],
  legal: [612, 1008] as [number, number],
  a3: [841.89, 1190.55] as [number, number],
};

interface PdfLayout {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  contentWidth: number;
  colWidth: number;
  rowHeight: number;
}

export class PdfExporter<T = unknown> implements Exporter<T> {
  readonly format: ReportFormat = "pdf";
  readonly mimeType = "application/pdf";
  readonly extension = ".pdf";

  async export(
    data: T[],
    columns: ColumnConfig[],
    options?: PdfOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const visibleColumns = columns.filter((col) => !col.hidden);
    const layout = this.calculateLayout(options, visibleColumns.length);

    const doc = this.createDocument(layout);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    let currentY = this.renderHeader(doc, options, layout);
    currentY = this.renderTableHeader(doc, visibleColumns, layout, currentY);
    this.renderDataRows(doc, data, visibleColumns, options, layout, currentY);

    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return {
      success: true,
      buffer,
      mimeType: this.mimeType,
      filename: `export-${Date.now()}${this.extension}`,
      size: buffer.length,
      rowCount: data.length,
      duration: Date.now() - startTime,
    };
  }

  private calculateLayout(
    options: PdfOptions | undefined,
    columnCount: number
  ): PdfLayout {
    const orientation = options?.orientation ?? "portrait";
    const pageSize = options?.pageSize ?? "a4";
    const marginTop = options?.marginTop ?? 50;
    const marginRight = options?.marginRight ?? 50;
    const marginBottom = options?.marginBottom ?? 50;
    const marginLeft = options?.marginLeft ?? 50;

    let [width, height] = PAGE_SIZES[pageSize];
    if (orientation === "landscape") {
      [width, height] = [height, width];
    }

    const contentWidth = width - marginLeft - marginRight;
    const colWidth = contentWidth / columnCount;

    return {
      width,
      height,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      contentWidth,
      colWidth,
      rowHeight: 20,
    };
  }

  private createDocument(layout: PdfLayout): PDFKit.PDFDocument {
    return new PDFDocument({
      size: [layout.width, layout.height],
      margins: {
        top: layout.marginTop,
        right: layout.marginRight,
        bottom: layout.marginBottom,
        left: layout.marginLeft,
      },
    });
  }

  private renderHeader(
    doc: PDFKit.PDFDocument,
    options: PdfOptions | undefined,
    layout: PdfLayout
  ): number {
    let currentY = layout.marginTop;
    const includeTimestamp = options?.includeTimestamp ?? true;

    if (options?.title) {
      doc.fontSize(18).font("Helvetica-Bold");
      doc.text(options.title, layout.marginLeft, currentY, {
        width: layout.contentWidth,
        align: "center",
      });
      currentY += 30;
    }

    if (options?.subtitle) {
      doc.fontSize(12).font("Helvetica");
      doc.text(options.subtitle, layout.marginLeft, currentY, {
        width: layout.contentWidth,
        align: "center",
      });
      currentY += 20;
    }

    if (includeTimestamp) {
      doc.fontSize(10).font("Helvetica");
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        layout.marginLeft,
        currentY,
        { width: layout.contentWidth, align: "right" }
      );
      currentY += 20;
    }

    return currentY + 10;
  }

  private renderTableHeader(
    doc: PDFKit.PDFDocument,
    columns: ColumnConfig[],
    layout: PdfLayout,
    startY: number
  ): number {
    doc.fontSize(10).font("Helvetica-Bold");
    this.drawTableRow(
      doc,
      columns.map((c) => c.header),
      layout.marginLeft,
      startY,
      layout.colWidth,
      layout.rowHeight,
      true
    );
    return startY + layout.rowHeight;
  }

  private renderDataRows(
    doc: PDFKit.PDFDocument,
    data: T[],
    columns: ColumnConfig[],
    options: PdfOptions | undefined,
    layout: PdfLayout,
    startY: number
  ): void {
    const includePageNumbers = options?.includePageNumbers ?? true;
    let currentY = startY;
    let pageNumber = 1;

    doc.font("Helvetica");

    for (const row of data) {
      if (
        currentY + layout.rowHeight >
        layout.height - layout.marginBottom - 20
      ) {
        if (includePageNumbers) {
          this.addPageNumber(
            doc,
            pageNumber,
            layout.width,
            layout.height,
            layout.marginBottom
          );
        }
        doc.addPage();
        pageNumber++;
        currentY = layout.marginTop;
        currentY = this.renderTableHeader(doc, columns, layout, currentY);
        doc.font("Helvetica");
      }

      const values = columns.map((col) => {
        const accessor = getAccessor<T>(col);
        return formatValue(accessor(row), col);
      });

      this.drawTableRow(
        doc,
        values,
        layout.marginLeft,
        currentY,
        layout.colWidth,
        layout.rowHeight,
        false
      );
      currentY += layout.rowHeight;
    }

    if (includePageNumbers) {
      this.addPageNumber(
        doc,
        pageNumber,
        layout.width,
        layout.height,
        layout.marginBottom
      );
    }

    if (options?.watermark) {
      doc.fontSize(60).fillOpacity(0.1);
      doc.text(options.watermark, layout.width / 4, layout.height / 2, {
        width: layout.width / 2,
        align: "center",
      });
    }
  }

  private drawTableRow(
    doc: PDFKit.PDFDocument,
    values: string[],
    x: number,
    y: number,
    colWidth: number,
    rowHeight: number,
    isHeader: boolean
  ): void {
    // Draw background for header
    if (isHeader) {
      doc
        .fillColor("#e0e0e0")
        .rect(x, y, colWidth * values.length, rowHeight)
        .fill();
      doc.fillColor("#000000");
    }

    // Draw cell borders and text
    for (let i = 0; i < values.length; i++) {
      const cellX = x + i * colWidth;
      doc.rect(cellX, y, colWidth, rowHeight).stroke();
      doc.text(values[i] ?? "", cellX + 5, y + 5, {
        width: colWidth - 10,
        height: rowHeight - 10,
        ellipsis: true,
      });
    }
  }

  private addPageNumber(
    doc: PDFKit.PDFDocument,
    pageNumber: number,
    width: number,
    height: number,
    marginBottom: number
  ): void {
    doc.fontSize(10);
    doc.text(`Page ${pageNumber}`, 0, height - marginBottom + 10, {
      width,
      align: "center",
    });
  }
}
