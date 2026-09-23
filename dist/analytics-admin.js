window.AtlasAnalytics={mount({before,api}){
 const section=document.createElement('section');section.id='atlas-analytics';section.className='atlas-analytics';
 section.innerHTML='<h2>Visitor analytics</h2><p>View visits, countries, devices and project-view events in Umami.</p><p class="analytics-dashboard-status" role="status"></p><a class="analytics-dashboard-link" hidden target="_blank" rel="noopener noreferrer">Open Umami dashboard</a>';
 before.before(section);
 return {async refresh(){const status=section.querySelector('[role=status]'),link=section.querySelector('a');link.hidden=true;try{const config=await api('/api/analytics/config');const url=new URL(config.dashboardUrl);if(url.protocol!=='https:')throw Error();link.href=url.href;link.hidden=false;status.textContent='Opens in a new tab. Sign in with your Umami account.';}catch{status.textContent='Umami is not configured yet. Follow the VPS deployment guide to connect the dashboard.';}}};
}};
