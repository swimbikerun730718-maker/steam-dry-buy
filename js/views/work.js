import { S } from "../state.js";
import { money } from "../util.js";
import { JOBS, job, DAILY_BONUS, level } from "../economy.js";

export function renderWork() {
  const j = job();
  const next = JOBS[S.job + 1];
  const today = new Date().toDateString();
  return `<div class="work">
    <h2 class="sec-title">打工賺錢包</h2>
    <div class="work-grid">
      <div class="work-card">
        <div class="job-icon">${j.icon}</div>
        <div class="job-name">${j.name}</div>
        <div class="job-sub">每次加班 ${money(j.click)} · 被動收入 ${money(j.passive)}/分鐘</div>
        <button class="work-btn" data-act="work">💼 加班!</button>
        <div class="job-sub">已加班 <b data-live="clicks">${S.stats.clicks}</b> 次 · 8% 機率老闆心情好 ×5</div>
      </div>
      <div class="work-side">
        <div class="side-box"><h4>升職</h4>
          ${next ? `<p>${next.icon} <b>${next.name}</b><br>加班 ${money(next.click)} · 被動 ${money(next.passive)}/分</p>
            <button class="btn btn-green" data-act="promote" ${S.wallet < next.cost ? "disabled" : ""}>花 ${money(next.cost)} 進修升職</button>` : `<p>👑 你已經是人生勝利組了。</p>`}
        </div>
        <div class="side-box"><h4>每日登入獎勵</h4>
          <p>${money(DAILY_BONUS + level() * 50)}(等級越高越多)</p>
          <button class="btn btn-green" data-act="daily" ${S.lastDaily === today ? "disabled" : ""}>${S.lastDaily === today ? "今天領過了" : "領取"}</button>
        </div>
        <div class="side-box"><h4>職涯階梯</h4>
          ${JOBS.map((x, i) => `<div class="ladder ${i === S.job ? "on" : i < S.job ? "done" : ""}">${x.icon} ${x.name}<span>${i ? money(x.cost) : "起點"}</span></div>`).join("")}
        </div>
      </div>
    </div></div>`;
}
