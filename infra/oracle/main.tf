// Pick the first availability domain in the region.
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

// Find the latest Canonical Ubuntu 22.04 ARM image for the A1.Flex shape.
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

// ---- Networking ----
resource "oci_core_vcn" "hal" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.instance_name}-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "halvcn"
}

resource "oci_core_internet_gateway" "hal" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.hal.id
  display_name   = "${var.instance_name}-igw"
}

resource "oci_core_route_table" "hal" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.hal.id
  display_name   = "${var.instance_name}-rt"
  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.hal.id
  }
}

resource "oci_core_security_list" "hal" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.hal.id
  display_name   = "${var.instance_name}-sl"

  // All outbound allowed — Hal only talks outward (Neon, Gemini, Deepgram, Meet, Resend).
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  // Inbound SSH only.
  ingress_security_rules {
    protocol = "6" // TCP
    source   = "0.0.0.0/0"
    tcp_options {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_subnet" "hal" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.hal.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "${var.instance_name}-subnet"
  route_table_id    = oci_core_route_table.hal.id
  security_list_ids = [oci_core_security_list.hal.id]
  dns_label         = "halsubnet"
}

// ---- The instance ----
resource "oci_core_instance" "hal" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = var.instance_name
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.hal.id
    assign_public_ip = true
    hostname_label   = "halagent"
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gb
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(templatefile("${path.module}/cloud-init.yaml", {
      database_url     = var.hal_database_url
      local_kms_key    = var.hal_local_kms_key
      gemini_api_key   = var.hal_gemini_api_key
      gemini_model     = var.hal_gemini_model
      deepgram_api_key = var.hal_deepgram_api_key
      resend_api_key   = var.hal_resend_api_key
      from_email       = var.hal_from_email
      git_repo_url     = var.git_repo_url
      git_branch       = var.git_branch
    }))
  }

  // ARM capacity can be transient; retry guidance is in the README.
  lifecycle {
    ignore_changes = [source_details[0].source_id]
  }
}
