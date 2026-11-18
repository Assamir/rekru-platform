import { publicConfig, type RunnerEnv } from '../_lib/runner';

export const onRequestGet: PagesFunction<RunnerEnv> = async ({ env }) =>
  new Response(JSON.stringify(publicConfig(env)), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
