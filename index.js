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
var bodyParser = require('body-parser')
//mandrill
var nodemailer = require('nodemailer');
var mandrillTransport = require('nodemailer-mandrill-transport');
///////////firebase admin sdk///////////////
var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC6w+jr51muRD/+\nRxDX9ViVlZ/9G7oQX+QaYk+T2qvdbBolv7FIJMvMedpBDZJIlVLdh59UNww2K/H8\nD+NlSKTU1xDZzkO+eMDHsa/ZFmHqX+f7O9f5y+uWMVWG6Gd3LnSqWdTCcgY4H/G7\nXGUQUj8oojGLaaMvhwiqRwrZUj4rC24u46grpJkM8Kfi4FsJPLlZeqS24G/ZGzap\n7RRhYF+1hdbWFv0WB0J8XlsqpdiR8+9ZVEAfPHUTTBQWNpM/ld6VQ9FWhDrrqnUX\nVgTggxXZYpL3Pdv4v2U5yYAnG2Tko/WWVfx4VEBkIYAfPaOyBP7Q+7qyro24/K4b\nWrrLC8unAgMBAAECggEAQ0u9PWd+zobEIjz8Kjy6/ydLXzni6OyMdh9PekC0ZdQC\ndfClEhBEKPkNNhyMRcAcfDtWo1M0gL6D8qXM851h21llNn4Wteav3CS/7rKcdIW7\nQrEVCOq8CEHdhf9u7KheHFXDDo9kg0urYC4SMnfYTy1mOcxGIyV+b1Cq7ZSvVvWo\nv+a1jUnmClM83+eZRjwdxJoB45nYmVuQFjdR5Lp/8jpPYEnf3Ul4HRnQiPdejDVl\nOD+boflIuKMTezVaJNVEiqTQBwD1xZTsh9+4sypCKkIxEwiutrkTqh40lbSuwQ7E\nluZENopL7hZlZSrIyR8qXGh5W6BmZJpxVYW90iFipQKBgQDul3rmIRr/PaKGQlUz\nHbhplcBDFXdxI/obqfpbtVy8GPg9ejHJ+Dh4lQQfm4TaUYxwTD+JY8KgvvIvoxRv\nMJCIocXGOT7jb1zUOgauQkZNd4EwtunFvKFoxAQzbUlTCoWt7l90Nxnqx2TKm4wU\n89WS3BqWWqAplLYS8llGmvHHuwKBgQDIZGSS7VU7FJobXtUWll0SwtNFneEAGpIA\ni5Qflqi0YTldbK9bcUR3dAopOsyipsOCIj0UrubG/aHj55TjCfsXsYLs4wM3HrI9\nl5Lhkj4XRUiwA+pTp4ZMK5lw6dTiI5o11mKG7GjMZAUdatgzOzk40zyhRxOksXUQ\npGwCfxXfBQKBgAuKZDVxcH7cGlpoJvrb+ymQRsZ36VkdpmFkLWn2MdAfXRKMMJBW\nY1Th0Fs/CIQO4b4k0gXxP17LHafUOY7PSI5zVL+r0TDrGBBj5iLTrdbdavBSSKh5\n4UzR/moGZT+RCLpLB271o1lJ38Q1FeeFi9UYtGiFZa3dNZlhA5R4ti01AoGAOWiB\nY5I4Y5eQWpz9YN4sxc4opn4HUndKMnvKMI6BwENGItybFBBL9Ai7THp623H4+pQC\neaVtmb5ZnaffgHeAhpYlEuYqKqVRnNGKk7LItPP1Ue+dNt/8Wl/3MmDayvo2GIxV\nZ5/cmglhab8NNwgVaZEignWRTBJGnkDsbH6p7l0CgYBu0YfsUFToxam70IxVF9kq\nNMnVlLZIot6OVD6BCEeuMNI3ohZ3oJFLZAT7ngerjh0c48mrWz2qDVXYAuq28wcU\nySUmK4p6WlVUIAsvQGXRIABDiOfWkuBMWW+6hGb/DgBP9M4pVDVgr0Mmcc0wfypX\nezB5fhz8oiX/oBaI/ZK4bA==\n-----END PRIVATE KEY-----\n",
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: process.env.FIREBASE_URL
});
const db = admin.firestore();

///////////////End FireBase admin////////////

const app = express();
const shopifyApiPublicKey = process.env.SHOPIFY_API_PUBLIC_KEY;
const shopifyApiSecretKey = process.env.SHOPIFY_API_SECRET_KEY;
const scopes = 'write_products';
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

app//homepage
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))

app.get('/test', cors(), function(req, res){
    queryFB();
    res.send('Firebase')
});

app.post('/email', cors(), function(req, res){
    getReceiver(req.body.email,req.body.message);
    vesselMandrill(req.body.email,req.body.message);
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
/*
app.get('/shopify/callback', async (req, res) => {
  const { shop, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;
  if (state !== stateCookie) { return res.status(403).send('Cannot be verified')}
  const { hmac, ...params } = req.query
  const queryParams = querystring.stringify(params)
  const hash = generateEncryptedHash(queryParams)
  if (hash !== hmac) { return res.status(400).send('HMAC validation failed')}
  try {
    const data = {
      client_id: shopifyApiPublicKey,
      client_secret: shopifyApiSecretKey,
      code
    };
    const tokenResponse = await fetchAccessToken(shop, data)
    const { access_token } = tokenResponse.data
    const shopData = await fetchShopData(shop, access_token)
    res.send(shopData.data.shop)
  } catch(err) {
    console.log(err)
    res.status(500).send('something went wrong')
  }
    
});
*/

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
            
            const apiRequestUrl = 'https://' + shop + '/admin/shop.json';// GET URL
            const apiRequestHeader = {
                'X-Shopify-Access-Token': accessToken
            };
            request.get(apiRequestUrl,{headers: apiRequestHeader})
            .then((apiResponse) =>{
                res.end(apiResponse);
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
  from: 'youremail@gmail.com',
  to: receiver,
  subject: 'Vessel Pre Order',
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
function vesselMandrill(receiver,message){

 
var transport = nodemailer.createTransport(mandrillTransport({
  auth: {
    apiKey: process.env.MANDRILL_API
  }
}));
 
transport.sendMail({
  from: 'info@vesselbags.com',
  to: receiver,
  subject: 'Vessel Pre Order',
  html: message
}, function(err, info) {
  if (err) {
    console.error(err);
  } else {
    console.log(info);
  }
});
}

//////////////////////////Firebase functions///////////////////////

//var vesRef = db.collection('Vessel');
function insertFB(){
    
}

function queryFB(){
    /*
    var query = vesRef.where('product_id', '==', 756565656454).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data().variant_id);
        console.log(doc.data().variant_id.length);
      });
    })
    .catch(err => {
      console.log('Error getting documents', err);
    });
    */
}

///////////// Start the Server /////////////

app.listen(PORT, () => console.log(`listening on port ${PORT}`));

