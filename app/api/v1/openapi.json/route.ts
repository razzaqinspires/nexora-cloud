import { NextResponse } from 'next/server';
import { resolvePublicOrigin } from '@/lib/public-origin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request.url);
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Nexora Cloud API',
      version: '1.0.0',
      description: 'Private project identity and cloud control-plane API for Razzaq Ventures. Stateful routes require a provisioned PostgreSQL database.',
    },
    servers: [{ url: `${origin}/api/v1`, description: 'Current deployment origin, resolved dynamically at runtime.' }],
    tags: [{ name: 'System' }, { name: 'Projects' }, { name: 'Administration' }],
    paths: {
      '/health': {
        get: {
          tags: ['System'], summary: 'Check API, database, and schema readiness', operationId: 'getHealth',
          responses: {
            '200': { description: 'Database connected and schema ready', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } },
            '503': { description: 'Database missing, unavailable, or schema migration required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/meta': {
        get: {
          tags: ['System'], summary: 'Resolve this deployment origin and documentation URLs', operationId: 'getMetadata',
          responses: { '200': { description: 'Runtime metadata and current API URLs', content: { 'application/json': { schema: { $ref: '#/components/schemas/MetadataResponse' } } } } },
        },
      },
      '/me': {
        get: {
          tags: ['Projects'], summary: 'Verify the calling project API key', operationId: 'getCurrentProject', security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Project identity and granted scopes', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectIdentityResponse' } } } },
            '401': { description: 'Missing or invalid project API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '503': { description: 'Project registry database unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/admin/projects': {
        post: {
          tags: ['Administration'], summary: 'Register a project (admin only; idempotent by slug)', operationId: 'registerProject', security: [{ adminToken: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterProjectRequest' } } } },
          responses: {
            '201': { description: 'Project created. The API key is returned once.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectCreatedResponse' } } } },
            '200': { description: 'Project already exists. No new API key was issued.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectExistingResponse' } } } },
            '400': { description: 'Invalid request body', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '401': { description: 'Admin authentication failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '503': { description: 'Persistent PostgreSQL database not configured or unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Nexora project API key' },
        adminToken: { type: 'apiKey', in: 'header', name: 'x-nexora-admin-token' },
      },
      schemas: {
        ErrorResponse: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } }, required: ['error'] },
        Project: {
          type: 'object', properties: {
            id: { type: 'string', format: 'uuid' }, slug: { type: 'string' }, name: { type: 'string' },
            description: { type: 'string' }, environment: { type: 'string', enum: ['development', 'staging', 'production'] },
            status: { type: 'string', enum: ['registered', 'provisioning', 'running', 'paused', 'failed'] }, created_at: { type: 'string', format: 'date-time' },
          }, required: ['id', 'slug', 'name', 'description', 'environment', 'status', 'created_at'],
        },
        RegisterProjectRequest: {
          type: 'object', additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 80 },
            slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 48 },
            description: { type: 'string', maxLength: 300, default: '' },
            environment: { type: 'string', enum: ['development', 'staging', 'production'], default: 'production' },
          }, required: ['name', 'slug'],
        },
        ProjectCreatedResponse: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' }, apiKey: { type: 'string', description: 'Shown only on creation; store securely.' }, existing: { const: false }, warning: { type: 'string' } }, required: ['project', 'apiKey', 'existing'] },
        ProjectExistingResponse: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' }, existing: { const: true }, apiKey: { type: 'null' }, message: { type: 'string' } }, required: ['project', 'existing', 'apiKey'] },
        ProjectIdentityResponse: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' }, scopes: { type: 'array', items: { type: 'string' } } }, required: ['project', 'scopes'] },
        HealthResponse: { type: 'object', properties: { ok: { type: 'boolean' }, service: { type: 'string' }, database: { type: 'string' }, schema: { type: 'string' }, mode: { type: 'string' }, version: { type: 'string' } }, required: ['ok', 'service', 'database', 'schema', 'version'] },
        MetadataResponse: { type: 'object', properties: { service: { type: 'string' }, version: { type: 'string' }, mode: { type: 'string' }, origin: { type: 'string', format: 'uri' }, apiBaseUrl: { type: 'string', format: 'uri' }, docsUrl: { type: 'string', format: 'uri' }, openApiUrl: { type: 'string', format: 'uri' }, canonicalDomainConfigured: { type: 'boolean' }, deploymentHostnameConfigured: { type: 'boolean' } }, required: ['service', 'version', 'mode', 'origin', 'apiBaseUrl', 'docsUrl', 'openApiUrl'] },
      },
    },
  };
  return NextResponse.json(spec, { headers: { 'Cache-Control': 'no-store' } });
}
