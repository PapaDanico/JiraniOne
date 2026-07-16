// Maintenance ticket photo uploads go through a single serverless function
// invocation (Netlify Functions) with a synchronous request-body limit —
// keep the combined upload comfortably under it. Lambda-style proxies
// commonly base64-encode binary bodies (~33% inflation), so budget
// conservatively rather than against the raw multipart size alone.
export const MAX_TICKET_PHOTOS = 3;
export const MAX_TICKET_PHOTO_BYTES = 1.5 * 1024 * 1024; // 1.5MB per photo
