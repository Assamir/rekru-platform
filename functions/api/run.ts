import { HttpError, runOnJudge0, validateRequest, type RunnerEnv } from '../_lib/runner';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const onRequestPost: PagesFunction<RunnerEnv> = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => null);
    const req = validateRequest(body, env);
    return json(await runOnJudge0(req, env));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    return json({ error: 'Nieoczekiwany błąd serwera.' }, 500);
  }
};
