-- Add foreign key from profiles.linked_employee_id to employees.id
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_linked_employee_id_fkey
FOREIGN KEY (linked_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;