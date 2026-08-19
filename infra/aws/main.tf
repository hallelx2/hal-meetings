data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_caller_identity" "current" {}

resource "aws_security_group" "hal" {
  name        = "${var.instance_name}-sg"
  description = "Hal agent: SSH from operator IP only. No public app ports."
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from operator"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  egress {
    description = "Outbound only (Neon, Gemini, Deepgram, Meet, Resend, GitHub)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.instance_name}-sg"
    Project = "hal"
  }
}

resource "aws_instance" "hal" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.hal.id]
  key_name                    = var.key_name
  iam_instance_profile        = aws_iam_instance_profile.hal.name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = var.volume_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    region        = var.region
    git_repo_url  = var.git_repo_url
    git_branch    = var.git_branch
    ssm_path      = "/hal/agent"
  })

  user_data_replace_on_change = true

  tags = {
    Name    = var.instance_name
    Project = "hal"
    Role    = "agent-dogfood"
  }
}

resource "aws_eip" "hal" {
  instance = aws_instance.hal.id
  domain   = "vpc"

  tags = {
    Name    = "${var.instance_name}-eip"
    Project = "hal"
  }
}
