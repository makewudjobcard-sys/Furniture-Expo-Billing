import { env } from "../app/lib/runtime";

export function getDb() {
  return env.DB;
}
