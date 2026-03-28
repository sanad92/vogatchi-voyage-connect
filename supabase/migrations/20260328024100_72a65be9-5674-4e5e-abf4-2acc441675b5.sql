
-- Add organization_id to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR organization_id IN (SELECT unnest(public.get_user_org_ids(auth.uid()))));

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org members can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT unnest(public.get_user_org_ids(auth.uid()))));
