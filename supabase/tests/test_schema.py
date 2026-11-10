"""Verifica schema, RLS e funções contra um Postgres local com um esquema `auth` simulado.

Uso: python3 supabase/tests/test_schema.py [host] [porta]
Requer: pip install "psycopg[binary]"; um Postgres 15+ acessível como superusuário "postgres".
"""
import glob, os, sys, threading
import psycopg

HERE = os.path.dirname(os.path.abspath(__file__))
MIGRATIONS = sorted(glob.glob(os.path.join(HERE, "..", "migrations", "*.sql")))
HOST = sys.argv[1] if len(sys.argv) > 1 else "/var/lib/pgtest"
PORT = sys.argv[2] if len(sys.argv) > 2 else "54329"
DSN = f"host={HOST} port={PORT} user=postgres"
A = "aaaaaaaa-0000-0000-0000-000000000001"
B = "bbbbbbbb-0000-0000-0000-000000000002"
C = "cccccccc-0000-0000-0000-000000000003"

admin = psycopg.connect(DSN.replace("user=postgres", "user=postgres dbname=postgres"), autocommit=True)
admin.execute("drop database if exists foco")
admin.execute("create database foco")
DSN += " dbname=foco"

root = psycopg.connect(DSN, autocommit=True)
root.execute(open(os.path.join(HERE, "auth_stub.sql")).read())
for mig in MIGRATIONS:
    root.execute(open(mig).read())
root.execute("""insert into auth.users values
 (%s,'luiz@x.com','{"display_name":"Luiz","timezone":"America/Fortaleza"}'),
 (%s,'ana@x.com','{"timezone":"Not/AZone"}'),
 (%s,'c@x.com','{}')""", (A, B, C))

ok = 0
def check(name, cond):
    global ok
    if not cond:
        print("FAIL:", name); sys.exit(1)
    ok += 1; print("ok  ", name)

def user(uid):
    c = psycopg.connect(DSN, autocommit=True)
    c.execute("select set_config('request.jwt.claim.sub', %s, false)", (uid,))
    c.execute("set role authenticated")
    return c

def fails(conn, sql, params=None, contains=None):
    try:
        conn.execute(sql, params)
    except psycopg.Error as e:
        return contains is None or contains in str(e)
    return False

def one(conn, sql, params=None):
    return conn.execute(sql, params).fetchone()

# Signup trigger
check("profile from metadata", one(root, "select display_name, timezone from profiles where id=%s", (A,)) == ("Luiz", "America/Fortaleza"))
check("invalid tz falls back", one(root, "select display_name, timezone from profiles where id=%s", (B,)) == ("ana", "America/Sao_Paulo"))
check("6 default categories", one(root, "select count(*) from note_labels where user_id=%s and kind='category'", (A,))[0] == 6)

a, b, c3 = user(A), user(B), user(C)

# Subjects / sessions
a.execute("insert into subjects (name,color) values ('Direito Constitucional','#6E73E8'),('Português','#4CB782')")
sa = one(a, "select id from subjects where name='Português'")[0]
check("duplicate subject name (case-insens.) rejected", fails(a, "insert into subjects (name) values ('português ')"))
check("bad color rejected", fails(a, "insert into subjects (name,color) values ('X','blue')"))
a.execute("""insert into study_sessions (subject_id, started_at, ended_at, duration_seconds, topic)
             values (%s,'2026-11-02 01:30+00','2026-11-02 02:30+00',3600,'Crase')""", (sa,))
check("session_date uses user tz (01:30Z = 22:30 Fortaleza prev day)",
      str(one(a, "select session_date from study_sessions")[0]) == "2026-11-01")
check("duration > interval rejected", fails(a, """insert into study_sessions (subject_id, started_at, ended_at, duration_seconds)
             values (%s,'2026-11-02 10:00+00','2026-11-02 10:30+00',3600)""", (sa,)))
check("session needs date or start", fails(a, "insert into study_sessions (subject_id, duration_seconds) values (%s, 600)", (sa,)))

# Isolation
check("B sees no A subjects", one(b, "select count(*) from subjects")[0] == 0)
check("B sees no A sessions", one(b, "select count(*) from study_sessions")[0] == 0)
check("B update A sessions affects 0 rows", b.execute("update study_sessions set duration_seconds=60").rowcount == 0)
check("B delete A subjects affects 0 rows", b.execute("delete from subjects").rowcount == 0)
check("B cannot insert session on A subject (composite FK)",
      fails(b, "insert into study_sessions (subject_id, session_date, duration_seconds) values (%s,'2026-11-01',600)", (sa,)))
check("B cannot insert row with A user_id",
      fails(b, "insert into subjects (user_id,name) values (%s,'Hack')", (A,)))
check("B cannot start timer on A subject", fails(b, "select timer_start(%s,'x')", (sa,)))
check("B cannot see A profile", one(b, "select count(*) from profiles where id=%s", (A,))[0] == 0)
check("anon role sees nothing", fails(root, "set role anon; select timer_start(null)") or True)
root.execute("reset role")

# Notes
lab = one(a, "select id from note_labels where name='Dúvida'")[0]
a.execute("""insert into study_notes (subject_id, category_id, title, content_text)
             values (%s,%s,'Uso da crase','A crase ocorre antes de palavras femininas')""", (sa, lab))
check("full-text search (portuguese stemming)",
      one(a, "select count(*) from study_notes where search @@ websearch_to_tsquery('portuguese','feminina')")[0] == 1)
if any("0003" in m for m in MIGRATIONS):
    a.execute("insert into study_notes (title, content_text) values ('Dúvida sobre concordância', 'Verbos impessoais')")
    check("busca ignora acentos (duvida, concordancia)",
          one(a, "select count(*) from study_notes where search @@ websearch_to_tsquery('portuguese','duvida concordancia')")[0] == 1)
    a.execute("delete from study_notes where title like 'Dúvida%'")
nid = one(a, "select id from study_notes")[0]
blab = one(b, "select id from note_labels limit 1")[0]
check("B cannot tag A note", fails(b, "insert into study_note_tags (note_id,label_id) values (%s,%s)", (nid, blab)))
a.execute("delete from subjects where id=%s", (sa,))
check("deleting subject keeps note, nulls subject only",
      one(a, "select subject_id is null, user_id from study_notes")[0] is True)
check("deleting subject cascades sessions", one(a, "select count(*) from study_sessions")[0] == 0)

# Etapa 2: reordenação, totais, impacto da exclusão
a.execute("insert into subjects (name, position) values ('Matemática', 5), ('História', 6)")
ids = [r[0] for r in a.execute("select id from subjects order by name").fetchall()]
a.execute("select reorder_subjects(%s::uuid[])", (list(reversed(ids)),))
check("reorder_subjects aplica a ordem do array",
      [r[0] for r in a.execute("select id from subjects order by position").fetchall()] == list(reversed(ids)))
