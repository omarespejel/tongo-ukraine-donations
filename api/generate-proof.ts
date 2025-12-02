import { MOCK_PROOF_RESPONSE } from './mock-proof-response';

export async function handleProofRequest(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  return new Response(JSON.stringify(MOCK_PROOF_RESPONSE), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

