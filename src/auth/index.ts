import { issuer } from "@openauthjs/openauth";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { subjects } from "./subjects";

import { mailService } from "../index";

async function getUser(email: string) {
	// Get user from  database and return user ID
	return "123";
}

const issuerHandler = issuer({
	subjects,
	storage: MemoryStorage(),
	providers: {
		code: CodeProvider(
			CodeUI({
				sendCode: async (email, code) => {
					mailService?.sendOtp(email.email, code);
					console.log(email, code);
				},
			}),
		),
	},
	success: async (ctx, value) => {
		if (value.provider === "code") {
			return ctx.subject("user", {
				id: await getUser(value.claims.email),
			});
		}
		if (value.provider === "password") {
			return ctx.subject("user", {
				id: await getUser(value.claims.email),
			});
		}
		throw new Error("Invalid provider");
	},
});

export { issuerHandler };
