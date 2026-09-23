// One configuration/catalogue request shared by theme, search and page startup.
window.AtlasBootstrap={};
if(location.pathname.startsWith('/admin'))AtlasBootstrap.config=fetch('/api/config',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuration unavailable');return r.json();});
else {
 AtlasBootstrap.catalog=fetch('/api/catalog?compact=1',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalogue unavailable');return r.json();});
 AtlasBootstrap.config=AtlasBootstrap.catalog.then(c=>c.config);
}
AtlasBootstrap.config.catch(()=>{});
