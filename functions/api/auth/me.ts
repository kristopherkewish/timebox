import type { Env, AuthData } from '../../types';
import { error, ok } from '../../lib/response';

export const onRequestGet: PagesFunction<Env, string, AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  return ok(ctx.data.user);
};
