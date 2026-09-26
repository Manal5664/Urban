import sqlite3,json,datetime,collections
from pathlib import Path
c=sqlite3.connect('file:reports/production_validation.sqlite?mode=ro',uri=True);c.row_factory=sqlite3.Row
counts=dict(c.execute('select trip_id,count(*) from passenger_journeys group by trip_id'))
events=[dict(r) for r in c.execute('select * from context_events ORDER BY rowid')]
first=dict(c.execute('select pattern_id,stop_id from route_stops where stop_sequence=1'))
groups=collections.defaultdict(list);treated=[]
month_events=collections.defaultdict(list)
for e in events:month_events[e['starts_at_utc'][:7]].append(e)
selected_exposures=0
for row in c.execute("select * from trips where plan_status='CURRENT' and trip_status!='CANCELLED'"):
 t=dict(row);day=datetime.date.fromisoformat(t['service_date']);t['day']=day.toordinal();t['movements']=counts.get(t['trip_id'],0)
 t['types']=sorted({e['event_type'] for e in events if e['starts_at_utc']<=t['scheduled_start_utc']<=e['ends_at_utc'] and (e['scope']=='NETWORK' or e['scope']=='ROUTE' and e['route_id']==t['route_id'] or e['scope']=='STOP' and e['stop_id']==first.get(t['pattern_id']))})
 month=month_events[t['service_date'][:7]]
 selected=month[(day-datetime.date(2025,1,1)).days % len(month)] if month else None
 if selected and selected['starts_at_utc']<=t['scheduled_start_utc']<=selected['ends_at_utc'] and (selected['scope']=='NETWORK' or selected['scope']=='ROUTE' and selected['route_id']==t['route_id'] or selected['scope']=='STOP' and selected['stop_id']==first.get(t['pattern_id'])):selected_exposures+=1
 key=(t['pattern_id'],day.weekday(),t['scheduled_start_utc'][11:16],t['service_date'][:7])
 if t['types']:treated.append((key,t))
 else:groups[key].append(t)
pairs=[];unmatched=0
for key,t in treated:
 controls=sorted((b for b in groups[key] if 0<abs(b['day']-t['day'])<=28),key=lambda b:(abs(b['day']-t['day']),b['trip_id']))
 if not controls:unmatched+=1;continue
 baseline=sum(b['movements'] for b in controls)/len(controls)
 pairs.append({'trip_id':t['trip_id'],'event_types':t['types'],'event_movements':t['movements'],'control_mean':baseline,'control_trip_ids':[b['trip_id'] for b in controls]})
summary={'method':'Same pattern, weekday, UTC departure minute, calendar month; all non-event controls within 28 days; descriptive only, no causal or predictive claim.', 'generator_month_selected_exposed_trips':selected_exposures,'treated_trips':len(treated),'matched_trips':len(pairs),'unmatched_trips':unmatched}
if pairs:summary.update(event_mean=sum(p['event_movements'] for p in pairs)/len(pairs),matched_control_mean=sum(p['control_mean'] for p in pairs)/len(pairs))
summary['by_type']={k:{'pairs':len(v),'event_mean':sum(p['event_movements'] for p in v)/len(v),'control_mean':sum(p['control_mean'] for p in v)/len(v)} for k in sorted({k for p in pairs for k in p['event_types']}) if (v:=[p for p in pairs if k in p['event_types']])}
Path('reports/production_event_matched_diagnostic.json').write_text(json.dumps({'summary':summary,'pairs':pairs},indent=2)+'\n');print(json.dumps(summary,indent=2))
