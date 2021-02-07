data "aws_secretsmanager_secret_version" "github_auth" {
  secret_id = "github-auth"
}

locals {
  github_auth = jsondecode(
    data.aws_secretsmanager_secret_version.github_auth.secret_string
  )
}

data "aws_route53_zone" "validation_zone" {
  name         = "storeos.org"
  private_zone = false
}

resource "aws_route53_record" "A" {
  zone_id  = data.aws_route53_zone.validation_zone.zone_id
  name     = "alchersan.storeos.org"
  type     = "A"
  alias {
    name                   = "d23810plfdps4y.cloudfront.net"
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "AAAA" {
  zone_id  = data.aws_route53_zone.validation_zone.zone_id
  name     = "alchersan.storeos.org"
  type     = "AAAA"
  alias {
    name                   = "d23810plfdps4y.cloudfront.net"
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "validation_record" {
  zone_id  = data.aws_route53_zone.validation_zone.zone_id
  name     = tolist(aws_acm_certificate.cert.domain_validation_options)[0].resource_record_name
  type     = tolist(aws_acm_certificate.cert.domain_validation_options)[0].resource_record_type
  records = [
    tolist(aws_acm_certificate.cert.domain_validation_options)[0].resource_record_value
  ]
  ttl             = 60 * 60
  allow_overwrite = true
}

resource "aws_acm_certificate" "cert" {
  provider          = aws.us-east-1
  domain_name       = "alchersan.storeos.org"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.alchersan.storeos.org"
  ]
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us-east-1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [aws_route53_record.validation_record.fqdn]
}

module "cloudfront_auth" {
  source                         = "git::https://github.com/scalefactory/terraform-cloudfront-auth.git?ref=master"
  auth_vendor                    = "github"
  github_organization            = "store-os"
  cloudfront_distribution        = "alchersan.storeos.org"
  client_id                      = local.github_auth.client_id
  client_secret                  = local.github_auth.client_secret
  redirect_uri                   = "https://alchersan.storeos.org/callback"
  bucket_name                    = "alchersan.storeos.org"
  region                         = "eu-west-1"
  cloudfront_acm_certificate_arn = aws_acm_certificate.cert.arn
}
