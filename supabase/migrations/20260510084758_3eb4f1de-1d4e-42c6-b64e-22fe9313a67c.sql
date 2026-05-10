revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
-- has_role can stay callable by authenticated since it's used in RLS policies via auth.uid()
grant execute on function public.has_role(uuid, public.app_role) to authenticated;