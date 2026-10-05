import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeightRule,
  TextRun,
  ImageRun,
  convertMillimetersToTwip,
  BorderStyle,
} from 'docx';

export interface DocxCardItem {
  qrBase64: string;
  orgText?: string;
  codeText: string;
  badgeText?: string;
  titleText: string;
  locOrExpText: string;
}

function base64ToUint8Array(base64Data: string): Uint8Array {
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binaryString = window.atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } else {
    return Buffer.from(cleanBase64, 'base64');
  }
}

export async function generateStickerDocxBlob(
  cards: (DocxCardItem | null)[],
  options?: { startPosition?: number; showBorders?: boolean }
): Promise<Blob> {
  const startOffset = Math.max(0, (options?.startPosition || 1) - 1);
  const effectiveCards: (DocxCardItem | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    effectiveCards.push(null);
  }
  effectiveCards.push(...cards);

  const CARDS_PER_PAGE = 40;
  const totalSheets = Math.ceil(effectiveCards.length / CARDS_PER_PAGE) || 1;

  const sections: any[] = [];

  const cellBorder = options?.showBorders
    ? {
        style: BorderStyle.DASHED,
        size: 1,
        color: 'CBD5E1',
      }
    : {
        style: BorderStyle.NONE,
        size: 0,
        color: 'FFFFFF',
      };

  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF',
  };

  for (let s = 0; s < totalSheets; s++) {
    const sheetCards = effectiveCards.slice(s * CARDS_PER_PAGE, (s + 1) * CARDS_PER_PAGE);
    while (sheetCards.length < CARDS_PER_PAGE) {
      sheetCards.push(null);
    }

    const tableRows: TableRow[] = [];

    for (let r = 0; r < 8; r++) {
      const rowCards = sheetCards.slice(r * 5, (r + 1) * 5);
      const cells: TableCell[] = [];

      for (let c = 0; c < 5; c++) {
        const item = rowCards[c];

        let cellContent: Paragraph[] = [];

        if (item && item.qrBase64) {
          try {
            const qrBytes = base64ToUint8Array(item.qrBase64);
            const innerTable = new Table({
              width: { size: convertMillimetersToTwip(38), type: WidthType.DXA },
              borders: {
                top: noBorder,
                bottom: noBorder,
                left: noBorder,
                right: noBorder,
                insideHorizontal: noBorder,
                insideVertical: noBorder,
              },
              rows: [
                new TableRow({
                  children: [
                    // Left QR Column
                    new TableCell({
                      width: { size: convertMillimetersToTwip(14), type: WidthType.DXA },
                      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                      children: [
                        new Paragraph({
                          children: [
                            new ImageRun({
                              data: qrBytes,
                              transformation: { width: 48, height: 48 },
                              type: 'png',
                            }),
                          ],
                        }),
                      ],
                    }),
                    // Right Info Column
                    new TableCell({
                      width: { size: convertMillimetersToTwip(24), type: WidthType.DXA },
                      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: item.orgText || 'คณะพยาบาลศาสตร์ มก.',
                              size: 10,
                              bold: true,
                              color: '0F766E',
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: item.codeText,
                              size: 11,
                              bold: true,
                              color: '0F172A',
                            }),
                            item.badgeText
                              ? new TextRun({
                                  text: ` ${item.badgeText}`,
                                  size: 9,
                                  bold: true,
                                  color: '0D9488',
                                })
                              : new TextRun({ text: '' }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: item.titleText.length > 25 ? `${item.titleText.substring(0, 24)}...` : item.titleText,
                              size: 10,
                              color: '334155',
                            }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: item.locOrExpText,
                              size: 9,
                              bold: true,
                              color: 'E11D48',
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            });

            cellContent = [
              new Paragraph({
                children: [],
              }),
            ];
            cells.push(
              new TableCell({
                width: { size: convertMillimetersToTwip(38), type: WidthType.DXA },
                borders: {
                  top: cellBorder,
                  bottom: cellBorder,
                  left: cellBorder,
                  right: cellBorder,
                },
                children: [innerTable as any],
              })
            );
          } catch (e) {
            cells.push(
              new TableCell({
                width: { size: convertMillimetersToTwip(38), type: WidthType.DXA },
                borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
                children: [new Paragraph({ text: item.titleText })],
              })
            );
          }
        } else {
          cells.push(
            new TableCell({
              width: { size: convertMillimetersToTwip(38), type: WidthType.DXA },
              borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
              children: [new Paragraph({ text: '' })],
            })
          );
        }

        // Spacer column between stickers (3 mm)
        if (c < 4) {
          cells.push(
            new TableCell({
              width: { size: convertMillimetersToTwip(3), type: WidthType.DXA },
              borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
              children: [new Paragraph({ text: '' })],
            })
          );
        }
      }

      tableRows.push(
        new TableRow({
          height: { value: convertMillimetersToTwip(21), rule: HeightRule.EXACT },
          children: cells,
        })
      );
    }

    const mainTable = new Table({
      width: { size: convertMillimetersToTwip(202), type: WidthType.DXA },
      borders: {
        top: noBorder,
        bottom: noBorder,
        left: noBorder,
        right: noBorder,
        insideHorizontal: noBorder,
        insideVertical: noBorder,
      },
      rows: tableRows,
    });

    sections.push({
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(205),
            height: convertMillimetersToTwip(175),
            orientation: 'landscape' as const,
          },
          margin: {
            top: convertMillimetersToTwip(3.5),
            bottom: convertMillimetersToTwip(3.5),
            left: convertMillimetersToTwip(1.5),
            right: convertMillimetersToTwip(1.5),
          },
        },
      },
      children: [mainTable],
    });
  }

  const doc = new Document({
    sections,
  });

  return await Packer.toBlob(doc);
}

export async function downloadStickerDocx(
  filename: string,
  cards: (DocxCardItem | null)[],
  options?: { startPosition?: number; showBorders?: boolean }
) {
  const blob = await generateStickerDocxBlob(cards, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
