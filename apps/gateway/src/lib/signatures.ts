import { createHmac, timingSafeEqual } from 'crypto';
import type { SourceType } from '@relay/types';

export function verifySignature(
  sourceType: SourceType,
  rawBody: Buffer,
  headers: Record<string, string>,
  secret: string
): boolean {
  switch (sourceType) {
    case 'stripe':
      return verifyStripeSignature(rawBody, headers, secret);
    case 'github':
      return verifyGitHubSignature(rawBody, headers, secret);
    case 'twilio':
      return verifyTwilioSignature(rawBody, headers, secret);
    case 'generic':
      return verifyGenericSignature(rawBody, headers, secret);
    default:
      return false;
  }
}

function verifyStripeSignature(rawBody: Buffer, headers: Record<string, string>, secret: string): boolean {
  const signature = headers['stripe-signature'];
  if (!signature) return false;

  const elements = signature.split(',');
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (!timestamp) return false;

  // Reject if timestamp is older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);
  if (now - timestampNum > 300) {
    return false;
  }

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  for (const sig of signatures) {
    if (sig.length === expectedSignature.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))) {
      return true;
    }
  }

  return false;
}

function verifyGitHubSignature(rawBody: Buffer, headers: Record<string, string>, secret: string): boolean {
  const signature = headers['x-hub-signature-256'];
  if (!signature || !signature.startsWith('sha256=')) return false;

  const receivedSignature = signature.slice('sha256='.length);
  const expectedSignature = createHmac('sha256', secret).update(rawBody).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  if (receivedSignature.length !== expectedSignature.length) return false;
  return timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature));
}

function verifyTwilioSignature(rawBody: Buffer, headers: Record<string, string>, secret: string): boolean {
  const signature = headers['x-twilio-signature'];
  if (!signature) return false;

  // Twilio signature is HMAC-SHA1 over URL + sorted params
  // For simplicity, we'll implement a basic version
  // In production, you'd need the full URL with sorted query params
  const url = headers['x-original-url'] || '';
  const expectedSignature = createHmac('sha1', secret).update(url + rawBody.toString('utf8')).digest('base64');

  // Use timingSafeEqual to prevent timing attacks
  if (signature.length !== expectedSignature.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

function verifyGenericSignature(rawBody: Buffer, headers: Record<string, string>, secret: string): boolean {
  // If no secret configured, accept all
  if (!secret || secret === '') return true;

  const signature = headers['x-webhook-signature'];
  if (!signature || !signature.startsWith('sha256=')) return false;

  const receivedSignature = signature.slice('sha256='.length);
  const expectedSignature = createHmac('sha256', secret).update(rawBody).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  if (receivedSignature.length !== expectedSignature.length) return false;
  return timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature));
}
