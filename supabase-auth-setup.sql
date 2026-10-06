alter table public.tasks
    add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists tasks_user_id_created_at_idx
    on public.tasks (user_id, created_at desc);

alter table public.tasks enable row level security;

drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_insert_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;
drop policy if exists tasks_owner_guard_select on public.tasks;
drop policy if exists tasks_owner_guard_insert on public.tasks;
drop policy if exists tasks_owner_guard_update on public.tasks;
drop policy if exists tasks_owner_guard_delete on public.tasks;

create policy tasks_select_own
    on public.tasks for select to authenticated
    using (auth.uid() = user_id);

create policy tasks_insert_own
    on public.tasks for insert to authenticated
    with check (auth.uid() = user_id);

create policy tasks_update_own
    on public.tasks for update to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy tasks_delete_own
    on public.tasks for delete to authenticated
    using (auth.uid() = user_id);

create policy tasks_owner_guard_select
    on public.tasks as restrictive for select to public
    using (auth.uid() = user_id);

create policy tasks_owner_guard_insert
    on public.tasks as restrictive for insert to public
    with check (auth.uid() = user_id);

create policy tasks_owner_guard_update
    on public.tasks as restrictive for update to public
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy tasks_owner_guard_delete
    on public.tasks as restrictive for delete to public
    using (auth.uid() = user_id);

-- Restrictive guards keep older permissive policies from exposing other users' rows.
-- Existing rows keep a null user_id and are hidden until assigned to an account.
-- To keep them, use an account UUID from Auth > Users:
-- update public.tasks set user_id = 'ACCOUNT-UUID' where user_id is null;