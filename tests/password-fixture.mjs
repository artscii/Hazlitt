import { pbkdf2Sync, randomBytes } from "node:crypto";
export const testPassword = randomBytes(24).toString("hex");
const salt = randomBytes(16).toString("hex");
export const testPasswordHash =
  salt +
  ":" +
  pbkdf2Sync(testPassword, salt, 100000, 32, "sha256").toString("hex");
