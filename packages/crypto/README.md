# @hal/crypto

Envelope encryption for Hal. Per-user data encryption keys (DEKs) wrapped by a master key in a pluggable KMS.

## What this gives you

- **`Kms` interface** — one shape, four providers (`local`, `vault`, `aws-kms`, `gcp-kms`)
- **`EnvelopeService`** — `encrypt/decryptString/Json/Bytes` for any user's data
- **Token redactors** — paths for pino + a `redactString()` helper for raw output

## Threat model

| Threat | Protected? |
|---|---|
| Stolen DB dump | ✅ — only wrapped DEKs and ciphertext; useless without KMS |
| Leaky log line | ✅ — redactors strip Bearer/JWT/hex blobs/PII fields |
| Operator with read-only DB | ✅ — same as DB dump |
| Compromised KMS master key | ❌ — everything decrypts. Rotate often. |
| Shell access on a running bot worker | ❌ — DEKs are unwrapped in memory during use |

## Use

```ts
import { createKmsFromEnv, createEnvelopeService } from '@hal/crypto';

const kms = createKmsFromEnv();         // picks provider from KMS_PROVIDER env
await kms.initialize();

const env = createEnvelopeService(kms);

// new user — create their DEK
const { wrappedDek, keyId } = await env.generateUserDek();
// → store wrappedDek + keyId in users.dek_wrapped + users.dek_kms_key_id

// encrypt a token
const ct = await env.encryptString({
  wrappedDek,
  keyId,
  plaintext: refreshTokenFromOAuth,
});
// → store ct in oauth_tokens.refresh_token_ct

// decrypt on the way out
const token = await env.decryptString({
  wrappedDek,
  keyId,
  ciphertext: row.refreshTokenCt,
});
```

## Wire format

```
[ version(1) | iv(12) | aes_gcm_ciphertext_and_tag(N+16) ]
```

Algorithm is AES-256-GCM via Web Crypto. Authenticated (the 16-byte GCM auth tag is appended by the algorithm). Tampering anywhere in the body throws `CiphertextAuthFailedError`.

No native deps — runs identically in Node 20+, Bun, and modern browsers.

## Provider status

| Provider | Status | Use for |
|---|---|---|
| `local` | ✅ Production-grade for single-operator self-host | dev + small self-hosters |
| `vault` | 🚧 Interface complete, integration pending | self-hosted production |
| `aws-kms` | 🚧 Interface complete, integration pending | AWS-hosted production |
| `gcp-kms` | 🚧 Interface complete, integration pending | GCP-hosted production |

To unblock production: implement each `unwrap` / `wrap` / `generateDek` against the upstream SDK. The contract is locked; only the body of three methods per provider changes.

## Tests

```
bun test
```

Coverage: round-trip strings/JSON, tampering detection, wrong-DEK rejection, redactor patterns.