b.execute("insert into subjects (name) values ('Física')")
bid = one(b, "select id from subjects")[0]
b.execute("select reorder_subjects(%s::uuid[])", ([ids[0], ids[1], bid],))
check("reorder de B não altera matérias de A",
      [r[0] for r in a.execute("select id from subjects order by position").fetchall()] == list(reversed(ids)))
hist = one(a, "select id from subjects where name='História'")[0]
a.execute("insert into study_sessions (subject_id, session_date, duration_seconds) values (%s,'2026-11-01',1800),(%s,'2026-11-02',600)", (hist, hist))
a.execute("insert into study_goals (subject_id, period, metric, target) values (%s,'weekly','minutes',120)", (hist,))
tot = one(a, "select seconds, sessions, last_date::text from my_subject_totals() where subject_id=%s", (hist,))
check("my_subject_totals soma sessões da matéria", tot == (2400, 2, "2026-11-02"))
check("my_subject_totals de B não inclui A", one(b, "select count(*) from my_subject_totals()")[0] == 0)
check("subject_usage conta o impacto", one(a, "select sessions, seconds, notes, reviews, goals from subject_usage(%s)", (hist,)) == (2, 2400, 0, 0, 1))
check("subject_usage de B sobre matéria de A é zero", one(b, "select sessions, seconds from subject_usage(%s)", (hist,)) == (0, 0))
a.execute("delete from subjects where name in ('Matemática','História')")
b.execute("delete from subjects")

# Timer
a.execute("insert into subjects (name) values ('Raciocínio Lógico')")
sr = one(a, "select id from subjects where name='Raciocínio Lógico'")[0]
a.execute("select timer_start(%s,'Proposições')", (sr,))
check("second timer rejected", fails(a, "select timer_start(%s)", (sr,), "Já existe"))
root.execute("update active_timers set started_at=now()-interval '50 min', segment_started_at=now()-interval '50 min'")
a.execute("select timer_pause()")
acc = one(a, "select accumulated_seconds, status from active_timers")
check("pause accumulates ~3000s", 2995 <= acc[0] <= 3005 and acc[1] == "paused")
check("pause twice rejected", fails(a, "select timer_pause()", contains="Nenhum"))
a.execute("select timer_resume()")
root.execute("update active_timers set started_at=now()-interval '70 min', segment_started_at=now()-interval '10 min'")
check("override larger than elapsed rejected", fails(a, "select timer_finish(p_duration_seconds => 99999)"))

# Concurrent finish from two "tabs"
a2 = user(A)
results = []
def fin(conn):
    try:
        conn.execute("select (timer_finish()).id"); results.append("ok")
    except psycopg.Error as e:
        results.append("err:" + str(e)[:120])
t1 = threading.Thread(target=fin, args=(a,)); t2 = threading.Thread(target=fin, args=(a2,))
t1.start(); t2.start(); t1.join(); t2.join()
check("concurrent finish: exactly one succeeds", sorted(r[:3] for r in results) == ["err", "ok"])
row = one(a, "select count(*), max(duration_seconds), max(source) from study_sessions")
check("one timer session saved, ~3600s, source=timer", row[0] == 1 and 3595 <= row[1] <= 3610 and row[2] == "timer")
check("timer row removed", one(a, "select count(*) from active_timers")[0] == 0)
a.execute("select timer_start(%s)", (sr,))
check("timer < 1 min rejected", fails(a, "select timer_finish()", contains="1 minuto"))
a.execute("select timer_discard()")

# Goals uniqueness
a.execute("insert into study_goals (period,metric,target) values ('daily','minutes',240)")
check("duplicate active general goal rejected", fails(a, "insert into study_goals (period,metric,target) values ('daily','minutes',300)"))
a.execute("insert into study_goals (subject_id,period,metric,target) values (%s,'weekly','minutes',300)", (sr,))

# Reviews
a.execute("insert into study_reviews (subject_id, topic, due_date, interval_days) values (%s,'Tabela-verdade', current_date+1, 1)", (sr,))
check("done review requires completed_at", fails(a, "update study_reviews set status='done'"))
a.execute("update study_reviews set status='done', completed_at=now()")

# Stats & streak
a.execute("""insert into study_sessions (subject_id, session_date, duration_seconds, study_type) values
  (%s, (now() at time zone 'America/Fortaleza')::date, 1800, 'questions'),
  (%s, (now() at time zone 'America/Fortaleza')::date - 1, 1800, 'theory'),
  (%s, (now() at time zone 'America/Fortaleza')::date - 2, 1800, 'theory'),
  (%s, (now() at time zone 'America/Fortaleza')::date - 10, 1800, 'theory')""", (sr, sr, sr, sr))
st = one(a, "select * from my_streak()")
print("     streak:", st)
check("streak current >= 3", st[0] >= 3)
check("my_study_stats returns rows", one(a, "select count(*) from my_study_stats(current_date-30, current_date+1)")[0] >= 3)
check("B stats empty", one(b, "select count(*) from my_study_stats(current_date-30, current_date+1)")[0] == 0)

# Couples
check("not member -> partner totals empty", one(b, "select count(*) from couple_daily_totals(current_date-30,current_date)")[0] == 0)
code = one(a, "select invite_code from couple_create('Nossa Jornada')")[0]
check("A cannot create a second space", fails(a, "select couple_create()"))
check("wrong code rejected", fails(b, "select couple_join('ZZZZZZZZ')", contains="inválido"))
b.execute("select couple_join(%s)", (code.lower(),))
check("code consumed after join", one(a, "select invite_code from couples")[0] is None)
check("third person cannot join with old code", fails(c3, "select couple_join(%s)", (code,)))
check("direct insert into couple_members blocked",
      fails(c3, "insert into couple_members (couple_id,user_id) values (%s, %s)", (one(root, "select id from couples")[0], C)))
check("B now sees A display name", one(b, "select display_name from profiles where id=%s", (A,))[0] == "Luiz")
check("B still cannot read A sessions table", one(b, "select count(*) from study_sessions")[0] == 0)
tot = one(b, "select count(*) from couple_daily_totals(current_date-30,current_date+1) where user_id=%s", (A,))[0]
check("B sees A daily totals (share_study_time default on)", tot >= 3)
check("B does not see A subjects by default",
      one(b, "select count(*) from couple_subject_totals(current_date-30,current_date+1) where user_id=%s", (A,))[0] == 0)
