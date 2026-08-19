variable "region" {
  type        = string
  description = "AWS region. Default matches Neon (eu-central-1)."
  default     = "eu-central-1"
}

variable "instance_name" {
  type    = string
  default = "hal-agent"
}

variable "instance_type" {
  type        = string
  description = "amd64 so oven/bun:1.2-debian + Playwright Chromium just work."
  default     = "t3.medium"
}

variable "volume_gb" {
  type        = number
  default     = 40
  description = "Root volume. Docker image + Chromium needs more than 8 GB."
}

variable "key_name" {
  type        = string
  description = "Existing EC2 key pair in this region."
}

variable "ssh_cidr" {
  type        = string
  description = "SSH allowlist. Must be a single /32. Never 0.0.0.0/0."
  validation {
    condition     = can(regex("^[0-9.]+/32$", var.ssh_cidr)) && var.ssh_cidr != "0.0.0.0/32"
    error_message = "ssh_cidr must be YOUR_IP/32, not 0.0.0.0/0."
  }
}

variable "git_repo_url" {
  type    = string
  default = "https://github.com/hallelx2/hal-meetings.git"
}

variable "git_branch" {
  type    = string
  default = "main"
}
