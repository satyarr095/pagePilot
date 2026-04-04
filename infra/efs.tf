resource "aws_efs_file_system" "chroma" {
  creation_token = "${var.project_name}-chroma"
  encrypted      = true
  tags           = merge(local.tags, { Name = "${var.project_name}-chroma-efs" })
}

resource "aws_efs_mount_target" "chroma" {
  count           = local.az_count
  file_system_id  = aws_efs_file_system.chroma.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "chroma" {
  file_system_id = aws_efs_file_system.chroma.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/chroma_data"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = merge(local.tags, { Name = "${var.project_name}-chroma-ap" })
}
