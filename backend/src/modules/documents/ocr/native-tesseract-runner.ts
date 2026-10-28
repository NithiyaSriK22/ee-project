import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { logger } from '../../../config/logger.js';

export interface TesseractWordData {
  text: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  lineNum: number;
  pageNum: number;
}

export interface NativeTesseractResult {
  success: boolean;
  fullText: string;
  confidence: number;
  words: TesseractWordData[];
  error?: string;
}

export class NativeTesseractRunner {
  private static cachedBinaryPath: string | null = null;
  private static cachedTessdataPrefix: string | null = null;

  /**
   * Discovers the native Tesseract OCR binary on the host machine.
   * Order of precedence:
   * 1. process.env.TESSERACT_CMD
   * 2. Common Windows 64-bit and 32-bit install directories
   * 3. Linux/POSIX standard directories
   * 4. System PATH resolution
   */
  public static findBinaryPath(): string | null {
    if (this.cachedBinaryPath && fs.existsSync(this.cachedBinaryPath)) {
      return this.cachedBinaryPath;
    }

    const envCmd = process.env.TESSERACT_CMD;
    if (envCmd && fs.existsSync(envCmd)) {
      this.cachedBinaryPath = envCmd;
      return envCmd;
    }

    const candidatePaths: string[] = [
      'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
      'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Tesseract-OCR', 'tesseract.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Tesseract-OCR', 'tesseract.exe'),
      '/usr/bin/tesseract',
      '/usr/local/bin/tesseract',
      '/opt/homebrew/bin/tesseract',
    ];

    for (const cand of candidatePaths) {
      if (cand && fs.existsSync(cand)) {
        this.cachedBinaryPath = cand;
        return cand;
      }
    }

    // Check system PATH
    const isWindows = process.platform === 'win32';
    const pathSeparator = isWindows ? ';' : ':';
    const binaryName = isWindows ? 'tesseract.exe' : 'tesseract';
    const systemPaths = (process.env.PATH || '').split(pathSeparator);

