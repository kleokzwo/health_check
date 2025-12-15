// src/rpc/auth.js
import fs from "fs";

export class RpcAuth {
  /**
   * @param {{ cookiePath: string, user: string, pass: string }} opts
   */
  constructor(opts) {
    this.cookiePath = opts.cookiePath || "";
    this.user = opts.user || "";
    this.pass = opts.pass || "";

    // small cache to avoid reading cookie on every request
    this._cache = { header: null, mtimeMs: 0, lastCheckMs: 0 };
  }

  /**
   * Returns a value suitable for the HTTP "Authorization" header ("Basic ...")
   * Prefers cookie auth, falls back to user/pass.
   */
  getAuthorizationHeader() {
    const cookieHeader = this._tryCookieHeader();
    if (cookieHeader) return cookieHeader;

    if (this.user && this.pass) {
      return "Basic " + Buffer.from(`${this.user}:${this.pass}`).toString("base64");
    }

    return null;
  }

  _tryCookieHeader() {
    if (!this.cookiePath) return null;

    // check cookie at most once per second
    const now = Date.now();
    if (this._cache.header && now - this._cache.lastCheckMs < 1000) {
      return this._cache.header;
    }
    this._cache.lastCheckMs = now;

    try {
      if (!fs.existsSync(this.cookiePath)) return null;
      const stat = fs.statSync(this.cookiePath);
      if (this._cache.header && stat.mtimeMs === this._cache.mtimeMs) {
        return this._cache.header;
      }

      const cookie = fs.readFileSync(this.cookiePath, "utf8").trim();
      if (!cookie.includes(":")) return null;

      const header = "Basic " + Buffer.from(cookie).toString("base64");
      this._cache = { header, mtimeMs: stat.mtimeMs, lastCheckMs: now };
      return header;
    } catch {
      return null;
    }
  }
}
