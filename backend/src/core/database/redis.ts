import Redis from "ioredis";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// Bộ nhớ đệm fallback trong RAM nếu Redis chưa sẵn sàng
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

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
}

export const redisService = new RedisService();