    for (const p of systemPaths) {
      const fullPath = path.join(p, binaryName);
      if (fs.existsSync(fullPath)) {
        this.cachedBinaryPath = fullPath;
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Discovers the directory containing traineddata files (tessdata).
   */
  public static findTessdataPrefix(binaryPath?: string): string | null {
    if (this.cachedTessdataPrefix && fs.existsSync(this.cachedTessdataPrefix)) {
      return this.cachedTessdataPrefix;
    }

    if (process.env.TESSDATA_PREFIX && fs.existsSync(process.env.TESSDATA_PREFIX)) {
      this.cachedTessdataPrefix = process.env.TESSDATA_PREFIX;
      return this.cachedTessdataPrefix;
    }

    const bin = binaryPath || this.findBinaryPath();
    if (bin) {
      const adjacentTessdata = path.join(path.dirname(bin), 'tessdata');
      if (fs.existsSync(adjacentTessdata)) {
        this.cachedTessdataPrefix = adjacentTessdata;
        return adjacentTessdata;
      }
    }

    const standardLinuxPaths = [
      '/usr/share/tesseract-ocr/5/tessdata',
      '/usr/share/tesseract-ocr/4.00/tessdata',
      '/usr/share/tessdata',
    ];

    for (const cand of standardLinuxPaths) {
      if (fs.existsSync(cand)) {
        this.cachedTessdataPrefix = cand;
        return cand;
      }
    }

    return null;
  }

  /**
   * Returns true if native Tesseract binary is available on the host.
   */
  public static isAvailable(): boolean {
    return this.findBinaryPath() !== null;
  }

  /**
   * Resets cached paths (useful during runtime setup/testing)
   */
  public static resetCache(): void {
    this.cachedBinaryPath = null;
    this.cachedTessdataPrefix = null;
  }

  /**
   * Runs native Tesseract on an image buffer and returns parsed text, confidence, and bounding boxes.
   */
  public static async recognize(
    imageBuffer: Buffer,
    lang: string = 'eng',
    timeoutMs: number = 30000
  ): Promise<NativeTesseractResult> {
    const binary = this.findBinaryPath();
    if (!binary) {
      return {
        success: false,
        fullText: '',
        confidence: 0,
        words: [],
        error: 'Native Tesseract OCR binary not found on host.',
      };
    }

    const tessdataPrefix = this.findTessdataPrefix(binary);
    const uniqueId = `tess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tempDir = os.tmpdir();
    const inputImagePath = path.join(tempDir, `${uniqueId}_input.png`);
    const outputBasePath = path.join(tempDir, `${uniqueId}_out`);
    const tsvOutputPath = `${outputBasePath}.tsv`;
    const txtOutputPath = `${outputBasePath}.txt`;

    try {
      // 1. Write image to temp file
      await fs.promises.writeFile(inputImagePath, imageBuffer);

      // 2. Spawn native Tesseract process with argument isolation
      // Arguments: input_file output_base -l lang tsv txt
      const args = [inputImagePath, outputBasePath, '-l', lang, 'tsv', 'txt'];

      const spawnEnv: NodeJS.ProcessEnv = {
        ...process.env,
      };
      if (tessdataPrefix) {
        spawnEnv.TESSDATA_PREFIX = tessdataPrefix;
      }

      const procResult = await new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
        let stderr = '';
        const child = spawn(binary, args, {
          env: spawnEnv,
          windowsHide: true,
        });

        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`Tesseract process timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        child.stderr?.on('data', (chunk) => {
          stderr += chunk.toString();
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          resolve({ code, stderr });
        });
      });

      if (procResult.code !== 0) {
        logger.warn('Tesseract process exited with non-zero exit code', {
          code: procResult.code,
          stderr: procResult.stderr,
        });
      }

      // 3. Read output files
      let fullText = '';
      if (fs.existsSync(txtOutputPath)) {
        fullText = await fs.promises.readFile(txtOutputPath, 'utf-8');
      }

      const words: TesseractWordData[] = [];
      let totalWordConf = 0;
      let validWordCount = 0;

      if (fs.existsSync(tsvOutputPath)) {
        const tsvData = await fs.promises.readFile(tsvOutputPath, 'utf-8');
        const lines = tsvData.split(/\r?\n/);
        // Header line: level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext
        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i];
          if (!currentLine) continue;
          const line = currentLine.trim();
          if (!line) continue;
          const cols = line.split('\t');
          if (cols.length >= 12) {
            const pageNum = parseInt(cols[1] ?? '1', 10) || 1;
            const lineNum = parseInt(cols[4] ?? '1', 10) || 1;
            const left = parseInt(cols[6] ?? '0', 10) || 0;
            const top = parseInt(cols[7] ?? '0', 10) || 0;
            const width = parseInt(cols[8] ?? '0', 10) || 0;
            const height = parseInt(cols[9] ?? '0', 10) || 0;
            const conf = parseFloat(cols[10] ?? '-1');
            const wordText = cols.slice(11).join('\t').trim();

            if (conf >= 0 && wordText) {
              const normalizedConf = conf / 100.0;
              totalWordConf += normalizedConf;
              validWordCount++;

              words.push({
                text: wordText,
                confidence: normalizedConf,
                box: {
                  x: left,
                  y: top,
                  width,
                  height,
                },
                lineNum,
                pageNum,
              });
            }
          }
        }
      }

      // If txt wasn't generated or empty, build fullText from TSV words
      if (!fullText.trim() && words.length > 0) {
        fullText = words.map((w) => w.text).join(' ');
      }

      const avgConfidence = validWordCount > 0 ? totalWordConf / validWordCount : 0;

      return {
        success: true,
        fullText: fullText.trim(),
        confidence: avgConfidence,
        words,
      };
    } catch (err: any) {
      logger.error('Native Tesseract execution error', { error: err.message });
      return {
        success: false,
        fullText: '',
        confidence: 0,
        words: [],
        error: err.message,
      };
    } finally {
      // 4. Guaranteed cleanup of temp files
      const filesToClean = [inputImagePath, outputBasePath, tsvOutputPath, txtOutputPath];
      for (const f of filesToClean) {
        try {
          if (fs.existsSync(f)) {
            await fs.promises.unlink(f);
          }
        } catch {}
      }
    }
  }
}
