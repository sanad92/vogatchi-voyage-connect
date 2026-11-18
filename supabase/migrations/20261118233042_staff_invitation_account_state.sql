-- Only a valid invitation matched to its exact work email can select an Auth method.
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
  ),
  checked as (
    select state, email, state = 'pending'
           and coalesce(lower(btrim(_email)) = lower(email), false) as email_matches
      from invitation
  )
  select coalesce(
    (select jsonb_build_object('status', state, 'email_matches', email_matches)
      || case when email_matches then jsonb_build_object('account_state', coalesce(
        (select case when nullif(u.encrypted_password, '') is null
                       then 'passwordless' else 'existing' end
           from auth.users u
          where u.email = lower(checked.email)
            and u.deleted_at is null
          order by u.is_sso_user, u.created_at, u.id
          limit 1),
        'new'
      )) else '{}'::jsonb end
     from checked),
    jsonb_build_object('status', 'invalid', 'email_matches', false)
  )
$$;

revoke all on function public.get_staff_invitation_status(uuid, text) from public;
grant execute on function public.get_staff_invitation_status(uuid, text) to anon, authenticated;
