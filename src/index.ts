import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { issuerHandler, openauthClient } from "./auth";
import { MailService } from "./mailService";
import { authMiddleware } from "./authMiddleware";
import { setCookie } from "hono/cookie";

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
					origin: "*",
					allowMethods: ["GET", "POST", "PUT", "DELETE"],
				}),
			)
			.use(trimTrailingSlash());

		app.get("/api/callback", async (c) => {
			console.log("Callback received");

			const code = c.req.query("code");

			if (!code) {
				return c.json({ message: "No code provided" }, 400);
			}

			const exchanged = await openauthClient.exchange(
				code,
				`${BACKEND_URL}/api/callback`,
			);

			if (exchanged.err) {
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
			return c.text("Hello!");
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
