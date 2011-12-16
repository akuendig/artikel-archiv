var express = require('express'),
    app = express.createServer('0.0.0.0');

console.log(JSON.stringify(process.env));
     
app.get('/', function(req, res){
    res.send('Hello World');
});

app.listen(process.env.PORT || 3000);