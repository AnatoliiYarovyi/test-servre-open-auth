import type { StorageAdapter } from "@openauthjs/openauth/storage/storage";
import Database from "libsql";

// symbol (0x1f) is used as a separator to avoid conflicts with common characters in keys
const SEPERATOR = String.fromCharCode(0x1f);

export type StorageRow = {
	key: string;
	value: string;
	expiry: number | null;
};

export function SQLiteStorage(filePath: string): StorageAdapter {
	const db = new Database(filePath);

	(async () => {
		try {
			const stmt = db.prepare(`
        CREATE TABLE IF NOT EXISTS storage (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          expiry INTEGER
        )
      `);
			await stmt.run();
		} catch (error) {
			console.error("Error initializing table:", error);
		}
	})().catch(console.error);

	return {
		async get(key: string[]): Promise<Record<string, any> | undefined> {
			const keyStr = joinKey(key);
			try {
				const stmt = db.prepare(
					"SELECT value, expiry FROM storage WHERE key = ?",
				);
				const rows = (await stmt.all(keyStr)) as StorageRow[];

				if (rows.length === 0) return undefined;

				const row = rows[0];
				const expiry = row.expiry;

				if (expiry && Date.now() >= expiry) {
					await this.remove(key);
					return undefined;
				}

				try {
					return JSON.parse(row.value) as Record<
						string,
						any
					>;
				} catch {
					return undefined;
				}
			} catch (error) {
				console.error("Error getting value:", error);
				return undefined;
			}
		},

		async set(
			key: string[],
			value: Record<string, any>,
			expiry?: Date,
		): Promise<void> {
			const keyStr = joinKey(key);
			const serializedValue = JSON.stringify(value);
			const expiryTime = expiry ? expiry.getTime() : null;

			try {
				const stmt = db.prepare(
					"INSERT OR REPLACE INTO storage (key, value, expiry) VALUES (?, ?, ?)",
				);
				await stmt.run(keyStr, serializedValue, expiryTime);
			} catch (error) {
				console.error("Error setting value:", error);
			}
		},

		async remove(key: string[]): Promise<void> {
			const keyStr = joinKey(key);
			try {
				const stmt = db.prepare(
					"DELETE FROM storage WHERE key = ?",
				);
				await stmt.run(keyStr);
			} catch (error) {
				console.error("Error removing value:", error);
			}
		},

		async *scan(
			prefix: string[],
		): AsyncIterable<[string[], Record<string, any>]> {
			const prefixStr = joinKey(prefix);
			const prefixPattern = `${prefixStr}%`;
			const now = Date.now();

			try {
				const stmt = db.prepare(
					"SELECT key, value, expiry FROM storage WHERE key LIKE ? ORDER BY key",
				);
				const rows = (await stmt.all(
					prefixPattern,
				)) as StorageRow[];

				for (const row of rows) {
					const expiry = row.expiry;
					if (expiry && now >= expiry) {
						continue;
					}

					const keyArray = splitKey(row.key);
					let value: Record<string, any>;
					try {
						value = JSON.parse(row.value);
					} catch {
						console.error(
							"Error parsing value:",
							row.value,
						);
						continue;
					}
					yield [keyArray, value];
				}
			} catch (error) {
				console.error("Error scanning values:", error);
			}
		},
	};
}

function joinKey(key: string[]) {
	return key.join(SEPERATOR);
}

function splitKey(key: string) {
	return key.split(SEPERATOR);
}
