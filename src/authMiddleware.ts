import { createMiddleware } from "hono/factory";
import { openauthClient } from "./auth";
import { subjects } from "./auth/subjects";

export const authMiddleware = createMiddleware(async (ctx, next) => {
	const [bearer, token] = (ctx.req.header("authorization") ?? "").split(
		" ",
	);
	console.log("Bearer token:", bearer, "Token:", token);

	try {
		const verified = await openauthClient.verify(subjects, token);
		console.log("verified: ", JSON.stringify(verified));
		/* {"aud":"nextjs","subject":{"type":"user","properties":{"id":"123"}}} */
	} catch (error) {
		console.error("Error verifying token:", error);
		return ctx.json({ message: "Unauthorized" }, 401);
	}

	await next();
});
