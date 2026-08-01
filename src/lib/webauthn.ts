const storageKey = (userId: string) => `pos_admin_webauthn_${userId}`;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function hasFingerprintRegistered(userId: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return !!localStorage.getItem(storageKey(userId));
}

export function clearFingerprint(userId: string) {
  localStorage.removeItem(storageKey(userId));
}

/** True when this Android browser can use device fingerprint / biometrics. */
export async function canUseFingerprint(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isAndroidDevice()) return false;
  if (!window.isSecureContext) return false;
  if (!window.PublicKeyCredential) return false;

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return true;
}

export async function registerFingerprint(userId: string, username: string): Promise<void> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "Restaurant POS",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Fingerprint setup was cancelled");
  }

  localStorage.setItem(
    storageKey(userId),
    bufferToBase64(credential.rawId)
  );
}

export async function verifyFingerprint(userId: string): Promise<boolean> {
  const stored = localStorage.getItem(storageKey(userId));
  if (!stored) return false;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: base64ToBuffer(stored),
          type: "public-key",
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      timeout: 60_000,
    },
  });

  return !!assertion;
}
