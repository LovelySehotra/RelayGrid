import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'; 
export interface AppFastifyInstance extends FastifyInstance {
  sql: any;
  redis: any;
}
 
export interface IngestParams {
  sourceSlug: string;
}
 
export interface IngestResponse {
  id: string;
  status: string;
}
 
export interface IngestRequest extends FastifyRequest<{ Params: IngestParams }> {
  tenant?: {
    tenantId: string;
  };
  rawBody: Buffer;
}