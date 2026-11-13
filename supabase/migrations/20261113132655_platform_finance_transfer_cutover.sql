BEGIN;

-- Apply after the published transfer screen uses approve_platform_bank_transfer.
-- Keep the existing rejection path and require the atomic function for approval.
DROP POLICY platform_admin_update_transfers ON public.bank_transfer_requests;
CREATE POLICY platform_admin_update_transfers ON public.bank_transfer_requests
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()) AND status = 'pending')
  WITH CHECK (public.is_platform_admin(auth.uid()) AND status = 'rejected'
    AND reviewed_by = auth.uid() AND reviewed_at IS NOT NULL);

COMMIT;
