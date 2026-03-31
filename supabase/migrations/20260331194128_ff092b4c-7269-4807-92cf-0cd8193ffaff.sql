
ALTER TABLE public.customers
  ADD CONSTRAINT customers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.customers
  ADD CONSTRAINT customers_last_follow_up_by_fkey
  FOREIGN KEY (last_follow_up_by) REFERENCES public.profiles(id);
