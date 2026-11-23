-- PRECAUCIÓN: este script SOLO rellena competiciones sin zonas definidas.
-- Requiere haber ejecutado sql/05-v31-11-zonas-clasificacion.sql del proyecto.
insert into public.competition_standing_zones(competition_id,label,start_position,end_position,color,sort_order)
select c.id,z.label,z.p1,z.p2,z.color,z.ord
from public.competitions c
cross join lateral (values
 ('LÍDER',1,1,'#D9A441',0),('DESCENSO',14,16,'#D65C5C',1)
) z(label,p1,p2,color,ord)
where lower(c.name) like '%primera%divisi%n%'
 and not exists(select 1 from public.competition_standing_zones x where x.competition_id=c.id);
insert into public.competition_standing_zones(competition_id,label,start_position,end_position,color,sort_order)
select c.id,z.label,z.p1,z.p2,z.color,z.ord
from public.competitions c
cross join lateral (values
 ('ASCENSO DIRECTO',1,2,'#299B68',0),('PLAYOFF',3,6,'#4687D8',1)
) z(label,p1,p2,color,ord)
where lower(c.name) like '%segunda%divisi%n%'
 and not exists(select 1 from public.competition_standing_zones x where x.competition_id=c.id);
