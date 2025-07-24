import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { issuerHandler, openauthClient } from "./auth";
import { MailService } from "./mailService";
import { authMiddleware } from "./authMiddleware";
import { deleteCookie, setCookie } from "hono/cookie";

const PORT = Number(process.env.PORT) || 3000;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const mailService: MailService | null = RESEND_API_KEY
	? new MailService(RESEND_API_KEY)
	: null;

(async () => {
	try {
		const app = new Hono();

		app.use("*")
			.use(logger())
			.use(
				cors({
					origin: [
						"*",
						FRONTEND_URL!,
						"http://localhost:3000",
						"http://localhost:5173",
						"https://svelte-openauth.vercel.app",
					],
					allowMethods: ["GET", "POST", "PUT", "DELETE"],
					credentials: true,
				}),
			)
			.use(trimTrailingSlash());

		app.post("/test-cookie", async (c) => {
			const test_value = "test_value";

			setCookie(c, "test_cookie", `${test_value}`, {
				secure: true,
				httpOnly: true,
				maxAge: 3600, // 1 hour
				sameSite: "None",
			});

			return c.json({ message: "Cookie set successfully" }, 200);
		});

		app.get("/api/callback", async (c) => {
			console.log("Callback received");

			const code = c.req.query("code");
			console.log("Authorization code:", code);

			if (!code) {
				return c.json({ message: "No code provided" }, 400);
			}

			const link = `${BACKEND_URL}/api/callback`;
			console.log("link", link);

			const exchanged = await openauthClient.exchange(code, link);

			if (exchanged.err) {
				console.log("Error exchanging code:", exchanged);

				return c.json(exchanged.err, 400);
			}

			const { access, refresh } = exchanged.tokens;

			setCookie(c, "access_token", access, {
				secure: true,
				httpOnly: true,
				maxAge: 34560000,
				sameSite: "None", // "Strict",
				// domain: ".ngrok-free.app",
				// path: "/",
				// expires: new Date(
				// 	Date.UTC(2000, 11, 24, 10, 30, 59, 900),
				// ),
			});
			setCookie(c, "refresh_token", refresh, {
				secure: true,
				httpOnly: true,
				maxAge: 34560000,
				sameSite: "None", // "Strict",
				// domain: ".ngrok-free.app",
				// path: "/",
				// expires: new Date(
				// 	Date.UTC(2000, 11, 24, 10, 30, 59, 900),
				// ),
			});

			return c.redirect(FRONTEND_URL!);
		});
		app.route("/", issuerHandler);
		app.get("/health", (c) => {
			return c.text("Hello!");
		});
		app.get("/protect", authMiddleware, (c) => {
			return c.json({ message: "Protected route accessed!" }, 200);
		});
		app.get("/logout", (c) => {
			deleteCookie(c, "access_token", {
				secure: true,
				httpOnly: true,
				sameSite: "None",
			});
			deleteCookie(c, "refresh_token", {
				secure: true,
				httpOnly: true,
				sameSite: "None",
			});
			return c.json({ message: "Logged out successfully" }, 200);
		});

		app.onError((err, c) => {
			console.error("Error:", err);
			return c.json({ message: "Internal Server Error" }, 500);
		});

		serve(
			{
				fetch: app.fetch,
				port: PORT,
			},
			(info) => {
				console.log("up and running on", info.port);
			},
		);
	} catch (e) {
		console.log("ERROR", e);

		throw e;
	}
})();