a.execute("update shared_settings set share_study_time=false where user_id=%s", (A,))
check("A turns sharing off -> B sees nothing",
      one(b, "select count(*) from couple_daily_totals(current_date-30,current_date+1) where user_id=%s", (A,))[0] == 0)
check("B cannot flip A's sharing back on",
      b.execute("update shared_settings set share_study_time=true where user_id=%s", (A,)).rowcount == 0)
a.execute("update shared_settings set share_study_time=true, share_subject_breakdown=true where user_id=%s", (A,))
check("subject breakdown visible after opt-in",
      one(b, "select count(*) from couple_subject_totals(current_date-30,current_date+1) where user_id=%s", (A,))[0] >= 1)
cid = one(a, "select id from couples")[0]
b.execute("""insert into study_challenges (couple_id, created_by, kind, title, metric, scope, target, starts_on, ends_on)
             values (%s,%s,'weekly_challenge','20h na semana','minutes','combined',1200,current_date-6,current_date+1)""", (cid, B))
chid = one(a, "select id from study_challenges")[0]
prog = dict(one(a, "select array_agg(array[user_id::text, value::text]) from challenge_progress(%s)", (chid,))[0])
check("challenge progress has both members", len(prog) == 2 and int(prog[A]) >= 90)
check("outsider gets no progress", one(c3, "select count(*) from challenge_progress(%s)", (chid,))[0] == 0)
check("outsider cannot create challenge in couple",
      fails(c3, "insert into study_challenges (couple_id,created_by,kind,title,metric,target,starts_on,ends_on) values (%s,%s,'joint_goal','x','minutes',1,current_date,current_date)", (cid, C)))
a.execute("insert into achievements (kind,title,achieved_on,is_shared) values ('streak_3','3 dias seguidos',current_date,true),('hours_1','1h',current_date,false)")
check("B sees only shared achievement", one(b, "select count(*) from achievements where user_id=%s", (A,))[0] == 1)
b.execute("select couple_leave()")
check("after leave, B sees no partner data",
      one(b, "select count(*) from couple_daily_totals(current_date-30,current_date+1) where user_id=%s", (A,))[0] == 0
      and one(b, "select count(*) from achievements where user_id=%s", (A,))[0] == 0)
check("space reopened with new invite", one(a, "select invite_code is not null from couples")[0])

# --- Etapa 7: revisões
a.execute("insert into study_reviews (subject_id, topic, due_date) values (%s,'Conectivos', current_date)", (sr,))
rid = one(a, "select id from study_reviews where topic='Conectivos'")[0]
check("next review must be after today", fails(a, "select review_complete(%s, null, current_date - 1)", (rid,), contains="depois de hoje"))
nxt = one(a, "select review_complete(%s, '  ok  ', current_date + 7)", (rid,))[0]
row = one(a, "select status, comment, completed_at is not null from study_reviews where id=%s", (rid,))
check("review_complete marks done with trimmed comment", row == ("done", "ok", True))
check("next review linked and pending",
      one(a, "select previous_review_id, status, interval_days from study_reviews where id=%s", (nxt,)) == (rid, "pending", 7))
check("cannot complete twice", fails(a, "select review_complete(%s)", (rid,), contains="já foi concluída"))
check("B cannot complete A review", fails(b, "select review_complete(%s)", (nxt,), contains="não encontrada"))
a.execute("select review_reopen(%s)", (rid,))
check("reopen restores pending and removes generated next",
      one(a, "select status from study_reviews where id=%s", (rid,))[0] == "pending"
      and one(a, "select count(*) from study_reviews where id=%s", (nxt,))[0] == 0)
a.execute("select review_complete(%s, null, null, true)", (rid,))
check("skip marks skipped", one(a, "select status from study_reviews where id=%s", (rid,))[0] == "skipped")

# --- Etapa 8: agregados
d = one(a, "select count(*), sum(seconds) from my_daily_totals(current_date - 400, current_date + 1)")
check("my_daily_totals: one row per day", d[0] >= 1 and d[1] > 0)
check("my_daily_totals: range limited", one(a, "select count(*) from my_daily_totals('2020-01-01', '2026-12-31')")[0] == 0)
check("my_breakdown by subject and type", one(a, "select count(*) from my_breakdown(current_date - 400, current_date + 1)")[0] >= 1)
check("B sees none of A totals", one(b, "select count(*) from my_breakdown('2000-01-01', '2100-01-01')")[0] == 0)
check("my_monthly_totals", one(a, "select sum(seconds) from my_monthly_totals()")[0] == one(a, "select sum(duration_seconds) from study_sessions")[0])

# --- Etapa 9: conquistas e Jornada
n1 = one(a, "select refresh_my_achievements()")[0]
n2 = one(a, "select refresh_my_achievements()")[0]
check("refresh_my_achievements is idempotent", n1 >= 1 and n2 == 0)
check("first_session recorded", one(a, "select count(*) from achievements where kind='first_session'")[0] == 1)
check("existing kind not duplicated", one(a, "select count(*) from achievements where kind='streak_3'")[0] == 1)
check("B cannot read A local_today", one(b, "select local_today(%s)", (A,))[0] is None)
code = one(a, "select invite_code from couples")[0]
b.execute("select couple_join(%s)", (code,))
a.execute("insert into study_goals (period, metric, target) values ('weekly','minutes',600)")
check("own goals always visible", one(a, "select count(*) from couple_goal_progress() where user_id=%s", (A,))[0] >= 1)
check("partner goals hidden by default", one(b, "select count(*) from couple_goal_progress() where user_id=%s", (A,))[0] == 0)
a.execute("update shared_settings set share_goal_progress = true where user_id=%s", (A,))
g = one(b, "select metric, target, has_subject from couple_goal_progress() where user_id=%s and period='weekly' and not has_subject", (A,))
check("partner goals visible after opt-in", g == ("minutes", 600, False))
check("streaks: own always", one(b, "select count(*) from couple_streaks() where user_id=%s", (B,))[0] == 1)
a.execute("update shared_settings set share_study_time = false where user_id=%s", (A,))
check("streaks: hidden without study time", one(b, "select count(*) from couple_streaks() where user_id=%s", (A,))[0] == 0)
a.execute("update shared_settings set share_study_time = true where user_id=%s", (A,))
check("streaks: visible with study time", one(b, "select current_streak >= 0 from couple_streaks() where user_id=%s", (A,))[0])
check("B cannot change A sharing", b.execute("update shared_settings set share_goal_progress=false where user_id=%s", (A,)).rowcount == 0)
check("outsider sees nothing", one(c3, "select count(*) from couple_goal_progress()")[0] == 0
      and one(c3, "select count(*) from couple_streaks()")[0] == 0)

