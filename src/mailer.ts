import { HTTPException } from "hono/http-exception";
import { Resend } from "resend";

import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ICreateEmail {
	from: string;
	to: string[];
	subject: string;
	html: string;
}
export interface IErrorResend {
	statusCode: ContentfulStatusCode;
	message: string;
	name: string;
}

export class MailService {
	private apiKey: string;

	constructor(apiKey: string) {
		if (!apiKey) {
			throw new Error("API key is required for MailService");
		}
		this.apiKey = apiKey;
	}

	private async sendEmail(dataEmail: ICreateEmail) {
		try {
			const resend = new Resend(this.apiKey);

			const { data, error } = (await resend.emails.send(
				dataEmail,
			)) as { data: any; error: IErrorResend };

			if (error) {
				throw new HTTPException(error.statusCode || 400, {
					message: `${error.message}`,
				});
			}
		} catch (error: any) {
			throw new HTTPException(error.status || 400, {
				message: `sendEmail error: ${error}`,
			});
		}
	}

	public async sendOtp(email: string, otpCode: number | string) {
		const template = `<p>Your OTP code is: <strong>${otpCode}</strong></p>`;

		const dataEmail: ICreateEmail = {
			from: "onedollarstats.com <no-reply@onedollarstats.com>",
			to: [email],
			subject: "OTP code",
			html: template,
		};

		await this.sendEmail(dataEmail);
	}
}
