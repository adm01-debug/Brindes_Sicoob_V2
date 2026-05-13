resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  value   = var.lovable_preview_url
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_worker_route" "cors_fix" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "app.promobrindes.com.br/*"
  script_name = cloudflare_worker_script.cors_proxy.name
}
