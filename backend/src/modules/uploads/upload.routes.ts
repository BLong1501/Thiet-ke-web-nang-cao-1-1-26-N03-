import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { authenticate } from '../../core/middleware/auth.middleware';
import { sendError, sendSuccess } from '../../core/utils/response.util';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// This directory is deliberately NOT exposed using express.static.
const defaultRoot = path.resolve(__dirname, '../../../private-uploads');

export function createUploadRouter(root = process.env.PRIVATE_UPLOAD_DIR || defaultRoot) {
  const router = Router();
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0, parts: 2 },
  }).single('file');
  router.use(authenticate);

  router.post('/', (req, res, next) => {
    parse(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        sendError(res, error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          error.code === 'LIMIT_FILE_SIZE' ? 'Tệp vượt quá giới hạn 5 MB' : 'Chỉ gửi một tệp ở trường file, không gửi trường khác');
        return;
      }
      if (error) { sendError(res, 400, 'Dữ liệu tải tệp không hợp lệ'); return; }
      next();
    });
  }, async (req, res, next) => {
    const file = req.file;
    if (!file) { sendError(res, 400, 'Vui lòng chọn tệp ở trường file'); return; }
    const ext = path.extname(file.originalname).toLowerCase();
    const png = file.buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = file.buffer.length > 3 && file.buffer[0] === 255 && file.buffer[1] === 216 && file.buffer[2] === 255;
    if (!((png && ext === '.png' && file.mimetype === 'image/png') ||
          (jpeg && ['.jpg', '.jpeg'].includes(ext) && file.mimetype === 'image/jpeg'))) {
      sendError(res, 415, 'Chỉ nhận ảnh PNG/JPEG thật; nội dung, đuôi tệp và MIME phải khớp'); return;
    }
    let output: Buffer;
    try {
      // Fully decode then re-encode: magic bytes alone do not prove a valid image.
      // Re-encoding removes appended content and metadata. Pixel limit bounds decompression.
      output = await sharp(file.buffer, { limitInputPixels: 16000000, failOn: 'warning' })
        .rotate().png().toBuffer();
    } catch {
      sendError(res, 415, 'Không đọc được ảnh: tệp giả, bị hỏng hoặc vượt giới hạn 16 triệu điểm ảnh'); return;
    }
    if (output.length > MAX_UPLOAD_BYTES) { sendError(res, 413, 'Ảnh sau xử lý vượt quá giới hạn 5 MB'); return; }
    const id = randomUUID();
    const directory = path.join(root, id);
    try {
      await mkdir(root, { recursive: true, mode: 0o700 });
      await mkdir(directory, { mode: 0o700 });
      await writeFile(path.join(directory, 'image.png'), output, { flag: 'wx', mode: 0o600 });
      await writeFile(path.join(directory, 'owner.json'), JSON.stringify({ ownerId: req.user!.userId }), { flag: 'wx', mode: 0o600 });
      sendSuccess(res, 201, 'Tải ảnh riêng tư thành công', {
        id, fileName: `${id}.png`, mimeType: 'image/png', size: output.length,
        downloadUrl: `/api/v1/uploads/${id}`, visibility: 'PRIVATE',
      });
    } catch (error) {
      await rm(directory, { recursive: true, force: true }).catch(() => {});
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      sendError(res, 404, 'Không tìm thấy tệp'); return;
    }
    try {
      const directory = path.join(root, id);
      const owner = JSON.parse(await readFile(path.join(directory, 'owner.json'), 'utf8'));
      if (owner.ownerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
        sendError(res, 403, 'Bạn không có quyền đọc tệp này'); return;
      }
      const image = await readFile(path.join(directory, 'image.png'));
      res.set({ 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="${id}.png"`,
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(image);
    } catch (error: any) {
      if (error.code === 'ENOENT') { sendError(res, 404, 'Không tìm thấy tệp'); return; }
      next(error);
    }
  });
  return router;
}

export const uploadRouter = createUploadRouter();
