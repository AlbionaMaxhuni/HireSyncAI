import mammoth from 'mammoth'
import { createRequire } from 'module'

export type ParsedResume = {
  text: string
}

type Pdf2JsonTextRun = {
  T?: string
}

type Pdf2JsonText = {
  R?: Pdf2JsonTextRun[]
}

type Pdf2JsonPage = {
  Texts?: Pdf2JsonText[]
}

type Pdf2JsonData = {
  Pages?: Pdf2JsonPage[]
}

type Pdf2JsonError = {
  parserError?: string
}

type PdfParserInstance = {
  on(event: 'pdfParser_dataError', handler: (error: Pdf2JsonError) => void): void
  on(event: 'pdfParser_dataReady', handler: (data: Pdf2JsonData) => void): void
  parseBuffer(buffer: Buffer): void
}

type PdfParserConstructor = new () => PdfParserInstance

function normalizeText(t: string) {
  return t
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function parsePdfWithPdf2Json(bytes: ArrayBuffer): Promise<string> {
  const require = createRequire(import.meta.url)
  const PDFParser = require('pdf2json') as PdfParserConstructor

  const pdfParser = new PDFParser()

  return await new Promise<string>((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', (err) => {
      reject(new Error(err?.parserError ?? 'PDF parse error'))
    })

    pdfParser.on('pdfParser_dataReady', (data) => {
      try {
        // Extract text from pages
        const pages = data?.Pages ?? []
        const texts: string[] = []

        for (const p of pages) {
          const t = p?.Texts ?? []
          for (const item of t) {
            // pdf2json stores URL-encoded chunks in R[0].T
            const r0 = item?.R?.[0]?.T
            if (typeof r0 === 'string' && r0.length) {
              texts.push(decodeURIComponent(r0))
            }
          }
          texts.push('\n')
        }

        resolve(texts.join(' '))
      } catch (e: unknown) {
        reject(new Error(e instanceof Error ? e.message : 'Failed to extract PDF text'))
      }
    })

    // pdf2json expects Buffer
    pdfParser.parseBuffer(Buffer.from(bytes))
  })
}

export async function parseResume(fileName: string, bytes: ArrayBuffer): Promise<ParsedResume> {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.pdf')) {
    const text = await parsePdfWithPdf2Json(bytes)
    return { text: normalizeText(text || '') }
  }

  if (lower.endsWith('.docx')) {
    const buffer = Buffer.from(bytes)
    const result = await mammoth.extractRawText({ buffer })
    return { text: normalizeText(result.value || '') }
  }

  throw new Error('Unsupported file type. Please upload PDF or DOCX.')
}
