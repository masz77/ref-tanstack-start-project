import { describe, expect, it } from 'vite-plus/test'
import { withSecurityHeaders } from '@/server'

const httpsRequest = new Request('https://example.com/')
const httpRequest = new Request('http://localhost:5177/')

describe('withSecurityHeaders', () => {
  it('adds the security headers to a normal response', () => {
    const res = withSecurityHeaders(new Response('ok'), httpsRequest)

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('Content-Security-Policy')).toBe(
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    )
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
  })

  it('adds the headers to an immutable-header response (Response.redirect)', async () => {
    const redirect = Response.redirect('https://example.com/next', 302)
    const res = withSecurityHeaders(redirect, httpsRequest)

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://example.com/next')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('omits HSTS on plain http', () => {
    const res = withSecurityHeaders(new Response('ok'), httpRequest)

    expect(res.headers.get('Strict-Transport-Security')).toBeNull()
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })
})
