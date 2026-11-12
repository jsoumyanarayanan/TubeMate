/** @type {import('next').NextConfig} */
export default {
  eslint: { ignoreDuringBuilds: true },
  // Thumbnails linked in admin can sit on any host for now. Narrow this to the media CDN before launch.
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }] },
}
