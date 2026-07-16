// Maintenance ticket photo uploads go through a single serverless function
// invocation (Netlify Functions) with a synchronous request-body limit
// (6MB on Lambda-style Netlify Functions) — keep the combined upload
// comfortably under it. Lambda-style proxies commonly base64-encode binary
// bodies (~33% inflation), so budget against the *inflated* size, not the
// raw multipart size: 3 * 1MB = 3MB raw -> ~4MB inflated, leaving ~2MB of
// headroom for multipart boundaries and the JSON text fields. A previous
// 3 * 1.5MB budget inflated to exactly 6MB with zero headroom at all.
export const MAX_TICKET_PHOTOS = 3;
export const MAX_TICKET_PHOTO_BYTES = 1 * 1024 * 1024; // 1MB per photo
