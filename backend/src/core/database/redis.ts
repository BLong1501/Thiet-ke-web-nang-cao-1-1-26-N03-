import Redis from "ioredis";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// Bộ nhớ đệm fallback trong RAM nếu Redis chưa sẵn sàng
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

export function shutdownRedis() {
  redisClient?.disconnect();
}

let redisClient: Redis | null = null;
let isRedisConnected = false;

try {
  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        return null; // Dừng retry nếu không kết nối được
      }
      return 1000;
    },
    lazyConnect: true,
  });

  redisClient.connect().then(() => {
    isRedisConnected = true;
    console.log("✓ Redis Client connected successfully!");
  }).catch((err) => {
    console.warn("⚠ Không thể kết nối tới Redis, tự động chuyển sang chế độ Memory Fallback:", err.message);
  });

  redisClient.on("error", (err) => {
    isRedisConnected = false;
  });
} catch (error) {
  console.warn("⚠ Khởi tạo Redis thất bại, chuyển sang Memory Fallback.");
}

export class RedisService {
  /**
   * Lưu mã OTP với thời gian sống (TTL) tính bằng giây
   */
  async setOTP(key: string, otp: string, ttlSeconds = 600): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, otp, "EX", ttlSeconds);
        return;
      } catch (err) {
        console.warn("Redis set error, using memory fallback");
      }
    }
    // Fallback vào RAM
    memoryStore.set(key, {
      value: otp,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Lấy mã OTP theo key
   */
  async getOTP(key: string): Promise<string | null> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch (err) {
        console.warn("Redis get error, using memory fallback");
      }
    }
    // Fallback vào RAM
    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Xóa mã OTP sau khi xác minh thành công
   */
  async deleteOTP(key: string): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (err) {
        // ignore
      }
    }
    memoryStore.delete(key);
  }

  /**
   * Lưu toàn bộ thông tin đăng ký chờ xác thực (Hạn 10 phút)
   */
  async setPendingRegistration(
    email: string,
    data: {
      email: string;
      passwordHash: string;
      fullName: string;
      phoneNumber?: string | null;
      idCardNumber?: string | null;
      otp: string;
    },
    ttlSeconds = 600
  ): Promise<void> {
    const key = `pending_reg:${email}`;
    const value = JSON.stringify(data);
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, value, "EX", ttlSeconds);
        return;
      } catch (err) {
        console.warn("Redis set pending registration error, fallback memory");
      }
    }
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Lấy thông tin đăng ký tạm từ Redis
   */
  async getPendingRegistration(email: string): Promise<{
    email: string;
    passwordHash: string;
    fullName: string;
    phoneNumber?: string | null;
    idCardNumber?: string | null;
    otp: string;
  } | null> {
    const key = `pending_reg:${email}`;
    let raw: string | null = null;
    if (isRedisConnected && redisClient) {
      try {
        raw = await redisClient.get(key);
      } catch (err) {
        console.warn("Redis get pending registration error, fallback memory");
      }
    }
    if (!raw) {
      const item = memoryStore.get(key);
      if (item && Date.now() <= item.expiresAt) {
        raw = item.value;
      } else if (item) {
        memoryStore.delete(key);
      }
    }

    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Xóa thông tin đăng ký tạm sau khi đã tạo User thành công trong DB
   */
  async deletePendingRegistration(email: string): Promise<void> {
    const key = `pending_reg:${email}`;
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (err) {
        // ignore
      }
    }
    memoryStore.delete(key);
  }

  /**
   * Kiểm tra xem email có đang bị khóa đăng nhập tạm thời không
   */
  async getLoginLock(email: string): Promise<{ remainingSeconds: number } | null> {
    const key = `login_lock:${email.toLowerCase()}`;
    if (isRedisConnected && redisClient) {
      try {
        const ttl = await redisClient.ttl(key);
        if (ttl > 0) {
          return { remainingSeconds: ttl };
        }
        return null;
      } catch (err) {
        console.warn("Redis getLoginLock error, fallback memory");
      }
    }
    const item = memoryStore.get(key);
    if (item && item.expiresAt > Date.now()) {
      return { remainingSeconds: Math.ceil((item.expiresAt - Date.now()) / 1000) };
    }
    if (item) memoryStore.delete(key);
    return null;
  }

  /**
   * Khóa tài khoản tạm thời trong lockSeconds (mặc định 600s = 10 phút)
   */
  async lockAccount(email: string, lockSeconds = 600): Promise<void> {
    const key = `login_lock:${email.toLowerCase()}`;
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, "locked", "EX", lockSeconds);
        return;
      } catch (err) {
        console.warn("Redis lockAccount error, fallback memory");
      }
    }
    memoryStore.set(key, {
      value: "locked",
      expiresAt: Date.now() + lockSeconds * 1000,
    });
  }

  /**
   * Ghi nhận một lần nhập sai mật khẩu của email, trả về tổng số lần sai hiện tại
   */
  async recordFailedLoginAttempt(email: string, windowSeconds = 600): Promise<number> {
    const key = `login_attempts:${email.toLowerCase()}`;
    if (isRedisConnected && redisClient) {
      try {
        const attempts = await redisClient.incr(key);
        if (attempts === 1) {
          await redisClient.expire(key, windowSeconds);
        }
        return attempts;
      } catch (err) {
        console.warn("Redis recordFailedLoginAttempt error, fallback memory");
      }
    }
    const item = memoryStore.get(key);
    let attempts = 1;
    if (item && item.expiresAt > Date.now()) {
      attempts = parseInt(item.value, 10) + 1;
      memoryStore.set(key, {
        value: attempts.toString(),
        expiresAt: item.expiresAt,
      });
    } else {
      memoryStore.set(key, {
        value: "1",
        expiresAt: Date.now() + windowSeconds * 1000,
      });
    }
    return attempts;
  }

  /**
   * Xóa số lần sai và mở khóa khi đăng nhập thành công
   */
  async clearFailedLoginAttempts(email: string): Promise<void> {
    const norm = email.toLowerCase();
    const attemptsKey = `login_attempts:${norm}`;
    const lockKey = `login_lock:${norm}`;
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(attemptsKey, lockKey);
        return;
      } catch (err) {
        // ignore
      }
    }
    memoryStore.delete(attemptsKey);
    memoryStore.delete(lockKey);
  }

  /**
   * Đọc giá trị thô theo khóa (Redis, fallback RAM).
   */
  async get(key: string): Promise<string | null> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        console.warn("Redis get error, using memory fallback");
      }
    }
    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Ghi giá trị thô với TTL (giây).
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, value, "EX", ttlSeconds);
        return;
      } catch {
        console.warn("Redis set error, using memory fallback");
      }
    }
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(...keys);
      } catch {
        // tiếp tục xóa bản RAM
      }
    }
    for (const key of keys) {
      memoryStore.delete(key);
    }
  }

  /**
   * Xóa mọi khóa có cùng tiền tố (SCAN, không dùng KEYS).
   */
  async delByPrefix(prefix: string): Promise<number> {
    let removed = 0;
    if (isRedisConnected && redisClient) {
      try {
        let cursor = "0";
        do {
          const [next, keys] = await redisClient.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
          cursor = String(next);
          if (keys.length > 0) {
            await redisClient.del(...keys);
            removed += keys.length;
          }
        } while (cursor !== "0");
      } catch {
        console.warn("Redis SCAN/DEL prefix error, using memory fallback");
      }
    }
    for (const key of [...memoryStore.keys()]) {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

export const redisService = new RedisService();