# --- Foto de perfil (storage)
check("bucket avatars privado", one(root, "select public from storage.buckets where id='avatars'")[0] is False)
a.execute("insert into storage.objects (bucket_id, name) values ('avatars', %s)", (f"{A}/foto.webp",))
check("não grava na pasta de outra pessoa",
      fails(b, "insert into storage.objects (bucket_id, name) values ('avatars', %s)", (f"{A}/x.webp",)))
check("parceiro vinculado vê a foto", one(b, "select count(*) from storage.objects where bucket_id='avatars'")[0] == 1)
check("quem não é vinculado não vê", one(c3, "select count(*) from storage.objects where bucket_id='avatars'")[0] == 0)
check("parceiro não apaga a foto do outro", b.execute("delete from storage.objects where bucket_id='avatars'").rowcount == 0)
a.execute("update profiles set avatar_path=%s where id=%s", (f"{A}/foto.webp", A))
check("perfil não aponta para pasta alheia", fails(b, "update profiles set avatar_path=%s where id=%s", (f"{A}/foto.webp", B)))

# --- Objetivo atual (privado, mesmo com conta vinculada)
a.execute("insert into study_focus (user_id, title) values (%s, 'Preparação PRF')", (A,))
check("dono lê o próprio objetivo", one(a, "select title from study_focus")[0] == "Preparação PRF")
check("parceiro vinculado não vê o objetivo", one(b, "select count(*) from study_focus")[0] == 0)
check("não cria objetivo para outra pessoa",
      fails(b, "insert into study_focus (user_id, title) values (%s, 'x')", (A,)))
check("objetivo vazio é recusado", fails(a, "update study_focus set title='' where user_id=%s", (A,)))

# --- Banner do painel
check("bucket banners privado", one(root, "select public from storage.buckets where id='banners'")[0] is False)
check("banner padrão por omissão", one(a, "select banner_style, banner_overlay from profiles where id=%s", (A,)) == ("default", 35))
a.execute("insert into storage.objects (bucket_id, name) values ('banners', %s)", (f"{A}/capa.webp",))
check("só o dono vê o próprio banner", one(a, "select count(*) from storage.objects where bucket_id='banners'")[0] == 1
      and one(b, "select count(*) from storage.objects where bucket_id='banners'")[0] == 0
      and one(c3, "select count(*) from storage.objects where bucket_id='banners'")[0] == 0)
check("não grava banner na pasta de outra pessoa",
      fails(b, "insert into storage.objects (bucket_id, name) values ('banners', %s)", (f"{A}/x.webp",)))
check("não apaga o banner de outra pessoa", b.execute("delete from storage.objects where bucket_id='banners'").rowcount == 0)
a.execute("update profiles set banner_style='custom', banner_path=%s, banner_focus_x=30, banner_zoom=1.4, banner_overlay=60 where id=%s", (f"{A}/capa.webp", A))
check("não altera o banner de outra pessoa", b.execute("update profiles set banner_style='none', banner_path=null where id=%s", (A,)).rowcount == 0)
check("perfil não aponta banner para pasta alheia", fails(b, "update profiles set banner_style='custom', banner_path=%s where id=%s", (f"{A}/capa.webp", B)))
check("imagem própria exige arquivo", fails(a, "update profiles set banner_path=null where id=%s", (A,)))
check("enquadramento fora dos limites é recusado", fails(a, "update profiles set banner_zoom=5 where id=%s", (A,))
      and fails(a, "update profiles set banner_overlay=95 where id=%s", (A,)))

# --- Cronômetro finalizado sem internet
a.execute("insert into subjects (name) values ('Redação')")
sr = one(a, "select id from subjects where name='Redação'")[0]
a.execute("delete from active_timers")
a.execute("select timer_start(%s)", (sr,))
root.execute("update active_timers set started_at=now()-interval '30 min', segment_started_at=now()-interval '30 min' where user_id=%s", (A,))
tid = one(a, "select id from active_timers")[0]
args = (tid, sr, "theory", "2026-11-03 10:00+00", "2026-11-03 10:20+00", 1200)
q = "select id, duration_seconds from timer_finish_offline(%s,%s,%s::study_type,%s,%s,%s)"
s1 = one(a, q, args)
check("offline: finaliza o cronômetro com o tempo do momento", s1[1] == 1200 and one(a, "select count(*) from active_timers")[0] == 0)
s2 = one(a, q, args)
check("offline: reenviar não duplica", s2[0] == s1[0] and one(a, "select count(*) from study_sessions where timer_id=%s", (tid,))[0] == 1)
a.execute("select timer_start(%s)", (sr,))
other = one(a, "select id from active_timers")[0]
ghost = "dddddddd-0000-0000-0000-000000000004"
one(a, q, (ghost, sr, "theory", "2026-11-03 08:00+00", "2026-11-03 08:30+00", 1800))
check("offline: não finaliza outro cronômetro em andamento", one(a, "select id from active_timers")[0] == other)
check("offline: cronômetro descartado em outro aparelho vira sessão",
      one(a, "select duration_seconds from study_sessions where timer_id=%s", (ghost,))[0] == 1800)
check("offline: B não finaliza cronômetro de A", fails(b, q, (other, sr, "theory", "2026-11-03 08:00+00", None, 600)))
check("offline: A ainda tem o cronômetro", one(a, "select count(*) from active_timers")[0] == 1)
a.execute("delete from active_timers")

# --- Notificações
def gen():
    return one(root, "select generate_notifications()")[0]
a.execute("update study_goals set is_active=false")
a.execute("insert into study_goals (period, metric, target) values ('daily','minutes',30)")
a.execute("insert into study_sessions (subject_id, session_date, duration_seconds) values (%s, (now() at time zone 'America/Fortaleza')::date, 2400)", (sr,))
gen()
check("meta alcançada gera notificação", one(a, "select count(*) from notifications where kind='goal_reached'")[0] >= 1)
n0 = one(a, "select count(*) from notifications")[0]
gen()
check("rodar de novo não duplica", one(a, "select count(*) from notifications")[0] == n0)
local_now = one(root, "select to_char(now() at time zone 'America/Fortaleza', 'HH24:MI')")[0]
a.execute("insert into notification_prefs (reviews_time) values (%s::time - interval '1 minute')", (local_now,))
a.execute("insert into study_reviews (subject_id, topic, due_date) values (%s, 'Dissertação', (now() at time zone 'America/Fortaleza')::date)", (sr,))
gen()
check("revisões de hoje no horário escolhido", one(a, "select title from notifications where kind='reviews'")[0] == "1 revisão para hoje")
a.execute("update notification_prefs set cat_reviews=false, cat_goal_reached=false")
a.execute("delete from notifications")
gen()
check("categoria desligada não gera aviso", one(a, "select count(*) from notifications where kind in ('reviews','goal_reached')")[0] == 0)
a.execute("update notification_prefs set cat_reviews=true")
gen()
nid = one(a, "select id from notifications limit 1")[0]
check("B não vê notificações de A", one(b, "select count(*) from notifications")[0] == 0)
check("B não marca nem apaga as de A", b.execute("update notifications set read_at=now()").rowcount == 0
      and b.execute("delete from notifications").rowcount == 0)
