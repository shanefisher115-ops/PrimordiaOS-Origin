const appRoot = document.querySelector('#app');
if (appRoot) {
    appRoot.innerHTML = `
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">PrimordiaOS • Public Launch</p>
        <h1>Build the future of autonomous digital infrastructure.</h1>
        <p class="lead">
          Primordia is a living operating layer for AI agents, workflows, and human-centered automation — designed to scale from prototype to production.
        </p>
        <div class="actions">
          <a class="btn primary" href="https://primordialorigin.com" target="_blank" rel="noreferrer">Visit primordialorigin.com</a>
          <a class="btn secondary" href="https://github.com" target="_blank" rel="noreferrer">View Source</a>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <h2>What Primordia does</h2>
          <p>Coordinates agents, events, automation, and worker services into a unified operating system for rapid deployment.</p>
        </article>
        <article class="card">
          <h2>Deployment status</h2>
          <p><strong>Live</strong> — Cloudflare Pages and Workers are now serving the public site and API entry points.</p>
        </article>
        <article class="card">
          <h2>Why it matters</h2>
          <p>It gives teams an extensible base for web apps, AI jobs, event-driven pipelines, and real-time orchestration.</p>
        </article>
      </section>
    </main>
  `;
    const style = document.createElement('style');
    style.textContent = `
    :root { color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: linear-gradient(135deg, #040816 0%, #07192b 45%, #0e2342 100%); color: #f3f7ff; }
    * { box-sizing: border-box; }
    .shell { max-width: 1120px; margin: 0 auto; padding: 48px 24px 80px; }
    .hero { padding: 48px 0 32px; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.28em; font-size: 0.8rem; color: #66f1b3; margin-bottom: 12px; }
    h1 { font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.1; margin: 0 0 16px; max-width: 760px; }
    .lead { font-size: 1.05rem; line-height: 1.7; color: #d8e8ff; max-width: 760px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    .btn { display: inline-block; padding: 12px 16px; border-radius: 999px; text-decoration: none; font-weight: 600; }
    .btn.primary { background: linear-gradient(90deg, #5ee7b7, #3fb6ff); color: #04111e; }
    .btn.secondary { background: rgba(255,255,255,0.08); color: #f3f7ff; border: 1px solid rgba(255,255,255,0.14); }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 24px; }
    .card { background: rgba(5, 15, 28, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 20px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22); }
    .card h2 { margin-top: 0; font-size: 1.1rem; }
    .card p { color: #c9d9ee; line-height: 1.7; margin-bottom: 0; }
  `;
    document.head.appendChild(style);
}
export {};
