-- v23 : 20 cadeaux en vrai acceptés (liste de gift_claims.gift). Aucune donnée supprimée : seule la règle de contrôle est remplacée.
alter table public.gift_claims drop constraint if exists gift_claims_gift_check;
alter table public.gift_claims add constraint gift_claims_gift_check check (gift in ('bisou', 'gout', 'cocazero', 'icedtea', 'milkyway', 'kinder', 'redbull', 'bretznature', 'bretzpesto', 'reeses', 'massage', 'tacoscoq', 'crepes', 'kazdal', 'tasty', 'blackwhite', 'pizza', 'cinema', 'balade', 'surprise'));