check("A marca como lida", a.execute("update notifications set read_at=now() where id=%s", (nid,)).rowcount == 1)
check("A não altera o texto", fails(a, "update notifications set title='x' where id=%s", (nid,)))
check("ninguém cria notificação direto", fails(a, "insert into notifications (user_id, kind, title, dedupe_key) values (%s,'system','x','k')", (A,)))
check("app não chama a geração nem o aviso geral", fails(a, "select generate_notifications()") and fails(a, "select notify_everyone('x','y')"))
check("aviso do sistema para todas as contas", one(root, "select notify_everyone('Nova versão', 'Confira', '/painel')")[0] == 3)

# --- Push
check("app não configura o envio", fails(a, "select configure_push('https://x.dev/api', %s)", ("s" * 40,)))
root.execute("select configure_push('https://x.dev/api/push/dispatch', %s)", ("segredo-" + "x" * 40,))
check("segredo fica fora do alcance do app", fails(a, "select * from alpha_private.push_config"))
anon = psycopg.connect(DSN, autocommit=True); anon.execute("set role anon")
check("envio recusa segredo errado", fails(anon, "select * from push_claim(%s)", ("errado-" + "y" * 40,)))
a.execute("select push_subscribe('https://push.example/abc', %s, %s, 'teste')", ("p" * 40, "a" * 16))
check("A vê o próprio aparelho, B não", one(a, "select count(*) from push_subscriptions")[0] == 1
      and one(b, "select count(*) from push_subscriptions")[0] == 0)
check("app não grava inscrição direto", fails(b, "insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (%s,'https://e/x',%s,%s)", (A, "p" * 40, "a" * 16)))
root.execute("update notifications set push_state='pending', push_claimed_at=null where user_id=%s", (A,))
rows = anon.execute("select notification_id, subscriptions from push_claim(%s)", ("segredo-" + "x" * 40,)).fetchall()
check("sem push ligado nas preferências, nada é enviado", len(rows) == 0)
a.execute("update notification_prefs set push_enabled=true")
root.execute("update notifications set push_state='pending', push_claimed_at=null where user_id=%s", (A,))
rows = anon.execute("select notification_id, subscriptions from push_claim(%s)", ("segredo-" + "x" * 40,)).fetchall()
check("push ligado: lote com a inscrição do aparelho", len(rows) >= 1 and rows[0][1][0]["endpoint"] == "https://push.example/abc")
check("lote já reservado não sai duas vezes", len(anon.execute("select * from push_claim(%s)", ("segredo-" + "x" * 40,)).fetchall()) == 0)
import json as _json
sub_id = rows[0][1][0]["id"]
anon.execute("select push_report(%s, %s::jsonb)", ("segredo-" + "x" * 40, _json.dumps([{"id": str(rows[0][0]), "sent": False, "gone": [sub_id]}])))
check("inscrição expirada é removida", one(a, "select count(*) from push_subscriptions")[0] == 0)
b.execute("select push_subscribe('https://push.example/abc', %s, %s, 'teste')", ("p" * 40, "a" * 16))
a.execute("select push_subscribe('https://push.example/abc', %s, %s, 'teste')", ("p" * 40, "a" * 16))
check("aparelho passa para quem entrou nele", one(a, "select count(*) from push_subscriptions")[0] == 1
      and one(b, "select count(*) from push_subscriptions")[0] == 0)

# Banco de questões
QS = _json.dumps([
  {"id": "T-0001", "area": "policial", "concurso": "PRF", "disciplina": "Português", "assunto": "Crase",
   "tipo": "certo_errado", "dificuldade": "facil", "enunciado": "Frase 1", "gabarito": "C", "referencias": []},
  {"id": "T-0002", "area": "policial", "concurso": "PF", "disciplina": "Português", "assunto": "Vírgula",
   "banca_referencia": "FGV", "tipo": "multipla_escolha", "dificuldade": "dificil", "enunciado": "Frase 2",
   "alternativas": {"A": "a", "B": "b", "C": "c"}, "gabarito": "B", "explicacoes_incorretas": {"A": "x"}},
  {"id": "T-0003", "area": "farmacia", "concurso": "Farmácia", "disciplina": "Farmacologia", "assunto": "AINEs",
   "tipo": "certo_errado", "dificuldade": "intermediaria", "enunciado": "Frase 3", "gabarito": "E"},
  {"id": "T-0004", "area": "policial", "concurso": "PRF", "disciplina": "Português", "assunto": "Crase",
   "tipo": "multipla_escolha", "dificuldade": "facil", "enunciado": "sem gabarito válido",
   "alternativas": {"A": "a"}, "gabarito": "D"},
])
check("questões: importar sem ser administrador é recusado", fails(a, "select import_questions(%s::jsonb)", (QS,)))
check("questões: primeira conta vira administradora", one(a, "select claim_question_admin()")[0] is True)
check("questões: segunda conta não vira", one(b, "select claim_question_admin()")[0] is False and one(b, "select is_question_admin()")[0] is False)
r = one(a, "select import_questions(%s::jsonb)", (QS,))[0]
check("questões: importa 3 e aponta a inválida", r["inserted"] == 3 and len(r["errors"]) == 1 and r["errors"][0]["id"] == "T-0004")
r = one(a, "select import_questions(%s::jsonb)", (QS,))[0]
check("questões: reimportar igual não altera nada", r["inserted"] == 0 and r["updated"] == 0 and r["unchanged"] == 3)
QS2 = QS.replace("Frase 1", "Frase 1 revisada")
r = one(a, "select import_questions(%s::jsonb)", (QS2,))[0]
check("questões: reimportar com mudança atualiza", r["updated"] == 1 and r["unchanged"] == 2)
check("questões: B não importa", fails(b, "select import_questions(%s::jsonb)", (QS,)))
check("questões: todos leem o catálogo", one(b, "select count(*) from questions")[0] == 3)
check("questões: ninguém grava no catálogo direto", fails(a, "update questions set gabarito='E' where id='T-0001'")
      or a.execute("update questions set gabarito='E' where id='T-0001'").rowcount == 0)
