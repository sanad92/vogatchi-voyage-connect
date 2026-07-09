
REVOKE ALL ON FUNCTION public._can_read_org_finance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_trial_balance(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_income_statement(uuid, date, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_balance_sheet(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_cash_flow(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_customer_aging(uuid, date) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public._can_read_org_finance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_income_statement(uuid, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balance_sheet(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_flow(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_aging(uuid, date) TO authenticated;
