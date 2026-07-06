import type {
  AlphanumericString,
  EmailAddress,
  FrenchPhoneNumber,
  FrenchPostalCode,
  Url,
} from "@recyclerie/api/primitives/zod";

export function asEmail(value: string): EmailAddress;
export function asEmail(value: string | null | undefined): EmailAddress | null;
export function asEmail(
  value: string | null | undefined,
): EmailAddress | null {
  return (value ?? null) as EmailAddress | null;
}

export function asPhone(value: string): FrenchPhoneNumber;
export function asPhone(
  value: string | null | undefined,
): FrenchPhoneNumber | null;
export function asPhone(
  value: string | null | undefined,
): FrenchPhoneNumber | null {
  return (value ?? null) as FrenchPhoneNumber | null;
}

export function asPostal(value: string): FrenchPostalCode;
export function asPostal(
  value: string | null | undefined,
): FrenchPostalCode | null;
export function asPostal(
  value: string | null | undefined,
): FrenchPostalCode | null {
  return (value ?? null) as FrenchPostalCode | null;
}

export function asAlphanumeric(value: string): AlphanumericString;
export function asAlphanumeric(
  value: string | null | undefined,
): AlphanumericString | null;
export function asAlphanumeric(
  value: string | null | undefined,
): AlphanumericString | null {
  return (value ?? null) as AlphanumericString | null;
}

export function asUrl(value: string): Url;
export function asUrl(value: string | null | undefined): Url | null;
export function asUrl(value: string | null | undefined): Url | null {
  return (value ?? null) as Url | null;
}
