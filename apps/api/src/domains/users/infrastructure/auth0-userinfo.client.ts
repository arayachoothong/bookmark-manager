import { Injectable } from "@nestjs/common";

@Injectable()
export class Auth0UserinfoClient {
  private readonly userinfoUrl: string;

  constructor() {
    const issuer = process.env.AUTH0_ISSUER;
    if (!issuer) {
      throw new Error("AUTH0_ISSUER must be set");
    }
    this.userinfoUrl = `${issuer.replace(/\/$/, "")}/userinfo`;
  }

  async fetchEmail(accessToken: string): Promise<string | undefined> {
    const res = await fetch(this.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return undefined;
    }
    const body = (await res.json()) as { email?: unknown };
    return typeof body.email === "string" ? body.email : undefined;
  }
}
