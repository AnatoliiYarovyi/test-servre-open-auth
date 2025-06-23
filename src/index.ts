import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { issuerHandler } from "./auth";
import { MailService } from "./mailer";

const PORT = process.env.PORT;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const mailService: MailService | null = RESEND_API_KEY
	? new MailService(RESEND_API_KEY)
	: null;

(async () => {
	try {
		const app = new Hono();

		app.use("*")
			.use(logger())
			.use(cors({ origin: "*" }))
			.use(trimTrailingSlash());

		app.get("/health", (c) => {
			return c.text("Hello!");
		});

		app.route("/", issuerHandler);

		app.onError((err, c) => {
			console.error("Error:", err);
			return c.json({ message: "Internal Server Error" }, 500);
		});

		serve(
			{
				fetch: app.fetch,
				port: Number(PORT) || 3000,
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
