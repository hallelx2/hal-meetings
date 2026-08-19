locals {
  secret_keys = [
    "DATABASE_URL",
    "HAL_LOCAL_KMS_KEY",
    "GEMINI_API_KEY",
    "DEEPGRAM_API_KEY",
    "RESEND_API_KEY",
    "HAL_FROM_EMAIL",
  ]
}

resource "aws_ssm_parameter" "secrets" {
  for_each = toset(local.secret_keys)

  name        = "/hal/agent/${each.key}"
  description = "Hal agent ${each.key}. Value is overwritten by scripts/push-hal-ssm-secrets.ps1 — never put the real secret in Terraform."
  type        = "SecureString"
  value       = "UNSET"
  overwrite   = true

  lifecycle {
    ignore_changes = [value]
  }

  tags = { Project = "hal" }
}