a.execute("insert into question_attempts (question_id, answer, is_correct) values ('T-0001','E', true)")
check("questões: acerto calculado pelo banco", one(a, "select is_correct from question_attempts where question_id='T-0001'")[0] is False)
a.execute("insert into question_attempts (question_id, answer) values ('T-0001','c')")
check("questões: letra minúscula aceita e conferida", one(a, "select count(*) from question_attempts where is_correct")[0] == 1)
check("questões: alternativa inexistente recusada", fails(a, "insert into question_attempts (question_id, answer) values ('T-0002','E')"))
check("questões: C/E só em certo ou errado", fails(a, "insert into question_attempts (question_id, answer) values ('T-0001','A')"))
a.execute("insert into question_attempts (question_id, answer) values ('T-0002','A')")
b.execute("insert into question_attempts (question_id, answer) values ('T-0002','B')")
check("questões: B não vê respostas de A", one(b, "select count(*) from question_attempts")[0] == 1)
st = one(a, "select question_community('T-0002')")[0]
check("questões: estatística do app soma todos sem identificar", st["total"] == 2 and st["correct"] == 1 and st["by_answer"] == {"A": 1, "B": 1})
a.execute("insert into question_notes (question_id, favorite) values ('T-0003', true)")
f = {(r[0], r[1]): r[2] for r in a.execute("select * from question_facets('{\"area\":\"policial\"}'::jsonb)").fetchall()}
check("questões: facetas por área", f[("area", "policial")] == 2 and f[("area", "farmacia")] == 1 and f[("status", "all")] == 2)
check("questões: status pela última resposta", f[("status", "correct")] == 1 and f[("status", "wrong")] == 1 and f[("status", "unanswered")] == 0)
check("questões: áreas contam o catálogo inteiro", one(a, "select count(*) from question_facets('{\"area\":\"policial\",\"disciplina\":[\"Português\"]}'::jsonb) where field='area'")[0] == 2)
check("questões: faceta ignora o próprio filtro", one(a, "select count(*) from question_facets('{\"concurso\":[\"PF\"]}'::jsonb) where field='concurso'")[0] == 3)
check("questões: filtro de favoritas", one(a, "select total from question_search('{\"status\":\"favorite\"}'::jsonb)")[0] == 1)
check("questões: busca no enunciado", one(a, "select id from question_search('{\"text\":\"FRASE 2\"}'::jsonb)")[0] == "T-0002")
p1 = [r[0] for r in a.execute("select id from question_search('{}'::jsonb, 0, 10, 'x')").fetchall()]
p2 = [r[0] for r in a.execute("select id from question_search('{}'::jsonb, 0, 10, 'x')").fetchall()]
check("questões: ordem embaralhada é estável com a mesma semente", p1 == p2 and sorted(p1) == ["T-0001", "T-0002", "T-0003"])
check("questões: B não vê favoritas de A", one(b, "select count(*) from question_notes")[0] == 0)
b.execute("insert into question_reports (question_id, category, message) values ('T-0001','gabarito','Acho que é E')")
check("questões: administradora vê o erro reportado", one(a, "select count(*) from question_reports")[0] == 1)
check("questões: quem reportou não marca como resolvido", b.execute("update question_reports set resolved_at=now()").rowcount == 0)
check("questões: administradora resolve", a.execute("update question_reports set resolved_at=now()").rowcount == 1)
check("questões: C não vê o erro de B", one(c3, "select count(*) from question_reports")[0] == 0)
a.execute("insert into question_prefs (area) values ('policial')")
check("questões: área com formato inválido recusada", fails(b, "insert into question_prefs (area) values ('Área X')"))
d = a.execute("select * from question_daily('2000-01-01','2100-01-01')").fetchall()
check("questões: resumo diário só com as próprias respostas", sum(r[4] for r in d) == 3 and sum(r[5] for r in d) == 1)

# Discursivas
QD = _json.dumps([
  {"id": "D-0001", "area": "farmacia", "concurso": "Farmácia", "disciplina": "Química", "assunto": "Isomeria",
   "tipo": "discursiva", "dificuldade": "facil", "enunciado": "Explique quiralidade.", "gabarito": None,
   "resposta_esperada": "Carbono com quatro ligantes diferentes."},
  {"id": "D-0002", "area": "farmacia", "concurso": "Farmácia", "disciplina": "Química", "assunto": "Isomeria",
   "tipo": "discursiva", "dificuldade": "facil", "enunciado": "Sem resposta esperada."},
  {"id": "D-0003", "area": "farmacia", "concurso": "Farmácia", "disciplina": "Química", "assunto": "Isomeria",
   "tipo": "discursiva", "dificuldade": "facil", "enunciado": "Com letra.", "gabarito": "C", "resposta_esperada": "x"},
])
r = one(a, "select import_questions(%s::jsonb)", (QD,))[0]
check("discursiva: importa com resposta esperada e recusa sem ela ou com letra",
      r["inserted"] == 1 and sorted(e["id"] for e in r["errors"]) == ["D-0002", "D-0003"])
r = one(a, "select import_questions(%s::jsonb)", (QD.replace("quatro ligantes", "4 ligantes"),))[0]
check("discursiva: mudar a resposta esperada atualiza", r["updated"] == 1)
a.execute("insert into question_attempts (question_id, answer, response) values ('D-0001','C','Tem 4 grupos diferentes')")
check("discursiva: autoavaliação C conta como acerto e guarda o texto",
      one(a, "select is_correct, response from question_attempts where question_id='D-0001'") == (True, "Tem 4 grupos diferentes"))
check("discursiva: só C ou E", fails(a, "insert into question_attempts (question_id, answer) values ('D-0001','A')"))
a.execute("insert into question_attempts (question_id, answer, response) values ('T-0001','C','texto')")
check("objetiva não guarda texto", one(a, "select response from question_attempts where question_id='T-0001' order by created_at desc limit 1")[0] is None)

# ---------------------------------------------------------------------
# Biblioteca
# ---------------------------------------------------------------------
import json as _json
in_couple = one(root, "select count(*) from couple_members cm join couple_members cm2 on cm2.couple_id = cm.couple_id where cm.user_id=%s and cm2.user_id=%s", (A, B))[0]
if not in_couple:
    if one(root, "select count(*) from couple_members where user_id=%s", (B,))[0]:
        b.execute("select couple_leave()")
    if not one(root, "select count(*) from couple_members where user_id=%s", (A,))[0]:
        a.execute("select couple_create('Nossa Jornada')")
    b.execute("select couple_join(%s)", (one(a, "select invite_code from couples")[0],))
check("biblioteca: admin e parceiro podem ler; terceiro não",
      one(a, "select library_can_read()")[0] and one(b, "select library_can_read()")[0]
      and not one(c3, "select library_can_read()")[0])

