type ZipEntry = { method: number; data: Uint8Array };

function findEocd(bytes: Uint8Array) {
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index--) {
    if (bytes[index] === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06) return index;
  }
  throw new Error("Invalid .xlsx file.");
}

async function openZip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocd = findEocd(bytes);
  const count = view.getUint16(eocd + 10, true);
  const offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: Record<string, ZipEntry> = {};
  let pointer = offset;
  for (let index = 0; index < count; index++) {
    if (view.getUint32(pointer, true) !== 0x02014b50) throw new Error("Invalid .xlsx central directory.");
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.slice(pointer + 46, pointer + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    entries[name] = { method, data: bytes.slice(start, start + compressedSize) };
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return {
    async get(name: string) {
      const entry = entries[name];
      if (!entry) return null;
      if (entry.method === 0) return entry.data;
      if (entry.method !== 8 || typeof DecompressionStream === "undefined") return null;
      const stream = new Blob([new Uint8Array(entry.data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    },
  };
}

function dirname(path: string) { const index = path.lastIndexOf("/"); return index >= 0 ? path.slice(0, index) : ""; }
function basename(path: string) { const index = path.lastIndexOf("/"); return index >= 0 ? path.slice(index + 1) : path; }
function resolvePath(base: string, target: string) {
  if (target.startsWith("/")) return target.slice(1);
  const output: string[] = [];
  for (const part of `${dirname(base)}/${target}`.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") output.pop(); else output.push(part);
  }
  return output.join("/");
}
function relsPath(path: string) { return `${dirname(path)}/_rels/${basename(path)}.rels`; }
function mime(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/jpeg";
}
function relationshipId(node: Element) {
  return node.getAttribute("r:id") || node.getAttribute("r:embed") ||
    node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ||
    node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed") || "";
}

export type EmbeddedExcelImage = { row: number; col: number; file: File };

export async function extractEmbeddedExcelImages(buffer: ArrayBuffer): Promise<EmbeddedExcelImage[]> {
  const zip = await openZip(buffer);
  const decoder = new TextDecoder();
  const workbookBytes = await zip.get("xl/workbook.xml");
  if (!workbookBytes) return [];
  const workbook = new DOMParser().parseFromString(decoder.decode(workbookBytes), "application/xml");
  const firstSheet = workbook.getElementsByTagNameNS("*", "sheet")[0];
  if (!firstSheet) return [];
  const sheetRid = relationshipId(firstSheet);
  let sheetPath = "xl/worksheets/sheet1.xml";
  const workbookRelsBytes = await zip.get("xl/_rels/workbook.xml.rels");
  if (workbookRelsBytes && sheetRid) {
    const rels = new DOMParser().parseFromString(decoder.decode(workbookRelsBytes), "application/xml");
    const relation = [...rels.getElementsByTagNameNS("*", "Relationship")].find((item) => item.getAttribute("Id") === sheetRid);
    if (relation) sheetPath = resolvePath("xl/workbook.xml", relation.getAttribute("Target") || "worksheets/sheet1.xml");
  }
  const sheetBytes = await zip.get(sheetPath);
  if (!sheetBytes) return [];
  const sheet = new DOMParser().parseFromString(decoder.decode(sheetBytes), "application/xml");
  const drawing = sheet.getElementsByTagNameNS("*", "drawing")[0];
  if (!drawing) return [];
  const drawingRid = relationshipId(drawing);
  const sheetRelsBytes = await zip.get(relsPath(sheetPath));
  if (!sheetRelsBytes || !drawingRid) return [];
  const sheetRels = new DOMParser().parseFromString(decoder.decode(sheetRelsBytes), "application/xml");
  const drawingRelation = [...sheetRels.getElementsByTagNameNS("*", "Relationship")].find((item) => item.getAttribute("Id") === drawingRid);
  if (!drawingRelation) return [];
  const drawingPath = resolvePath(sheetPath, drawingRelation.getAttribute("Target") || "");
  const [drawingBytes, drawingRelsBytes] = await Promise.all([zip.get(drawingPath), zip.get(relsPath(drawingPath))]);
  if (!drawingBytes || !drawingRelsBytes) return [];
  const drawingDoc = new DOMParser().parseFromString(decoder.decode(drawingBytes), "application/xml");
  const drawingRels = new DOMParser().parseFromString(decoder.decode(drawingRelsBytes), "application/xml");
  const relMap = new Map([...drawingRels.getElementsByTagNameNS("*", "Relationship")].map((item) => [item.getAttribute("Id") || "", item.getAttribute("Target") || ""]));
  const anchors = [...drawingDoc.getElementsByTagNameNS("*", "twoCellAnchor"), ...drawingDoc.getElementsByTagNameNS("*", "oneCellAnchor")];
  const images: EmbeddedExcelImage[] = [];
  for (const anchor of anchors) {
    const from = anchor.getElementsByTagNameNS("*", "from")[0];
    const row = Number(from?.getElementsByTagNameNS("*", "row")[0]?.textContent || 0) + 1;
    const col = Number(from?.getElementsByTagNameNS("*", "col")[0]?.textContent || 0);
    const blip = anchor.getElementsByTagNameNS("*", "blip")[0];
    const target = relMap.get(relationshipId(blip));
    if (!target) continue;
    const mediaPath = resolvePath(drawingPath, target);
    const bytes = await zip.get(mediaPath);
    if (!bytes) continue;
    images.push({ row, col, file: new File([new Uint8Array(bytes)], basename(mediaPath), { type: mime(mediaPath) }) });
  }
  return images;
}
