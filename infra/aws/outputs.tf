output "instance_id" {
  value = aws_instance.hal.id
}

output "public_ip" {
  value = aws_eip.hal.public_ip
}

output "region" {
  value = var.region
}

output "ssh_command" {
  value = "ssh -i $env:USERPROFILE\\.ssh\\hal-agent.pem ubuntu@${aws_eip.hal.public_ip}"
}

output "ssm_command" {
  value = "aws ssm start-session --region ${var.region} --target ${aws_instance.hal.id}"
}

output "logs_command" {
  value = "ssh -i $env:USERPROFILE\\.ssh\\hal-agent.pem ubuntu@${aws_eip.hal.public_ip} 'sudo docker compose -f /opt/hal/hal-meetings/apps/agent/docker-compose.yml logs -f --tail=80'"
}