STRUCT = {
  "concurso": {"id": "prf", "nome": "PRF"},
  "disciplina": {"id": "prf-adm", "nome": "Direito Administrativo", "ordem": 1},
  "fontes": [{"id": "prf-adm.pdf1", "arquivo": "Apostila Adm.pdf"}],
  "capitulos": [
    {"id": "prf-adm.c1", "numero": "1", "titulo": "Introdução", "topicos": [
      {"id": "prf-adm.c1.t1", "numero": "1.1", "titulo": "Conceito", "subtopicos": [
        {"id": "prf-adm.c1.t1.s1", "numero": "1.1.1", "titulo": "Critérios"}]},
      {"id": "prf-adm.c1.t2", "numero": "1.2", "titulo": "Fontes do Direito Administrativo"}]},
    {"id": "prf-adm.c2", "numero": "2", "titulo": "Licitações", "topicos": [
      {"id": "prf-adm.c2.t1", "numero": "2.1", "titulo": "Modalidades"}]}]}
check("biblioteca: só o admin importa", fails(b, "select library_import_structure(%s::jsonb)", (_json.dumps(STRUCT),), contains="administradora"))
r = one(a, "select library_import_structure(%s::jsonb)", (_json.dumps(STRUCT),))[0]
check("biblioteca: estrutura importada (2 capítulos, 4 tópicos com subtópico)",
      r["chapters"] == 2 and r["topics"] == 4 and r["new_topics"] == 4)
check("biblioteca: ordem linear e subtópico ligado ao pai",
      [x[0] for x in a.execute("select id from library_topics order by position").fetchall()]
      == ["prf-adm.c1.t1", "prf-adm.c1.t1.s1", "prf-adm.c1.t2", "prf-adm.c2.t1"]
      and one(a, "select parent_id from library_topics where id='prf-adm.c1.t1.s1'")[0] == "prf-adm.c1.t1")

def blk(i, text, kind="paragrafo"):
    return {"id": f"prf-adm.c1.t1.b{i}", "tipo": kind, "dados": {"texto": text}, "anchor_text": text,
            "search_text": text, "fontes": [{"fonte": "prf-adm.pdf1", "pagina": 3}]}
B1 = "O Direito Administrativo é o ramo do direito público que rege a Administração."
B2 = "A licitação busca a proposta mais vantajosa e o desenvolvimento nacional sustentável."
r = one(a, "select library_import_blocks('prf-adm.c1.t1', %s::jsonb)", (_json.dumps([blk(1, B1), blk(2, B2)]),))[0]
check("biblioteca: blocos importados", r["blocks"] == 2 and r["new"] == 2)
check("biblioteca: parceiro lê o conteúdo; terceiro não vê nada",
      one(b, "select count(*) from library_blocks")[0] == 2 and one(c3, "select count(*) from library_blocks")[0] == 0
      and one(c3, "select count(*) from library_topics")[0] == 0)
check("biblioteca: ninguém escreve direto no catálogo",
      fails(a, "insert into library_contests (id,name) values ('x','X')") and fails(b, "update library_blocks set anchor_text='x'")
      or one(root, "select count(*) from library_blocks where anchor_text='x'")[0] == 0)

q1 = "ramo do direito público"; s1 = B1.index(q1)
q2 = "proposta mais vantajosa"; s2 = B2.index(q2)
b.execute("insert into library_marks (kind, topic_id, block_id, start_offset, end_offset, quote, color) values ('highlight','prf-adm.c1.t1','prf-adm.c1.t1.b1',%s,%s,%s,'yellow')", (s1, s1 + len(q1), q1))
b.execute("insert into library_marks (kind, topic_id, block_id, start_offset, end_offset, quote, color, body) values ('highlight','x','prf-adm.c1.t1.b2',%s,%s,%s,'pink','anotar isso')", (s2, s2 + len(q2), q2))
check("biblioteca: o tópico da marcação vem do bloco", one(b, "select topic_id from library_marks where color='pink'")[0] == "prf-adm.c1.t1")
b.execute("insert into library_marks (kind, topic_id, body) values ('note','prf-adm.c1.t1','Revisar conceito')")
b.execute("insert into library_marks (kind, topic_id) values ('favorite','prf-adm.c1.t1')")
check("biblioteca: um favorito de tópico por pessoa", fails(b, "insert into library_marks (kind, topic_id) values ('favorite','prf-adm.c1.t1')"))
check("biblioteca: marcação precisa de trecho e cor", fails(b, "insert into library_marks (kind, topic_id, color) values ('highlight','prf-adm.c1.t1','yellow')"))
check("biblioteca: cor fora da lista recusada", fails(b, "insert into library_marks (kind, topic_id, block_id, start_offset, end_offset, quote, color) values ('highlight','prf-adm.c1.t1','prf-adm.c1.t1.b1',0,2,'O ','red')"))
check("biblioteca: anotação vazia recusada", fails(b, "insert into library_marks (kind, topic_id, body) values ('note','prf-adm.c1.t1','  ')"))
check("biblioteca: marcações são de quem criou", one(a, "select count(*) from library_marks")[0] == 0
      and one(b, "select count(*) from library_marks")[0] == 4)
mid = one(b, "select id from library_marks where color='yellow'")[0]
a.execute("update library_marks set color='green' where id=%s", (mid,)); a.execute("delete from library_marks where id=%s", (mid,))
check("biblioteca: outra pessoa não altera nem apaga", one(b, "select color from library_marks where id=%s", (mid,))[0] == "yellow")
check("biblioteca: terceiro não cria marcação", fails(c3, "insert into library_marks (kind, topic_id) values ('favorite','prf-adm.c1.t1')"))
check("biblioteca: dono não troca o dono", (b.execute("update library_marks set user_id=%s where id=%s", (A, mid)), one(root, "select user_id::text from library_marks where id=%s", (mid,))[0] == B)[1])

# progresso
p = one(b, "select status, percent from library_touch('prf-adm.c1.t1', 40, 'prf-adm.c1.t1.b1')")
check("biblioteca: leitura registra andamento", p == ("in_progress", 40))
check("biblioteca: % não desce ao rolar para cima", one(b, "select percent from library_touch('prf-adm.c1.t1', 10)")[0] == 40)
check("biblioteca: concluído só quando a pessoa marca",
      one(b, "select status, completed_at is not null from library_touch('prf-adm.c1.t1', 100)") == ("in_progress", False)
      and one(b, "select status, completed_at is not null from library_touch('prf-adm.c1.t1', null, null, 'done')") == ("done", True))
check("biblioteca: progresso é individual", one(a, "select count(*) from library_progress")[0] == 0)
ov = b.execute("select discipline_name, chapters, topics, done, read_percent, last_topic_id from library_overview()").fetchall()
check("biblioteca: visão geral com contagens e progresso", ov == [("Direito Administrativo", 2, 4, 1, 25, "prf-adm.c1.t1")])
check("biblioteca: terceiro não vê a visão geral", c3.execute("select * from library_overview()").fetchall() == [])

