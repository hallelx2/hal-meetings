// ---- OCI auth (from the one-time API key setup in the console) ----
variable "tenancy_ocid" {
  type        = string
  description = "Your tenancy OCID (Console → Profile → Tenancy)"
}

variable "user_ocid" {
  type        = string
  description = "Your user OCID (Console → Profile → My profile)"
}

variable "fingerprint" {
  type        = string
  description = "API key fingerprint (shown when you upload the public API key)"
}

variable "private_key_path" {
  type        = string
  description = "Local path to the API private key .pem you generated"
}

variable "region" {
  type        = string
  description = "Home region, e.g. eu-frankfurt-1"
  default     = "eu-frankfurt-1"
}

variable "compartment_ocid" {
  type        = string
  description = "Compartment OCID to create resources in (root tenancy OCID works)"
}

// ---- Instance shape (Always Free Ampere A1.Flex) ----
variable "instance_name" {
  type    = string
  default = "hal-agent"
}

variable "ocpus" {
  type        = number
  description = "ARM OCPUs (Always Free total across tenancy is 4)"
  default     = 4
}

variable "memory_gb" {
  type        = number
  description = "RAM in GB (Always Free total across tenancy is 24)"
  default     = 24
}

variable "boot_volume_gb" {
  type    = number
  default = 100
}

// ---- SSH ----
variable "ssh_public_key_path" {
  type        = string
  description = "Path to your SSH public key (e.g. ~/.ssh/hal-oracle.pub)"
}

// ---- Hal application env (written to /opt/hal/.env on the VM via cloud-init) ----
// These end up in Terraform state — keep state local + gitignored.
variable "hal_database_url" {
  type        = string
  description = "Neon DIRECT (non-pooler) connection string"
  sensitive   = true
}

variable "hal_local_kms_key" {
  type        = string
  description = "64-hex-char envelope master key — MUST match Vercel"
  sensitive   = true
}

variable "hal_gemini_api_key" {
  type      = string
  sensitive = true
}

variable "hal_gemini_model" {
  type    = string
  default = "gemini-2.5-flash"
}

variable "hal_deepgram_api_key" {
  type      = string
  sensitive = true
}

variable "hal_resend_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "hal_from_email" {
  type    = string
  default = "hal@hal-meetings.com"
}

variable "git_repo_url" {
  type    = string
  default = "https://github.com/hallelx2/hal-meetings.git"
}

variable "git_branch" {
  type    = string
  default = "main"
}
