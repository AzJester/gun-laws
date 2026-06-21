/* Build mockup/index.html by injecting geometry + state data into the template. */
const fs=require('fs');
const tpl=fs.readFileSync('tools/mockup-template.html','utf8');
const geo=fs.readFileSync('data/us-geo.json','utf8').trim();
const states=JSON.stringify(JSON.parse(fs.readFileSync('data/sample-states.json','utf8')).states);
if(!tpl.includes('__GEO_DATA__')||!tpl.includes('__STATES_DATA__')){console.error('template missing tokens');process.exit(1);}
const out=tpl.replace('__GEO_DATA__',geo).replace('__STATES_DATA__',states);
fs.writeFileSync('mockup/index.html',out);
console.log('mockup/index.html built —',Math.round(out.length/1024),'KB');
