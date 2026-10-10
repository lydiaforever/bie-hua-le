"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Expense = { id: number; amount: number; note: string; time: string };
type Tab = "home" | "pk" | "history" | "mine";
type Friend = { name: string; spent: number; color: string; mood: string; me?: boolean };

const demoFriends: Friend[] = [
  { name: "阿圆", spent: 18, color: "#9cc97c", mood: "轻松散步" },
  { name: "小何", spent: 36, color: "#efb75d", mood: "还能扛住" },
  { name: "鱼鱼", spent: 68, color: "#f08c6e", mood: "已经趴下" },
];

const history = [
  { date: "10月9日", day: "昨天", spent: 42, budget: 50, winner: true },
  { date: "10月8日", day: "周三", spent: 61, budget: 50, winner: false },
  { date: "10月7日", day: "周二", spent: 27, budget: 50, winner: true },
  { date: "10月6日", day: "周一", spent: 49, budget: 50, winner: true },
];

function money(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function StickPerson({ ratio = 0, small = false }: { ratio?: number; small?: boolean }) {
  const state = ratio <= .35 ? "light" : ratio <= .8 ? "steady" : ratio <= 1 ? "heavy" : ratio <= 1.5 ? "tired" : "flat";
  return (
    <div className={`stick-scene ${state} ${small ? "small" : ""}`} aria-label={`火柴人负重状态：${state}`}>
      <div className="shadow" />
      <div className="person">
        <div className="head"><i /><b /></div>
        <div className="body" />
        <div className="arm left" /><div className="arm right" />
        <div className="leg left" /><div className="leg right" />
        {state === "heavy" || state === "tired" ? <span className="sweat">💧</span> : null}
      </div>
      <div className="money-bag"><span>¥{Math.round(ratio * 50)}</span></div>
    </div>
  );
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [budget, setBudget] = useState(50);
  const [name, setName] = useState("省钱小李");
  const [tab, setTab] = useState<Tab>("home");
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 1, amount: 16, note: "午饭", time: "12:24" },
    { id: 2, amount: 8, note: "地铁", time: "08:40" },
  ]);
  const [showExpense, setShowExpense] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("餐饮");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("stop-spending-demo");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setBudget(data.budget || 50); setName(data.name || "省钱小李");
        if (Array.isArray(data.expenses)) setExpenses(data.expenses);
        setOnboarded(true);
      } catch { /* keep demo defaults */ }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !onboarded) return;
    localStorage.setItem("stop-spending-demo", JSON.stringify({ budget, name, expenses }));
  }, [budget, name, expenses, onboarded, ready]);

  const spent = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses]);
  const ratio = spent / budget;
  const remaining = budget - spent;
  const copy = ratio <= .35 ? "今天走路都带风，保持住！" : ratio <= .8 ? "还扛得住，奶茶先忍忍。" : ratio <= 1 ? "有点沉了，今天收手吧。" : ratio <= 1.5 ? "我真的背不动了……" : "你花钱的时候，考虑过我吗？";

  function finishOnboarding(e: FormEvent) {
    e.preventDefault();
    setOnboarded(true);
  }

  function addExpense(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;
    const now = new Date();
    setExpenses([{ id: Date.now(), amount: value, note, time: `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}` }, ...expenses]);
    setAmount(""); setShowExpense(false); setToast(`记下了 ¥${money(value)}，小人又重了一点`);
    setTimeout(() => setToast(""), 2400);
  }

  if (!ready) return <main className="loading">别花了别花了…</main>;

  if (!onboarded) return (
    <main className="onboarding">
      <div className="scribble s1">别</div><div className="scribble s2">买</div>
      <section className="onboard-card">
        <div className="brand-mark"><span /><span /><span /></div>
        <p className="eyebrow">省钱挑战 · 本地演示版</p>
        <h1>别花了<br />别花了！</h1>
        <p className="lead">今天开始，给钱包留条活路。<br />你打算每天最多花多少钱？</p>
        <form onSubmit={finishOnboarding}>
          <div className="budget-choices">
            {[50, 80, 100].map(v => <button type="button" className={budget === v ? "active" : ""} onClick={() => setBudget(v)} key={v}>¥{v}</button>)}
          </div>
          <label className="field-label">或者自己定</label>
          <div className="money-input"><span>¥</span><input aria-label="每日预算" inputMode="decimal" value={budget} onChange={e => setBudget(Math.max(1, Number(e.target.value)))} /></div>
          <label className="field-label">朋友怎么叫你？</label>
          <input className="name-input" aria-label="昵称" value={name} maxLength={10} onChange={e => setName(e.target.value)} />
          <button className="primary" type="submit">开始省钱挑战 <span>→</span></button>
        </form>
        <p className="privacy-note">数据只保存在当前设备，不用注册。</p>
      </section>
    </main>
  );

  return (
    <main className="app-shell">
      <div className="phone-app">
        <header className="topbar">
          <div><p className="mini-date">10月10日 · 星期六</p><h1>别花了别花了！</h1></div>
          <button className="avatar" onClick={() => setTab("mine")} aria-label="打开我的设置">李</button>
        </header>

        {tab === "home" && <section className="screen home-screen">
          <div className="local-pill"><span /> 本地演示 · 仅当前设备可见</div>
          <div className="budget-summary">
            <p>{remaining >= 0 ? "今日还能花" : "今日已超支"}</p>
            <div className={remaining < 0 ? "over big-money" : "big-money"}><small>¥</small>{money(Math.abs(remaining))}</div>
            <div className="progress"><i style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
            <div className="progress-meta"><span>已花 ¥{money(spent)}</span><span>预算 ¥{money(budget)}</span></div>
          </div>
          <div className="character-wrap">
            <StickPerson ratio={ratio} />
            <button className="speech" onClick={() => {setToast(copy); setTimeout(() => setToast(""), 2200)}}>“{copy}”</button>
          </div>
          <button className="add-button" onClick={() => setShowExpense(true)}><b>＋</b> 我又花钱了</button>
          <div className="recent-head"><h2>今天花在哪</h2><button onClick={() => setTab("history")}>全部记录</button></div>
          <div className="expense-list">
            {expenses.slice(0, 2).map(item => <div className="expense-row" key={item.id}><span className="expense-icon">{item.note === "餐饮" || item.note === "午饭" ? "饭" : "行"}</span><div><b>{item.note}</b><small>{item.time}</small></div><strong>−¥{money(item.amount)}</strong></div>)}
          </div>
        </section>}

        {tab === "pk" && <section className="screen pk-screen">
          <div className="section-title"><div><p className="eyebrow">4人挑战房</p><h2>50元生存挑战赛</h2></div><button className="more">•••</button></div>
          <div className="demo-banner"><b>演示房间</b><span>好友数据为预设，真实同步需接入后端</span></div>
          <div className="room-stats"><div><b>第 3 天</b><span>共 7 天</span></div><div><b>¥{budget}</b><span>每日预算</span></div><div><b>23:41</b><span>距离结算</span></div></div>
          <h3 className="rank-title">今日省钱榜 <span>花得越少越靠前</span></h3>
          <div className="ranking">
            {[...demoFriends, { name, spent, color: "#222", mood: ratio > 1 ? "快背不动" : "稳稳前进", me: true } as Friend].sort((a,b)=>a.spent-b.spent).map((friend, index) => (
              <button className={`rank-card ${friend.me ? "me" : ""}`} key={friend.name} onClick={() => {setToast(friend.me ? "这是你今天的成绩" : `${friend.name}：${friend.mood}`); setTimeout(()=>setToast(""),2000)}}>
                <span className={`rank-num n${index+1}`}>{index + 1}</span>
                <div className="mini-person"><StickPerson ratio={friend.spent / budget} small /></div>
                <div className="friend-copy"><b>{friend.name}{friend.me ? "（我）" : ""}</b><small>{friend.mood}</small></div>
                <strong>¥{money(friend.spent)}</strong>
              </button>
            ))}
          </div>
          <button className="outline-button" onClick={() => {setToast("邀请链接已模拟复制"); setTimeout(()=>setToast(""),2200)}}>＋ 邀请朋友加入</button>
        </section>}

        {tab === "history" && <section className="screen history-screen">
          <div className="section-title"><div><p className="eyebrow">本周记录</p><h2>省钱日历</h2></div><button className="settle-btn" onClick={() => setShowSettlement(true)}>看结算</button></div>
          <div className="week-card"><div><p>本周已花</p><strong>¥203</strong><small>比预算少 ¥47</small></div><div className="bars">{[52,78,35,68,91,43,20].map((h,i)=><i key={i} className={i===6?"today":""} style={{height:`${h}%`}} />)}</div></div>
          <div className="history-list">
            <div className="history-row today-row"><div><b>今天</b><span>10月10日</span></div><div className="history-spend"><b>¥{money(spent)}</b><span>{spent <= budget ? `还剩 ¥${money(budget-spent)}` : `超支 ¥${money(spent-budget)}`}</span></div><em className={spent <= budget ? "pass" : "fail"}>{spent <= budget ? "守住了" : "超了"}</em></div>
            {history.map(item => <div className="history-row" key={item.date}><div><b>{item.day}</b><span>{item.date}</span></div><div className="history-spend"><b>¥{item.spent}</b><span>预算 ¥{item.budget}</span></div><em className={item.winner ? "pass" : "fail"}>{item.winner ? "守住了" : "超了"}</em></div>)}
          </div>
        </section>}

        {tab === "mine" && <section className="screen mine-screen">
          <div className="profile"><div className="big-avatar">李</div><div><h2>{name}</h2><p>已经认真省钱 4 天</p></div></div>
          <div className="settings-card"><label><span>每日预算<small>修改后立即生效</small></span><div className="inline-budget">¥<input inputMode="decimal" value={budget} onChange={e=>setBudget(Math.max(1,Number(e.target.value)))} /></div></label><label><span>我的昵称</span><input value={name} maxLength={10} onChange={e=>setName(e.target.value)} /></label></div>
          <div className="truth-card"><span>i</span><div><b>这是一版可用的本地原型</b><p>预算和记账会保存在这台设备。好友 PK 目前使用演示数据；要让朋友在各自手机看到同一房间，需要增加账号、云数据库和邀请链接。</p></div></div>
          <button className="reset-button" onClick={()=>{localStorage.removeItem("stop-spending-demo"); setOnboarded(false); setExpenses([])}}>重新体验首次设置</button>
        </section>}

        <nav className="bottom-nav" aria-label="主要导航">
          <button className={tab==="home"?"active":""} onClick={()=>setTab("home")}><span>⌂</span>我的小人</button>
          <button className={tab==="pk"?"active":""} onClick={()=>setTab("pk")}><span>♟</span>好友 PK</button>
          <button className={tab==="history"?"active":""} onClick={()=>setTab("history")}><span>▦</span>日历</button>
          <button className={tab==="mine"?"active":""} onClick={()=>setTab("mine")}><span>○</span>我的</button>
        </nav>

        {showExpense && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowExpense(false)}}><form className="sheet" onSubmit={addExpense}><div className="sheet-handle"/><div className="sheet-head"><div><p>快速记一笔</p><h2>又花了多少？</h2></div><button type="button" onClick={()=>setShowExpense(false)}>×</button></div><div className="sheet-money"><span>¥</span><input autoFocus aria-label="消费金额" inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} /></div><div className="quick-amounts">{[5,10,20,30].map(v=><button type="button" key={v} onClick={()=>setAmount(String(v))}>¥{v}</button>)}</div><p className="label">花在哪了</p><div className="category-grid">{["餐饮","交通","日用","快乐"].map(v=><button type="button" className={note===v?"active":""} onClick={()=>setNote(v)} key={v}>{v}</button>)}</div><button className="primary" type="submit">记下这笔</button></form></div>}

        {showSettlement && <div className="modal-backdrop"><div className="settlement-card"><button className="close" onClick={()=>setShowSettlement(false)}>×</button><p className="eyebrow">10月9日 · 每日战报</p><div className="medal">1</div><h2>昨天你守住了！</h2><p>花了 <b>¥42</b>，比预算少 <b>¥8</b><br/>在 4 位朋友里排第 1 名。</p><div className="saving-stamp">省下的每一块<br/><strong>都没有白忍</strong></div><button className="primary" onClick={()=>setShowSettlement(false)}>继续保持</button></div></div>}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </main>
  );
}
