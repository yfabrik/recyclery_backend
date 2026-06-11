export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export function assertJwtSecretConfigured(): void {
  if (!process.env.JWT_SECRET?.trim()) {
    console.error(
      "JWT_SECRET environment variable is required — refusing to start",
    );
    process.exit(1);
  }
}
