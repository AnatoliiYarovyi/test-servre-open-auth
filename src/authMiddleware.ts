import { createMiddleware } from "hono/factory";
import { openauthClient } from "./auth";
import { subjects } from "./auth/subjects";
import { getCookie } from "hono/cookie";

export const authMiddleware = createMiddleware(async (ctx, next) => {
	let token = getCookie(ctx, "access_token") ?? "";

	if (!token) {
		const [bearer, authToken] = (
			ctx.req.header("authorization") ?? ""
		).split(" ");
		token = authToken;
		console.log("Bearer token:", bearer, "Token:", authToken);
	}

	try {
		const verified = await openauthClient.verify(subjects, token);

		console.log("verified: ", verified);
		/* {"aud":"nextjs","subject":{"type":"user","properties":{"id":"123"}}} */
		if (verified.err) {
			console.error("Verification error:", verified.err);
			return ctx.json({ message: "Unauthorized" }, 401);
		}
	} catch (error) {
		console.error("Error verifying token:", error);
		return ctx.json({ message: "Unauthorized" }, 401);
	}

	await next();
});
