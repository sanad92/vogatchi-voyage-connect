
-- تفعيل الموظف Nesma Nasser
UPDATE employees 
SET is_active = true, updated_at = now()
WHERE full_name = 'Nesma Nasser';
