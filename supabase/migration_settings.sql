-- Run this in the Supabase SQL Editor.
-- Adds the missing DELETE policy so an organisation's owner can delete it
-- directly from the app (required for the new Settings page).

create policy "owner delete org" on organisations for delete using (owner_id = auth.uid());