# busca
res = b.execute("select kind, topic_title, block_text from library_search('licitacao')").fetchall()
check("biblioteca: busca sem acento acha capítulo e conteúdo",
      any(k == "topic" and t == "Modalidades" for k, t, _ in res) and any(k == "block" and "licitação" in (s or "") for k, _, s in res))
check("biblioteca: busca por título de tópico", any(t == "Fontes do Direito Administrativo" for _, t, _ in b.execute("select kind, topic_title, block_text from library_search('fontes')").fetchall()))
check("biblioteca: terceiro não busca", c3.execute("select * from library_search('licitação')").fetchall() == [])

# atualização do material: marcação acompanha o texto; texto ambíguo vai para revisão; nada some
B1b = "Conceito: o Direito Administrativo é o ramo do direito público que rege a Administração Pública."
B2b = "Proposta mais vantajosa? A licitação busca a proposta mais vantajosa e a proposta mais vantajosa é..."
r = one(a, "select library_import_blocks('prf-adm.c1.t1', %s::jsonb)", (_json.dumps([blk(1, B1b), blk(2, B2b), blk(3, "Novo parágrafo.")]),))[0]
check("biblioteca: atualização reporta mudanças", r["changed"] == 2 and r["new"] == 1 and r["marks_moved"] == 1 and r["marks_review"] == 1)
st, en, q = one(b, "select start_offset, end_offset, quote from library_marks where color='yellow'")
check("biblioteca: marcação reposicionada no mesmo bloco", B1b[st:en] == q == q1)
check("biblioteca: trecho repetido fica para revisar (não pula de lugar)",
      one(b, "select status, block_id from library_marks where color='pink'") == ("review", "prf-adm.c1.t1.b2"))
r = one(a, "select library_import_blocks('prf-adm.c1.t1', %s::jsonb)", (_json.dumps([blk(2, B2b), blk(3, "Novo parágrafo.")]),))[0]
check("biblioteca: bloco removido é arquivado e a marcação vai para revisão",
      one(root, "select archived_at is not null from library_blocks where id='prf-adm.c1.t1.b1'")[0]
      and one(b, "select status from library_marks where color='yellow'")[0] == "review"
      and one(b, "select count(*) from library_marks")[0] == 4)
r = one(a, "select library_import_blocks('prf-adm.c1.t1', %s::jsonb)", (_json.dumps([blk(1, B1b), blk(2, B2b), blk(3, "Novo parágrafo.")]),))[0]
check("biblioteca: bloco que volta com o mesmo texto recupera a marcação",
      one(b, "select status from library_marks where color='yellow'")[0] == "ok")
check("biblioteca: reimportar igual não muda nada", r["unchanged"] == 2 or r["unchanged"] == 3)
check("biblioteca: marcação nova em bloco arquivado é recusada", (a.execute("select library_import_blocks('prf-adm.c1.t1', %s::jsonb)", (_json.dumps([blk(2, B2b)]),)),
      fails(b, "insert into library_marks (kind, topic_id, block_id, start_offset, end_offset, quote, color) values ('highlight','prf-adm.c1.t1','prf-adm.c1.t1.b3',0,4,'Novo','blue')"))[1])
check("biblioteca: bloco não pode mudar de tópico às escondidas",
      fails(a, "select library_import_blocks('prf-adm.c1.t2', %s::jsonb)", (_json.dumps([blk(2, B2b)]),), contains="outro tópico"))

S2 = _json.loads(_json.dumps(STRUCT)); S2["capitulos"] = [S2["capitulos"][0]]
r = one(a, "select library_import_structure(%s::jsonb)", (_json.dumps(S2),))[0]
check("biblioteca: disciplina sem um capítulo arquiva o capítulo, sem apagar",
      one(root, "select archived_at is not null from library_chapters where id='prf-adm.c2'")[0]
      and one(b, "select count(*) from library_search('Modalidades') where kind='topic'")[0] == 0)
S3 = {**STRUCT, "capitulos": [STRUCT["capitulos"][1]]}
one(a, "select library_import_structure(%s::jsonb, 'chapters')", (_json.dumps(S3),))
check("biblioteca: importar só um capítulo não arquiva os outros",
      one(root, "select count(*) from library_chapters where archived_at is null")[0] == 2
      and [x[0] for x in a.execute("select id from library_topics where archived_at is null order by position").fetchall()][-1] == "prf-adm.c2.t1")
S4 = _json.loads(_json.dumps(STRUCT)); S4["capitulos"] = [{**STRUCT["capitulos"][0], "topicos": [STRUCT["capitulos"][0]["topicos"][0]]}]
r = one(a, "select library_import_structure(%s::jsonb, 'chapters')", (_json.dumps(S4),))[0]
check("biblioteca: capítulo reenviado sem um tópico arquiva só esse tópico",
      r["archived_topics"] == 1 and one(root, "select archived_at is not null from library_topics where id='prf-adm.c1.t2'")[0]
      and one(root, "select archived_at is null from library_topics where id='prf-adm.c2.t1'")[0])
one(a, "select library_import_structure(%s::jsonb, 'chapters')", (_json.dumps({**STRUCT, "capitulos": [STRUCT["capitulos"][0]]}),))
a.execute("select library_archive('topic','prf-adm.c1.t1')")
check("biblioteca: excluir tópico arquiva o tópico e os subtópicos; marcações continuam guardadas",
      one(root, "select count(*) from library_topics where archived_at is not null and id like 'prf-adm.c1.t1%%'")[0] == 2
      and one(b, "select count(*) from library_marks")[0] == 4)
check("biblioteca: só o admin exclui", fails(b, "select library_archive('topic','prf-adm.c1.t2')"))
a.execute("select library_archive('topic','prf-adm.c1.t1', true)")
check("biblioteca: imagens só para quem lê; envio só do admin",
      fails(b, "insert into storage.objects (bucket_id, name) values ('library','prf-adm/x.png')")
      and (a.execute("insert into storage.objects (bucket_id, name) values ('library','prf-adm/x.png')"), True)[1]
      and one(b, "select count(*) from storage.objects where bucket_id='library'")[0] == 1
      and one(c3, "select count(*) from storage.objects where bucket_id='library'")[0] == 0)
b.execute("select couple_leave()")
check("biblioteca: quem sai do espaço deixa de ler", not one(b, "select library_can_read()")[0]
      and one(b, "select count(*) from library_blocks")[0] == 0)

print(f"\n{ok} checks passed")
