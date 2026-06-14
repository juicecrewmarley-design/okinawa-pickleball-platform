alter table public.tournament_entries
add column if not exists payment_method text not null default 'cash';

update public.tournament_entries
set payment_method = 'cash'
where payment_method is null
   or payment_method not in ('cash', 'paypay');

alter table public.tournament_entries
drop constraint if exists tournament_entries_payment_method_check;

alter table public.tournament_entries
add constraint tournament_entries_payment_method_check
check (payment_method in ('cash', 'paypay'));

select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tournament_entries'
  and column_name = 'payment_method';
