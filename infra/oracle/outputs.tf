output "public_ip" {
  value       = oci_core_instance.hal.public_ip
  description = "Public IP of the Hal agent VM"
}

output "ssh_command" {
  value       = "ssh -i ~/.ssh/hal-oracle ubuntu@${oci_core_instance.hal.public_ip}"
  description = "Copy-paste to SSH in"
}

output "logs_command" {
  value       = "ssh -i ~/.ssh/hal-oracle ubuntu@${oci_core_instance.hal.public_ip} 'cd /opt/hal/hal-meetings && sudo docker compose -f apps/agent/docker-compose.yml logs -f hal-agent'"
  description = "Stream agent logs over SSH"
}

output "cloud_init_status" {
  value       = "First boot runs cloud-init (~8-10 min). Check progress: ssh in, then `cloud-init status --wait`."
  description = "What's happening after apply"
}
