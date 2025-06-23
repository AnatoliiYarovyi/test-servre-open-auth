import { issuer } from "@openauthjs/openauth";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createClient } from "@openauthjs/openauth/client";
import { subjects } from "./subjects";
import { mailService } from "../index";

const PORT = Number(process.env.PORT) || 3000;

const openauthClient = createClient({
	clientID: "my-client",
	issuer: process.env.ISSUER_URL || `http://localhost:${PORT}`, // url to the OpenAuth server
});

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
					await mailService?.sendOtp(email.email, code);
					console.log(email, code);
				},
			}),
		),
		github: GithubProvider({
			clientID: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			scopes: ["user:email"],
		}),
		password: PasswordProvider(
			PasswordUI({
				sendCode: async (email, code) => {
					await mailService?.sendOtp(email, code);
					console.log(email, code);
				},
			}),
		),
	},
	success: async (ctx, value) => {
		if (value.provider === "code") {
			console.log();

			return ctx.subject("user", {
				id: await getUser(value.claims.email),
			});
		}
		if (value.provider === "github") {
			console.log("value.clientID: ", value.clientID);
			console.log("value.provider: ", value.provider);

			return ctx.subject("user", {
				id: await getUser(value.clientID),
			});
		}
		if (value.provider === "password") {
			return ctx.subject("user", {
				id: await getUser(value.email),
			});
		}
		throw new Error("Invalid provider");
	},
});

export { issuerHandler, openauthClient };
