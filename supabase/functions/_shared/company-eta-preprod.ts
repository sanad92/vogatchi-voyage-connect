import { CompanyProviderError, parseCompanyCredentials, parseEtaSignedSample, refreshEtaPreprodSample, submitEtaPreprodSample } from './company-api-providers.ts';

const etaActions = ['eta_sample_list', 'eta_sample_submit', 'eta_sample_refresh'] as const;
type EtaAction = typeof etaActions[number];
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && uuidPattern.test(value);

export const isEtaAction = (action: unknown): action is EtaAction => etaActions.some(value => value === action);

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{
  data: unknown;
  error: { code?: string } | null;
}>;
type Send = (url: string, init: RequestInit) => Promise<Response>;
type SampleSummary = { id: string; internal_id: string; submission_id: string; document_id: string };
type ActionResult = { status: number; body: Record<string, unknown> };
const ok = (body: Record<string, unknown>): ActionResult => ({ body, status: 200 });
const failure = (error: string, status: number): ActionResult => ({ body: { error }, status });

async function payloadHash(body: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function handleCompanyEtaAction({
  action, actorId, organizationId, payload, rpc, send,
}: {
  action: EtaAction;
  actorId: string;
  organizationId: string;
  payload: Record<string, unknown>;
  rpc: Rpc;
  send: Send;
}): Promise<ActionResult> {
  const org = { _org_id: organizationId, _actor_id: actorId };
  const call = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await rpc(name, args);
    if (error) throw new Error(error.code === '42501' ? 'forbidden' : 'configuration_unavailable');
    return data;
  };

  try {
    if (action === 'eta_sample_list') {
      const samples = await call('company_eta_samples_list', org);
      return Array.isArray(samples) ? ok({ samples }) : failure('configuration_unavailable', 503);
    }

    const submit = action === 'eta_sample_submit';
    const signed = submit ? parseEtaSignedSample(payload.sampleJson) : null;
    if (submit && (!signed || !isUuid(payload.expectedRevision))) return failure('eta_sample_invalid', 400);
    if (!submit && !isUuid(payload.sampleId)) return failure('invalid_input', 400);
    const loaded = await (signed
      ? call('company_eta_sample_claim', {
        ...org,
        _revision: payload.expectedRevision,
        _internal_id: signed.internalId,
        _payload_hash: await payloadHash(signed.json),
      })
      : call('company_eta_sample_for_refresh', { ...org, _sample_id: payload.sampleId })) as {
        error?: string;
        sample?: SampleSummary;
        credentials?: unknown;
        attempt_id?: string;
      } | null;
    if (loaded?.error === 'eta_sample_not_found') return failure(loaded.error, 404);
    if (loaded?.error === 'eta_test_connection_required' || loaded?.error === 'eta_sample_id_conflict') {
      return failure(loaded.error, 409);
    }
    if (!loaded?.sample) return failure('configuration_unavailable', 503);
    if (!loaded.attempt_id) return ok({ sample: loaded.sample });

    const record = async (status: string, references: { submissionId?: string; documentId?: string } = {}) => {
      const sample = await call('company_eta_sample_record', {
        _org_id: organizationId,
        _sample_id: loaded.sample!.id,
        _attempt_id: loaded.attempt_id,
        _expected_status: signed ? 'sending' : 'submitted',
        _status: status,
        _submission_id: references.submissionId ?? null,
        _document_id: references.documentId ?? null,
      });
      return sample ? ok({ sample }) : failure('configuration_unavailable', 503);
    };

    const credentials = parseCompanyCredentials('eta', loaded.credentials);
    if (!credentials) return signed ? await record('not_sent') : failure('configuration_unavailable', 503);
    if (signed) {
      const outcome = await submitEtaPreprodSample(credentials, signed, send);
      return await record(outcome.status, outcome.status === 'submitted' ? outcome : {});
    }
    const status = await refreshEtaPreprodSample(credentials, {
      internalId: loaded.sample.internal_id,
      submissionId: loaded.sample.submission_id,
      documentId: loaded.sample.document_id,
    }, send);
    return await record(status);
  } catch (error) {
    if (error instanceof CompanyProviderError) return failure(error.code, 422);
    if (error instanceof Error && error.message === 'forbidden') return failure('forbidden', 403);
    return failure('configuration_unavailable', 503);
  }
}
