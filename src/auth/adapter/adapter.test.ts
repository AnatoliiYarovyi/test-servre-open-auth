import { describe, it, expect, beforeEach } from "vitest";
import type { StorageAdapter } from "@openauthjs/openauth/storage/storage";
import { SQLiteStorage } from "./index";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";

describe("StorageAdapter", () => {
	let storage: StorageAdapter;

	beforeEach(() => {
		// storage = SQLiteStorage(":memory:");
		storage = MemoryStorage();
	});

	it("set/get simple value", async () => {
		await storage.set(["foo", "re"], { bar: 1 });
		const value = await storage.get(["foo", "re"]);

		expect(value).toEqual({ bar: 1 });
	});

	it("returns undefined for missing key", async () => {
		const value = await storage.get(["not-exist"]);
		expect(value).toBeUndefined();
	});

	it("removes value", async () => {
		await storage.set(["foo"], { bar: 2 });
		await storage.set(["not-remove"], { bar: 2 });

		await storage.remove(["foo"]);
		const value = await storage.get(["foo"]);
		expect(value).toBeUndefined();

		const notRemovedValue = await storage.get(["not-remove"]);
		expect(notRemovedValue).toEqual({ bar: 2 });
	});

	it("respects expiry", async () => {
		await storage.set(["exp"], { bar: 3 }, new Date(Date.now() - 1000));
		const value = await storage.get(["exp"]);
		expect(value).toBeUndefined();
	});

	it("scan returns all with prefix", async () => {
		await storage.set(["aa", "1"], { v: 1 });
		await storage.set(["ab", "2"], { v: 2 });
		await storage.set(["b", "1"], { v: 3 });

		const results: [string[], any][] = [];
		for await (const entry of storage.scan(["a"])) {
			results.push(entry);
		}

		expect(results.length).toBe(2);
		expect(results).toEqual(
			expect.arrayContaining([
				[["aa", "1"], { v: 1 }],
				[["ab", "2"], { v: 2 }],
			]),
		);
	});

	it("scan with empty prefix returns all", async () => {
		await storage.set(["x", "1"], { v: 1 });
		await storage.set(["y", "2"], { v: 2 });

		const results: [string[], any][] = [];
		for await (const entry of storage.scan([])) {
			results.push(entry);
		}

		expect(results).toEqual(
			expect.arrayContaining([
				[["x", "1"], { v: 1 }],
				[["y", "2"], { v: 2 }],
			]),
		);
	});

	it("scan with non-existent prefix returns empty", async () => {
		await storage.set(["foo"], { bar: 1 });
		const results: [string[], any][] = [];
		for await (const entry of storage.scan(["zzz"])) {
			results.push(entry);
		}
		expect(results.length).toBe(0);
	});

	it("can store and retrieve nested objects", async () => {
		const obj = { a: 1, b: { c: [2, 3], d: { e: "f" } } };
		await storage.set(["nested"], obj);
		const value = await storage.get(["nested"]);
		expect(value).toEqual(obj);
	});
});
