window.AtlasAnalytics={mount({before,api}){
 const dashboardDefault='https://vps-f8d31735.vps.ovh.ca:8443/';
 const section=document.createElement('section');section.id='atlas-analytics';section.className='atlas-analytics';
 section.innerHTML='<h2>Visitor analytics</h2><p>View visits, searches, project activity, heatmaps and session replays in Umami.</p><p class="analytics-dashboard-status" role="status"></p><a class="analytics-dashboard-link" href="https://vps-f8d31735.vps.ovh.ca:8443/" target="_blank" rel="noopener noreferrer">Open Umami dashboard</a>';
 before.before(section);
 return {async refresh(){const status=section.querySelector('[role=status]'),link=section.querySelector('a');link.href=dashboardDefault;link.hidden=false;status.textContent='Opens in a new tab. Sign in with your Umami account.';try{const config=await api('/api/analytics/config');if(config.dashboardUrl){const url=new URL(config.dashboardUrl);if(url.protocol==='https:'&&!url.username&&!url.password)link.href=url.href;}}catch{/* Keep the configured public Atlas dashboard available in local previews. */}}};
}};
