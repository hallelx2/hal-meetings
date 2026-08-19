data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "hal" {
  name               = "${var.instance_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = { Project = "hal" }
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.hal.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "ssm_params" {
  statement {
    sid     = "ReadHalAgentSecrets"
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/hal/agent",
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/hal/agent/*",
    ]
  }
}

resource "aws_iam_role_policy" "ssm_params" {
  name   = "${var.instance_name}-ssm-params"
  role   = aws_iam_role.hal.id
  policy = data.aws_iam_policy_document.ssm_params.json
}

resource "aws_iam_instance_profile" "hal" {
  name = "${var.instance_name}-profile"
  role = aws_iam_role.hal.name
}
