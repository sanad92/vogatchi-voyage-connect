-- Return only invitation state and whether the supplied address matches.
-- The invitation token does not establish an Auth session or grant membership.
create or replace function public.get_staff_invitation_status(_token uuid, _email text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with invitation as (
    select i.email,
           case
             when not o.is_active or public.is_free_email(i.email) then 'invalid'
             when i.status in ('accepted', 'cancelled') then i.status
             when i.status = 'expired' or i.expires_at <= now() then 'expired'
             when i.status = 'pending' then 'pending'
             else 'invalid'
           end as state
      from public.invitations i
      join public.organizations o on o.id = i.organization_id
     where i.token = _token
  )
  select coalesce(
    (select jsonb_build_object(
      'status', state,
      'email_matches', state = 'pending'
        and coalesce(lower(btrim(_email)) = lower(email), false)
    ) from invitation),
    jsonb_build_object('status', 'invalid', 'email_matches', false)
  )
$$;

revoke all on function public.get_staff_invitation_status(uuid, text) from public;
grant execute on function public.get_staff_invitation_status(uuid, text) to anon, authenticated;
