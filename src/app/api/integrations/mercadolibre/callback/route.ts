import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  
  if (!code) {
    return NextResponse.json({ error: "No authorization code provided by MercadoLibre." }, { status: 400 });
  }

  const clientId = process.env.MELI_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET;
  const redirectUri = process.env.MELI_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Missing MercadoLibre environment variables." }, { status: 500 });
  }

  try {
    // Intercambiar el Authorization Code por un Access Token
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: "tallerdesk_mercadolibre_pkce_verifier_string_123"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Error from ML Token endpoint:", data);
      return NextResponse.json({ error: "Failed to exchange code for token", details: data }, { status: res.status });
    }

    // Guardar los tokens en la base de datos (SistemaConfig)
    await prisma.sistemaConfig.upsert({
      where: { key: "MELI_ACCESS_TOKEN" },
      update: { value: data.access_token },
      create: { key: "MELI_ACCESS_TOKEN", value: data.access_token }
    });

    if (data.refresh_token) {
      await prisma.sistemaConfig.upsert({
        where: { key: "MELI_REFRESH_TOKEN" },
        update: { value: data.refresh_token },
        create: { key: "MELI_REFRESH_TOKEN", value: data.refresh_token }
      });
    }

    // Calcular y guardar fecha de expiración
    if (data.expires_in) {
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      await prisma.sistemaConfig.upsert({
        where: { key: "MELI_EXPIRES_AT" },
        update: { value: expiresAt.toISOString() },
        create: { key: "MELI_EXPIRES_AT", value: expiresAt.toISOString() }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "MercadoLibre integration successful! You can close this window." 
    });

  } catch (error: any) {
    console.error("Error during MercadoLibre OAuth callback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
