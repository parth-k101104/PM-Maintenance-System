const http = require('http');

const data = JSON.stringify({ email: 'mm101@company.com', password: 'admin@123' });

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    try {
      const { token } = JSON.parse(body);
      if(!token) { console.log('No token:', body); return; }
      
      http.get('http://localhost:8080/api/v1/dashboard/maintenance-manager', {
        headers: { 'Authorization': 'Bearer ' + token }
      }, res2 => {
        console.log('Dashboard response:', res2.statusCode);
      });
    } catch(e) { console.log('Error parsing login:', body); }
  });
});
req.on('error', e => console.error(e));
req.write(data);
req.end();
