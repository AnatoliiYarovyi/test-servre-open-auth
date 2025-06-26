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
import { SQLiteStorage } from "./adapter/index";

const PORT = Number(process.env.PORT) || 3000;

const openauthClient = createClient({
	clientID: "nextjs", // process.env.CLIENT_ID || "nextjs-client",
	issuer: process.env.BACKEND_URL, // || `http://localhost:${PORT}`, // url to the OpenAuth server
});

async function getUser(email: string) {
	// check if user exists in database
	// if not, create a new user in the database
	// For simplicity, we are returning a static user ID here.

	// Get user from  database and return user ID
	return "123";
}

const issuerHandler = issuer({
	subjects,
	storage: SQLiteStorage("/volume/openauth.db"),
	// storage: MemoryStorage({
	// 	persist: "./persist.json",
	// }),
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
				validatePassword: (password) => {
					if (password.length < 8) {
						return "Password must be at least 8 characters";
					}
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
			console.log("value: ", JSON.stringify(value));
			/* {
				"provider":"github",
				"clientID":"Ov23liWrDMRAKeFuNHjG",
				"tokenset":{
					"access":"gho_04Rrx___MM2",
					"raw":{
						"access_token":"gho_04Rrx___MM2",
						"token_type":"bearer",
						"scope":"user:email"
					}
				}
			} */
			const emailResponse = await fetch(
				"https://api.github.com/user/emails",
				{
					headers: {
						authorization: `Bearer ${value.tokenset.raw.access_token}`,
						Accept: "application/vnd.github.v3+json",
						"user-agent": "fetch",
					},
				},
			);

			if (!emailResponse.ok) {
				throw new Error(
					`Failed to fetch user emails from GitHub: ${await emailResponse.text()}`,
				);
			}

			type GithubEmailResponse = Email[];
			interface Email {
				email: string;
				primary: boolean;
				verified: boolean;
				visibility?: string;
			}

			const emails =
				(await emailResponse.json()) as GithubEmailResponse;

			const primaryEmail = emails.find(
				(email) => email.primary && email.verified,
			);
			if (!primaryEmail) {
				throw new Error("Primary email not found");
			}
			console.log("Primary email: ", primaryEmail.email);

			return ctx.subject("user", {
				id: await getUser(primaryEmail.email),
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
