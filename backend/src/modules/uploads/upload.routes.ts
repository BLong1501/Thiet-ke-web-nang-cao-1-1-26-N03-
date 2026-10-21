import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { authenticate } from '../../core/middleware/auth.middleware';
import { sendError, sendSuccess } from '../../core/utils/response.util';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function getStorageRoot(subDir: string, explicitRoot?: string): string {
  if (explicitRoot) return explicitRoot;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    return path.join(os.tmpdir(), subDir);
  }
  return path.resolve(__dirname, `../../../${subDir}`);
}

const defaultRoot = getStorageRoot('private-uploads');

export function createUploadRouter(root = process.env.PRIVATE_UPLOAD_DIR || defaultRoot) {
  const router = Router();
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0, parts: 2 },
  }).single('file');

  const publicRoot = getStorageRoot('public-uploads');

  // 1. Xem ảnh công khai (Không yêu cầu xác thực để người dùng xem chiến dịch)
  router.get('/public/:fileName', async (req, res, next) => {
    const fileName = String(req.params.fileName);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/i.test(fileName)) {
      sendError(res, 404, 'Không tìm thấy ảnh');
      return;
    }
    try {
      let imagePath = path.join(publicRoot, fileName);
      let image: Buffer;
      try {
        image = await readFile(imagePath);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // Fallback sang tmpdir nếu lưu trên serverless
          imagePath = path.join(os.tmpdir(), 'public-uploads', fileName);
          image = await readFile(imagePath);
        } else {
          throw err;
        }
      }
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      }).send(image);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        sendError(res, 404, 'Không tìm thấy ảnh');
        return;
      }
      next(error);
    }
  });

  // Mọi route bên dưới đều yêu cầu đăng nhập
  router.use(authenticate);

  // 2. Tải ảnh chiến dịch / bài viết công khai (Yêu cầu đăng nhập)
  router.post('/public', (req, res, next) => {
    parse(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        sendError(
          res,
          error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Tệp vượt quá giới hạn 5 MB'
            : 'Chỉ gửi một tệp ở trường file'
        );
        return;
      }
      if (error) {
        sendError(res, 400, 'Dữ liệu tải tệp không hợp lệ');
        return;
      }
      next();
    });
  }, async (req, res, next) => {
    const file = req.file;
    if (!file) {
      sendError(res, 400, 'Vui lòng chọn tệp ảnh ở trường file');
      return;
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const png = file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = file.buffer.length > 3 && file.buffer[0] === 255 && file.buffer[1] === 216 && file.buffer[2] === 255;
    if (!((png && ext === '.png' && file.mimetype === 'image/png') ||
          (jpeg && ['.jpg', '.jpeg'].includes(ext) && file.mimetype === 'image/jpeg'))) {
      sendError(res, 415, 'Chỉ nhận ảnh PNG/JPEG thật; nội dung, đuôi tệp và MIME phải khớp');
      return;
    }
    let output: Buffer;
    try {
      output = await sharp(file.buffer, { limitInputPixels: 30000000, failOn: 'none' })
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .toBuffer();
    } catch {
      sendError(res, 415, 'Không đọc được ảnh: tệp giả, bị hỏng hoặc vượt giới hạn điểm ảnh');
      return;
    }
    if (output.length > MAX_UPLOAD_BYTES) {
      sendError(res, 413, 'Ảnh sau xử lý vượt quá giới hạn 5 MB');
      return;
    }

    const id = randomUUID();
    let targetRoot = publicRoot;
    let targetPath = path.join(targetRoot, `${id}.png`);
    try {
      try {
        await mkdir(targetRoot, { recursive: true, mode: 0o755 });
        await writeFile(targetPath, output, { flag: 'wx', mode: 0o644 });
      } catch (fsErr: any) {
        if (fsErr.code === 'EROFS' || fsErr.code === 'EACCES') {
          targetRoot = path.join(os.tmpdir(), 'public-uploads');
          targetPath = path.join(targetRoot, `${id}.png`);
          await mkdir(targetRoot, { recursive: true, mode: 0o755 });
          await writeFile(targetPath, output, { flag: 'wx', mode: 0o644 });
        } else {
          throw fsErr;
        }
      }
      const forwardedProto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const reqHost = req.get('host') || '';
      let hostUrl = process.env.APP_URL;
      if (!hostUrl || (hostUrl.includes('localhost') && reqHost && !reqHost.includes('localhost'))) {
        hostUrl = `${forwardedProto}://${reqHost}`;
      }
      hostUrl = hostUrl.replace(/\/+$/, '');
      const url = `${hostUrl}/api/v1/uploads/public/${id}.png`;
      sendSuccess(res, 201, 'Tải ảnh công khai thành công', {
        id,
        fileName: `${id}.png`,
        url,
      });
    } catch (error) {
      next(error);
    }
  });

  // 3. Tải ảnh riêng tư (eKYC CCCD / Biên lai giải ngân)
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
      output = await sharp(file.buffer, { limitInputPixels: 30000000, failOn: 'none' })
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .toBuffer();
    } catch {
      sendError(res, 415, 'Không đọc được ảnh: tệp giả, bị hỏng hoặc vượt giới hạn điểm ảnh'); return;
    }
    if (output.length > MAX_UPLOAD_BYTES) { sendError(res, 413, 'Ảnh sau xử lý vượt quá giới hạn 5 MB'); return; }

    const id = randomUUID();
    let targetRoot = root;
    let directory = path.join(targetRoot, id);
    try {
      try {
        await mkdir(targetRoot, { recursive: true, mode: 0o755 });
        await mkdir(directory, { mode: 0o755 });
        await writeFile(path.join(directory, 'image.png'), output, { flag: 'wx', mode: 0o644 });
        await writeFile(path.join(directory, 'owner.json'), JSON.stringify({ ownerId: req.user?.userId || (req.user as any)?.id }), { flag: 'wx', mode: 0o644 });
      } catch (fsErr: any) {
        if (fsErr.code === 'EROFS' || fsErr.code === 'EACCES') {
          targetRoot = path.join(os.tmpdir(), 'private-uploads');
          directory = path.join(targetRoot, id);
          await mkdir(targetRoot, { recursive: true, mode: 0o755 });
          await mkdir(directory, { mode: 0o755 });
          await writeFile(path.join(directory, 'image.png'), output, { flag: 'wx', mode: 0o644 });
          await writeFile(path.join(directory, 'owner.json'), JSON.stringify({ ownerId: req.user?.userId || (req.user as any)?.id }), { flag: 'wx', mode: 0o644 });
        } else {
          throw fsErr;
        }
      }

      sendSuccess(res, 201, 'Tải ảnh riêng tư thành công', {
        id, fileName: `${id}.png`, mimeType: 'image/png', size: output.length,
        downloadUrl: `/api/v1/uploads/${id}`, visibility: 'PRIVATE',
      });
    } catch (error) {
      await rm(directory, { recursive: true, force: true }).catch(() => {});
      console.error('[UPLOAD_ERROR_DETAIL]:', error);
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      sendError(res, 404, 'Không tìm thấy tệp'); return;
    }
    try {
      let directory = path.join(root, id);
      let ownerRaw: string;
      try {
        ownerRaw = await readFile(path.join(directory, 'owner.json'), 'utf8');
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          directory = path.join(os.tmpdir(), 'private-uploads', id);
          ownerRaw = await readFile(path.join(directory, 'owner.json'), 'utf8');
        } else {
          throw err;
        }
      }
      const owner = JSON.parse(ownerRaw);
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      if (owner.ownerId !== currentUserId && req.user!.role !== 'ADMIN') {
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

