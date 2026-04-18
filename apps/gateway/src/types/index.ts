import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TenantContext } from '@relay/types';

export interface AppFastifyInstance extends FastifyInstance {
  sql: any;
  redis: any;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}
 
export interface IngestParams {
  sourceSlug: string;
}
 
export interface IngestResponse {
  id: string;
  status: string;
}
 
export interface IngestRequest extends FastifyRequest<{ Params: IngestParams }> {
  tenant?: TenantContext;
  rawBody: Buffer;
}