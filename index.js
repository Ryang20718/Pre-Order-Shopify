const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 3000
const dotenv = require('dotenv').config();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const axios = require('axios');
const request = require('request-promise');
var cors = require('cors');
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
//mandrill
var nodemailer = require('nodemailer');
var mandrillTransport = require('nodemailer-mandrill-transport');
//authentication
var basicAuth = require('basic-auth');

const app = express();
const shopifyApiPublicKey = process.env.SHOPIFY_API_PUBLIC_KEY;
const shopifyApiSecretKey = process.env.SHOPIFY_API_SECRET_KEY;
const scopes = 'write_products';
//const appUrl = 'https://preorder-app.herokuapp.com';
const appUrl = 'https://preorder-app.herokuapp.com';
//body parser
app.use(bodyParser.urlencoded({ extended: false })) 

app.use(bodyParser.json());


//enable CORS 
app.use(cors())



///////////// Helper Functions /////////////

const buildRedirectUri = () => `${appUrl}/shopify/callback`;

const buildInstallUrl = (shop, state, redirectUri) => `https://${shop}/admin/oauth/authorize?client_id=${shopifyApiPublicKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;

const buildAccessTokenRequestUrl = (shop) => `https://${shop}/admin/oauth/access_token`;

const buildShopDataRequestUrl = (shop) => `https://${shop}/admin/shop.json`;

const generateEncryptedHash = (params) => crypto.createHmac('sha256', shopifyApiSecretKey).update(params).digest('hex');

const fetchAccessToken = async (shop, data) => await axios(buildAccessTokenRequestUrl(shop), {
  method: 'POST',
  data
});

const fetchShopData = async (shop, accessToken) => await axios(buildShopDataRequestUrl(shop), {
  method: 'GET',
  headers: {
    'X-Shopify-Access-Token': accessToken
  }
});

///////////// Route Handlers /////////////

app.get('/shopify/callback', function (req, res) {
    res.redirect('/home');
});

app//homepage
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/home', (req, res) => res.render('pages/index'))


//mandrill email
app.post('/email', cors(), function(req, res){
    vesselMandrill(req.body.email,req.body.message,req.body.image);
    console.log(req.body.email);
    res.send('Mail Has Been Sent!')
});

//form inquiries
app.post('/issues', cors(), function(req, res){
    getReceiver(req.body.email,req.body.message);
    console.log(req.body.email);
    res.send('Mail Has Been Sent!')
});

app.get('/shopify', (req, res) => {
  const shop = req.query.shop;

  if (!shop) { return res.status(400).send('no shop')}

  const state = nonce();

  const installShopUrl = buildInstallUrl(shop, state, buildRedirectUri())

  res.cookie('state', state) // should be encrypted in production
  res.redirect(installShopUrl);
});


app//homepage
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/instructions', (req, res) => res.render('pages/instructions'))

app.get('/shopify/callback', (req,res) => {
    const {shop,hmac,code,state} = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;
    
    if(state !== stateCookie){
        return res.status(403).send('Request origin cannot be verified');
    }
    if(shop && hmac && code){
        const map = Object.assign({},req.query);
        delete map['hmac'];
        const message = querystring.stringify(map);
        const generatedHash = crypto.createHmac('sha256',shopifyApiSecretKey)
        .update(message).digest('hex');
        
        if(generatedHash !== hmac){
            return res.status(400).send('HMAC validation failed');
        }
        const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
        const accessTokenPayLoad = {
            client_id:shopifyApiPublicKey,
            client_secret:shopifyApiSecretKey,
            code
        };
        
        request.post(accessTokenRequestUrl,{json: accessTokenPayLoad})
        .then((accessTokenResponse) => {
            const accessToken = accessTokenResponse.access_token;
            
            const apiRequestUrl = 'https://' + shop + '/admin/products.json';// GET URL
            const apiRequestHeader = {
                'X-Shopify-Access-Token': accessToken
            };
            request.get(apiRequestUrl,{headers: apiRequestHeader})
            .then((apiResponse) =>{
                res.redirect('/home')
                //res.end(apiResponse);
            })
            .catch((error) => {
                res.status(error.statusCode).send(error.error.error_description);
            });
        })
        .catch((error) =>{
            res.status(error.statusCode).send(error.error.error_description);
        });
    }else{
        res.status(400).send('Required Parameters missing');
    }
});





//functions to send mail through regular gmail in case Mandrill runs out of mail sends

function getReceiver(receiver,eta_product){
    
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


var mailOptions = {
  from: receiver,
  to: process.env.EMAIL_USER,
  subject: receiver + " inquiries",
  text: eta_product
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
}

//mandrill function
function vesselMandrill(receiver,message,image){
var fs = require('fs'); //Filesystem    
var handlebars = require('handlebars');
var content = fs.readFileSync("./emailTemplate/pre-OrderTemplate.html","utf-8");
var replacementETA = "We will get back to you about when the product will be back in stock";
if(message.length < 1){
    message = replacementETA;
}
var template = handlebars.compile(content);
var replacements = {
    username: receiver,
    ETA:message,
    img_url:image
}; 
var htmlToSend = template(replacements);
    
var transport = nodemailer.createTransport(mandrillTransport({
  auth: {
    apiKey: process.env.MANDRILL_API
  }
}));
 
transport.sendMail({
  from: 'info@vesselbags.com',
  to: receiver,
  subject: 'Vessel Pre Order',
  html: htmlToSend
}, function(err, info) {
  if (err) {
    console.error(err);
  } else {
    console.log(info);
  }
});
}




///////////// Start the Server /////////////

app.listen(PORT, () => console.log(`listening on port ${PORT}`));

