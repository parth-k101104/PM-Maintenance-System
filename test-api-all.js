const http = require('http');
const data = JSON.stringify({ email: 'mm101@company.com', password: 'admin@123' });

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const { token } = JSON.parse(body);
    
    // 1. Dashboard
    http.get('http://localhost:8080/api/v1/dashboard/maintenance-manager', {
      headers: { 'Authorization': 'Bearer ' + token }
    }, r1 => {
      console.log('Dashboard:', r1.statusCode);
      
      // 2. Tasks
      http.get('http://localhost:8080/api/v1/dashboard/maintenance-manager/tasks?statusGroup=IN_PROGRESS', {
        headers: { 'Authorization': 'Bearer ' + token }
      }, r2 => {
        let b2 = ''; r2.on('data', d=>b2+=d); r2.on('end', () => console.log('Tasks:', r2.statusCode, b2.substring(0,50)));
        
        // 3. Trend
        http.get('http://localhost:8080/api/v1/dashboard/maintenance-manager/compliance-trend', {
          headers: { 'Authorization': 'Bearer ' + token }
        }, r3 => {
          let b3 = ''; r3.on('data', d=>b3+=d); r3.on('end', () => console.log('Trend:', r3.statusCode, b3.substring(0,50)));
        });
      });
    });
  });
});
req.write(data);
req.end();
