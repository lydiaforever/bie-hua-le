"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { addCloudExpense, cloudSignIn, CloudExpense, CloudRoom, createRoom, deleteCloudExpense, joinRoom, loadMyRoom, loadScores, saveProfile, updateCloudExpense } from "./cloudbase";

type Expense = { id: number; amount: number; note: string; date: string; time: string; createdAt: string; cloudId?: number };
type Tab = "home" | "pk" | "history" | "mine";
type Friend = { name: string; spent: number; color: string; mood: string; me?: boolean };

const STORAGE_KEY = "stop-spending-demo";
const demoFriends: Friend[] = [
  { name: "阿圆", spent: 18, color: "#9cc97c", mood: "轻松散步" },
  { name: "小何", spent: 36, color: "#efb75d", mood: "还能扛住" },
  { name: "鱼鱼", spent: 68, color: "#f08c6e", mood: "已经趴下" },
];

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDate(key: string, offset: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

function shortDate(key: string) {
  const date = dateFromKey(key);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function weekday(key: string) {
  return `周${"日一二三四五六"[dateFromKey(key).getDay()]}`;
}

function longToday(key: string) {
  return `${shortDate(key)} · 星期${"日一二三四五六"[dateFromKey(key).getDay()]}`;
}

function money(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function categoryIcon(note: string) {
  return ({ 餐饮: "饭", 交通: "行", 日用: "用", 快乐: "乐" } as Record<string, string>)[note] || "记";
}

function StickPerson({ ratio = 0, amount = 0, small = false }: { ratio?: number; amount?: number; small?: boolean }) {
  const state = ratio <= .35 ? "light" : ratio <= .8 ? "steady" : ratio <= 1 ? "heavy" : ratio <= 1.5 ? "tired" : "flat";
  return (
    <div className={`stick-scene ${state} ${small ? "small" : ""}`} aria-label={`火柴人负重状态：${state}`}>
      <div className="shadow" />
      <div className="person">
        <div className="head"><i /><b /></div><div className="body" />
        <div className="arm left" /><div className="arm right" /><div className="leg left" /><div className="leg right" />
        {state === "heavy" || state === "tired" ? <span className="sweat">💧</span> : null}
      </div>
      <div className="money-bag"><span>¥{money(amount)}</span></div>
    </div>
  );
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [budget, setBudget] = useState(50);
  const [name, setName] = useState("省钱小李");
  const [tab, setTab] = useState<Tab>("home");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const [showExpense, setShowExpense] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("餐饮");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cloud, setCloud] = useState<{ token: string; userId: string } | null>(null);
  const [room, setRoom] = useState<CloudRoom | null>(null);
  const [scores, setScores] = useState<Friend[]>([]);
  const [roomName, setRoomName] = useState("50元生存挑战赛");
  const [inviteCode, setInviteCode] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);

  function flash(message: string, duration = 2400) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => { setToast(""); setDeletedExpense(null); }, duration);
  }

  useEffect(() => {
    const sharedCode = new URLSearchParams(window.location.search).get("invite");
    if (sharedCode) {
      setInviteCode(sharedCode.toUpperCase().slice(0, 6));
      setTab("pk");
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setBudget(Number(data.budget) > 0 ? Number(data.budget) : 50);
        setName(data.name || "省钱小李");
        if (Array.isArray(data.expenses)) {
          const now = new Date();
          const migrated = data.expenses
            .filter((item: Expense) => !((item.id === 1 && item.amount === 16 && item.note === "午饭") || (item.id === 2 && item.amount === 8 && item.note === "地铁")))
            .map((item: Partial<Expense>) => ({
              id: Number(item.id) || Date.now() + Math.random(), amount: Number(item.amount) || 0,
              note: item.note || "其他", date: item.date || localDateKey(now),
              time: item.time || "00:00", createdAt: item.createdAt || now.toISOString(),
            }))
            .filter((item: Expense) => item.amount > 0);
          setExpenses(migrated);
        }
        setOnboarded(true);
      } catch { /* Keep safe defaults if old data is damaged. */ }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !onboarded) return;
    cloudSignIn().then(async ({ accessToken, userId }) => {
      setCloud({ token: accessToken, userId });
      await saveProfile(accessToken, userId, name);
      const found = await loadMyRoom(accessToken);
      setRoom(found);
    }).catch(() => flash("云端暂时连接不上，本地记账仍可使用", 3500));
  }, [ready, onboarded]);

  useEffect(() => {
    if (!cloud) return;
    const timer = setTimeout(() => saveProfile(cloud.token, cloud.userId, name).catch(() => {}), 500);
    return () => clearTimeout(timer);
  }, [cloud, name]);

  async function refreshScores(activeRoom = room) {
    if (!cloud || !activeRoom) return;
    const data = await loadScores(cloud.token, activeRoom.id, todayKey);
    const profileMap = new Map(data.profiles.map(item => [item.user_id, item.nickname]));
    setScores(data.members.map((member, index) => {
      const total = data.expenses.filter(item => item.user_id === member.user_id).reduce((sum, item) => sum + Number(item.amount), 0);
      return { name: profileMap.get(member.user_id) || "省钱好友", spent: total, color: ["#9cc97c", "#efb75d", "#f08c6e", "#222"][index % 4], mood: total <= Number(activeRoom.daily_budget) ? "稳稳前进" : "快背不动", me: member.user_id === cloud.userId };
    }));
  }

  useEffect(() => { refreshScores().catch(() => {}); }, [room, cloud, todayKey]);

  async function handleCreateRoom() {
    if (!cloud || cloudBusy) return;
    setCloudBusy(true);
    try {
      const created = await createRoom(cloud.token, roomName.trim() || "省钱挑战", budget);
      const createdRoom: CloudRoom = { id: created.room_id, name: roomName.trim() || "省钱挑战", invite_code: created.invite_code, daily_budget: budget, owner_id: cloud.userId };
      setRoom(createdRoom); await refreshScores(createdRoom); flash(`房间创建成功，邀请码 ${created.invite_code}`, 4000);
    } catch { flash("创建失败，请稍后重试"); } finally { setCloudBusy(false); }
  }

  async function handleJoinRoom() {
    if (!cloud || cloudBusy || !inviteCode.trim()) return;
    setCloudBusy(true);
    try {
      await joinRoom(cloud.token, inviteCode.trim());
      const found = await loadMyRoom(cloud.token);
      setRoom(found); await refreshScores(found); flash("加入挑战成功！");
    } catch { flash("邀请码不正确，或房间暂时无法加入"); } finally { setCloudBusy(false); }
  }

  async function shareRoom() {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}?invite=${room.invite_code}`;
    const text = `来和我一起参加「${room.name}」省钱挑战！\n邀请码：${room.invite_code}\n打开链接后可以直接加入：${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "别花了别花了！", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      flash("邀请文案和链接已复制，发给朋友吧");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        flash("邀请文案和链接已复制，发给朋友吧");
      } catch { flash("复制失败，请长按邀请码复制"); }
    }
  }

  useEffect(() => {
    if (!ready || !onboarded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, budget, name, expenses }));
  }, [budget, name, expenses, onboarded, ready]);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = localDateKey();
      setTodayKey(current => current === next ? current : next);
    }, 30000);
    return () => { clearInterval(timer); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const todayExpenses = useMemo(() => expenses.filter(item => item.date === todayKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [expenses, todayKey]);
  const spent = useMemo(() => todayExpenses.reduce((sum, item) => sum + item.amount, 0), [todayExpenses]);
  const totalsByDate = useMemo(() => expenses.reduce<Record<string, number>>((totals, item) => {
    totals[item.date] = (totals[item.date] || 0) + item.amount;
    return totals;
  }, {}), [expenses]);
  const historyDates = useMemo(() => Object.keys(totalsByDate).sort((a, b) => b.localeCompare(a)), [totalsByDate]);
  const weekKeys = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDate(todayKey, index - 6)), [todayKey]);
  const weekSpent = weekKeys.reduce((sum, key) => sum + (totalsByDate[key] || 0), 0);
  const ratio = spent / budget;
  const remaining = budget - spent;
  const copy = ratio <= .35 ? "今天走路都带风，保持住！" : ratio <= .8 ? "还扛得住，奶茶先忍忍。" : ratio <= 1 ? "有点沉了，今天收手吧。" : ratio <= 1.5 ? "我真的背不动了……" : "你花钱的时候，考虑过我吗？";
  const yesterdayKey = shiftDate(todayKey, -1);
  const yesterdaySpent = totalsByDate[yesterdayKey] || 0;

  function finishOnboarding(e: FormEvent) { e.preventDefault(); setOnboarded(true); }

  function openNewExpense() {
    setEditingId(null); setAmount(""); setNote("餐饮"); setShowExpense(true);
  }

  function openEditExpense(item: Expense) {
    setEditingId(item.id); setAmount(String(item.amount)); setNote(item.note); setShowExpense(true);
  }

  async function saveExpense(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { flash("请输入正确的金额"); return; }
    if (editingId !== null) {
      const old = expenses.find(item => item.id === editingId);
      setExpenses(items => items.map(item => item.id === editingId ? { ...item, amount: value, note } : item));
      if (cloud && old?.cloudId) updateCloudExpense(cloud.token, old.cloudId, value, note).then(() => refreshScores()).catch(() => flash("本地已修改，云端同步失败"));
      flash("这笔账已经改好了");
    } else {
      const now = new Date();
      const local: Expense = {
        id: Date.now(), amount: value, note, date: localDateKey(now),
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        createdAt: now.toISOString(),
      };
      setExpenses(items => [local, ...items]);
      if (cloud && room) {
        addCloudExpense(cloud.token, room.id, cloud.userId, value, note, local.date).then(item => {
          setExpenses(items => items.map(expense => expense.id === local.id ? { ...expense, cloudId: item.id } : expense));
          refreshScores();
        }).catch(() => flash("已保存在本机，但云端同步失败", 3200));
      }
      flash(`记下了 ¥${money(value)}，小人又重了一点`);
    }
    setAmount(""); setEditingId(null); setShowExpense(false);
  }

  function deleteExpense(item: Expense) {
    setExpenses(items => items.filter(expense => expense.id !== item.id));
    setDeletedExpense(item);
    flash(`已删除 ¥${money(item.amount)}，可以撤销`, 5000);
    if (cloud && item.cloudId) deleteCloudExpense(cloud.token, item.cloudId).then(() => refreshScores()).catch(() => flash("本地已删除，云端同步失败"));
  }

  function undoDelete() {
    if (!deletedExpense) return;
    setExpenses(items => items.some(item => item.id === deletedExpense.id) ? items : [deletedExpense, ...items]);
    setDeletedExpense(null); flash("已撤销删除");
  }

  if (!ready) return <main className="loading">别花了别花了…</main>;

  if (!onboarded) return (
    <main className="onboarding"><div className="scribble s1">别</div><div className="scribble s2">买</div>
      <section className="onboard-card"><div className="brand-mark"><span /><span /><span /></div><p className="eyebrow">省钱挑战 · 本地体验版</p><h1>别花了<br />别花了！</h1><p className="lead">今天开始，给钱包留条活路。<br />你打算每天最多花多少钱？</p>
        <form onSubmit={finishOnboarding}><div className="budget-choices">{[50, 80, 100].map(v => <button type="button" className={budget === v ? "active" : ""} onClick={() => setBudget(v)} key={v}>¥{v}</button>)}</div><label className="field-label">或者自己定</label><div className="money-input"><span>¥</span><input aria-label="每日预算" inputMode="decimal" value={budget} onChange={e => setBudget(Math.max(1, Number(e.target.value)))} /></div><label className="field-label">朋友怎么叫你？</label><input className="name-input" aria-label="昵称" value={name} maxLength={10} onChange={e => setName(e.target.value)} /><button className="primary" type="submit">开始省钱挑战 <span>→</span></button></form><p className="privacy-note">账单按日期保存在当前设备，不用注册。</p>
      </section>
    </main>
  );

  return (
    <main className="app-shell"><div className="phone-app">
      <header className="topbar"><div><p className="mini-date">{longToday(todayKey)}</p><h1>别花了别花了！</h1></div><button className="avatar" onClick={() => setTab("mine")} aria-label="打开我的设置">{name.slice(0, 1)}</button></header>

      {tab === "home" && <section className="screen home-screen">
        <div className="local-pill"><span /> 今日账单 · 已保存到当前设备</div>
        <div className="budget-summary"><p>{remaining >= 0 ? "今日还能花" : "今日已超支"}</p><div className={remaining < 0 ? "over big-money" : "big-money"}><small>¥</small>{money(Math.abs(remaining))}</div><div className="progress"><i style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div><div className="progress-meta"><span>已花 ¥{money(spent)}</span><span>预算 ¥{money(budget)}</span></div></div>
        <div className="character-wrap"><StickPerson ratio={ratio} amount={spent} /><button className="speech" onClick={() => flash(copy, 2200)}>“{copy}”</button></div>
        <button className="add-button" onClick={openNewExpense}><b>＋</b> 我又花钱了</button>
        <div className="recent-head"><h2>今天花在哪</h2><button onClick={() => setTab("history")}>全部记录</button></div>
        <div className="expense-list">{todayExpenses.length === 0 ? <div className="empty-state"><b>今天还没有花钱</b><span>好开局，继续保持！</span></div> : todayExpenses.slice(0, 3).map(item => <div className="expense-row" key={item.id}><span className="expense-icon">{categoryIcon(item.note)}</span><div><b>{item.note}</b><small>{item.time}</small></div><strong>−¥{money(item.amount)}</strong><div className="expense-actions"><button onClick={() => openEditExpense(item)} aria-label={`修改${item.note}账单`}>改</button><button onClick={() => deleteExpense(item)} aria-label={`删除${item.note}账单`}>删</button></div></div>)}</div>
      </section>}

      {tab === "pk" && <section className="screen pk-screen">{room ? <><div className="section-title"><div><p className="eyebrow">真实好友挑战房</p><h2>{room.name}</h2></div><button className="more" onClick={() => refreshScores()}>刷新</button></div><div className="demo-banner invite-card"><b>房间邀请码</b><strong className="invite-code">{room.invite_code}</strong><span>邀请码会一直保留在这里，不用担心消失</span></div><button className="primary share-button" onClick={shareRoom}>分享给朋友</button><button className="outline-button copy-invite" onClick={async () => { const url = `${window.location.origin}${window.location.pathname}?invite=${room.invite_code}`; await navigator.clipboard?.writeText(`来和我一起参加「${room.name}」省钱挑战！\n邀请码：${room.invite_code}\n${url}`); flash("邀请文案和链接已复制"); }}>复制邀请文案</button><div className="room-stats"><div><b>{scores.length} 人</b><span>当前成员</span></div><div><b>¥{money(Number(room.daily_budget))}</b><span>每日预算</span></div><div><b>今日</b><span>实时排名</span></div></div><h3 className="rank-title">今日省钱榜 <span>花得越少越靠前</span></h3><div className="ranking">{scores.sort((a, b) => a.spent - b.spent).map((friend, index) => <button className={`rank-card ${friend.me ? "me" : ""}`} key={`${friend.name}-${index}`}><span className={`rank-num n${index + 1}`}>{index + 1}</span><div className="mini-person"><StickPerson ratio={friend.spent / Number(room.daily_budget)} amount={friend.spent} small /></div><div className="friend-copy"><b>{friend.name}{friend.me ? "（我）" : ""}</b><small>{friend.mood}</small></div><strong>¥{money(friend.spent)}</strong></button>)}</div></> : <><div className="section-title"><div><p className="eyebrow">真实好友 PK</p><h2>创建或加入挑战</h2></div></div><div className="truth-card"><span>1</span><div><b>创建自己的挑战房</b><p>设置房间名称，系统会生成一个六位邀请码。</p></div></div><div className="settings-card"><label><span>房间名称</span><input value={roomName} maxLength={20} onChange={e => setRoomName(e.target.value)} /></label></div><button className="primary" disabled={!cloud || cloudBusy} onClick={handleCreateRoom}>{cloudBusy ? "处理中…" : "创建挑战房"}</button><div className="truth-card"><span>2</span><div><b>加入好友的房间</b><p>输入好友发给你的六位邀请码。</p></div></div><div className="settings-card"><label><span>邀请码</span><input value={inviteCode} maxLength={6} placeholder="例如 A1B2C3" onChange={e => setInviteCode(e.target.value.toUpperCase())} /></label></div><button className="outline-button" disabled={!cloud || cloudBusy || inviteCode.length < 6} onClick={handleJoinRoom}>加入好友挑战</button><div className="demo-banner"><b>{cloud ? "云端已连接" : "正在连接腾讯云…"}</b><span>每个人的账单只允许本人修改和删除</span></div></>}</section>}

      {tab === "history" && <section className="screen history-screen">
        <div className="section-title"><div><p className="eyebrow">真实账单记录</p><h2>省钱日历</h2></div><button className="settle-btn" onClick={() => setShowSettlement(true)}>看昨天</button></div>
        <div className="week-card"><div><p>近 7 天已花</p><strong>¥{money(weekSpent)}</strong><small>{weekSpent <= budget * 7 ? `比总预算少 ¥${money(budget * 7 - weekSpent)}` : `比总预算多 ¥${money(weekSpent - budget * 7)}`}</small></div><div className="bars">{weekKeys.map(key => <i key={key} className={key === todayKey ? "today" : ""} title={`${shortDate(key)} ¥${money(totalsByDate[key] || 0)}`} style={{ height: `${Math.max(4, Math.min(100, ((totalsByDate[key] || 0) / budget) * 100))}%` }} />)}</div></div>
        <div className="history-list">{historyDates.length === 0 ? <div className="empty-state history-empty"><b>还没有账单记录</b><span>记下第一笔后，这里会按日期自动汇总。</span></div> : historyDates.map(key => { const daySpent = totalsByDate[key]; const label = key === todayKey ? "今天" : key === yesterdayKey ? "昨天" : weekday(key); return <div className={`history-day ${key === todayKey ? "today-day" : ""}`} key={key}><div className="history-row"><div><b>{label}</b><span>{shortDate(key)}</span></div><div className="history-spend"><b>¥{money(daySpent)}</b><span>预算 ¥{money(budget)}</span></div><em className={daySpent <= budget ? "pass" : "fail"}>{daySpent <= budget ? "守住了" : "超了"}</em></div><div className="day-expenses">{expenses.filter(item => item.date === key).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => <div className="day-expense" key={item.id}><span>{item.time} · {item.note}</span><b>−¥{money(item.amount)}</b><button onClick={() => openEditExpense(item)}>修改</button><button className="danger" onClick={() => deleteExpense(item)}>删除</button></div>)}</div></div>; })}</div>
      </section>}

      {tab === "mine" && <section className="screen mine-screen"><div className="profile"><div className="big-avatar">{name.slice(0, 1)}</div><div><h2>{name}</h2><p>共记录了 {historyDates.length} 天</p></div></div><div className="settings-card"><label><span>每日预算<small>修改后立即生效</small></span><div className="inline-budget">¥<input inputMode="decimal" value={budget} onChange={e => setBudget(Math.max(1, Number(e.target.value)))} /></div></label><label><span>我的昵称</span><input value={name} maxLength={10} onChange={e => setName(e.target.value)} /></label></div><div className="truth-card"><span>i</span><div><b>账单已按日期保存在这台设备</b><p>每天零点后，首页会自动从 ¥0 开始；以前的账单仍会留在历史页面。更换手机或清除浏览器数据仍会丢失，跨设备同步将在好友功能阶段接入后端。</p></div></div><button className="reset-button" onClick={() => { localStorage.removeItem(STORAGE_KEY); setOnboarded(false); setExpenses([]); }}>清除数据并重新设置</button></section>}

      <nav className="bottom-nav" aria-label="主要导航"><button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><span>⌂</span>我的小人</button><button className={tab === "pk" ? "active" : ""} onClick={() => setTab("pk")}><span>♟</span>好友 PK</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><span>▦</span>日历</button><button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}><span>○</span>我的</button></nav>

      {showExpense && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowExpense(false); }}><form className="sheet" onSubmit={saveExpense}><div className="sheet-handle" /><div className="sheet-head"><div><p>{editingId === null ? "快速记一笔" : "修改这笔账"}</p><h2>{editingId === null ? "又花了多少？" : "改成多少？"}</h2></div><button type="button" onClick={() => setShowExpense(false)}>×</button></div><div className="sheet-money"><span>¥</span><input autoFocus aria-label="消费金额" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} /></div><div className="quick-amounts">{[5, 10, 20, 30].map(v => <button type="button" key={v} onClick={() => setAmount(String(v))}>¥{v}</button>)}</div><p className="label">花在哪了</p><div className="category-grid">{["餐饮", "交通", "日用", "快乐"].map(v => <button type="button" className={note === v ? "active" : ""} onClick={() => setNote(v)} key={v}>{v}</button>)}</div><button className="primary" type="submit">{editingId === null ? "记下这笔" : "保存修改"}</button></form></div>}

      {showSettlement && <div className="modal-backdrop"><div className="settlement-card"><button className="close" onClick={() => setShowSettlement(false)}>×</button><p className="eyebrow">{shortDate(yesterdayKey)} · 每日战报</p><div className="medal">{yesterdaySpent <= budget ? "✓" : "!"}</div><h2>{yesterdaySpent === 0 ? "昨天没有记账" : yesterdaySpent <= budget ? "昨天你守住了！" : "昨天超预算了"}</h2><p>{yesterdaySpent === 0 ? "没有找到昨天的消费记录。" : <>花了 <b>¥{money(yesterdaySpent)}</b>，{yesterdaySpent <= budget ? <>比预算少 <b>¥{money(budget - yesterdaySpent)}</b></> : <>比预算多 <b>¥{money(yesterdaySpent - budget)}</b></>}。</>}</p><div className="saving-stamp">每一天都单独计算<br /><strong>今天重新从 0 开始</strong></div><button className="primary" onClick={() => setShowSettlement(false)}>知道了</button></div></div>}
      {toast && <div className="toast"><span>{toast}</span>{deletedExpense && <button onClick={undoDelete}>撤销</button>}</div>}
    </div></main>
  );
}
