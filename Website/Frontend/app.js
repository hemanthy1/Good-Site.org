require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cookieParser());
// app.use(cors());
app.use(cors({
    origin: 'chrome-extension://kmedcmoleafpdkililnejnmkkfgjhnhc',
    credentials: true
  }));
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
    res.send('Hey this is my API running 🥳')
  })

// TikTok OAuth routes
app.get('/auth/tiktok', (req, res) => {
  const url = 'https://www.tiktok.com/v2/auth/authorize/';
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    response_type: 'code',
    scope: 'user.info.basic',
    state: 'your_state_value',
  });
  res.redirect(`${url}?${params.toString()}`);
});

app.get('/TermsOfService', function(req, res) {
    res.sendFile(path.join(__dirname, '/src/TOS.html'));
  });

app.get('/PrivacyPolicy', function(req, res) {
res.sendFile(path.join(__dirname, '/src/PrivacyPolicy.html'));
});

// app.get('/auth/tiktok/callback', async (req, res) => {
//     const { code, state } = req.query;
//     if (state !== 'your_state_value') {
//       return res.status(403).send('Invalid state');
//     }
  
//     const url = 'https://open-api.tiktok.com/oauth/access_token/';
//     const params = new URLSearchParams({
//       client_key: process.env.TIKTOK_CLIENT_KEY,
//       client_secret: process.env.TIKTOK_CLIENT_SECRET,
//       code: code,
//       grant_type: 'authorization_code',
//     });
  
//     try {
//       const response = await axios.post(url, params, {
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//       });
  
//       const accessToken = response.data.access_token;
//       const refreshToken = response.data.data.refresh_token;
//       const openId = response.data.data.open_id;
  
//       // Store the access token, refresh token, and open ID in the session
//       req.session.accessToken = accessToken;
//       req.session.refreshToken = refreshToken;
//       req.session.openId = openId;
  
//       res.redirect('/profile');
//     } catch (error) {
//       console.error('Error retrieving access token:', error.response.data);
//       res.status(500).send('Error retrieving access token');
//     }
//   });

app.get('/auth/tiktok/callback', async (req, res) => {
    const { code, state } = req.query;
    if (state !== 'your_state_value') {
      return res.status(403).send('Invalid state');
    }
  
    try {
      // Extract the access token from the authorization code
      const accessToken = code;
  
      // Store the access token in the session
      req.session.accessToken = accessToken;

      res.redirect('/redirectACT');
    } catch (error) {
      console.error('Error retrieving access token:', error);
      res.status(500).send('Error retrieving access token');
    }
  });

app.get('/redirectACT', async (req, res) => {

    const url = 'https://open.tiktokapis.com/v2/oauth/token/';
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code: req.session.accessToken,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    });

    try {
        const response = await axios.post(url, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' ,'Cache-Control':'no-cache'},
        });
    
        const RealToken = response.data.access_token;
  
        console.log(response);
        console.log(response.access_token);
        req.session.realToken = RealToken;
    
        res.redirect('/profile');
      } catch (error) {
        console.error('Error retrieving REAL token:', error.response.data);
        res.status(500).send('Error retrieving REAL token');
      }
});


  app.get('/profile', async (req, res) => {
    if (!req.session.accessToken) {
      return res.redirect('/auth/tiktok');
    }        
  
    const url = 'https://open.tiktokapis.com/v2/user/info/';
    const params = new URLSearchParams({
      fields: 'avatar_url,display_name',
    });

    try {
      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${req.session.realToken}`,
        },
      });
     
      const userData = response.data.data.user;
      const redirectUrl = `/profile-info?display_name=${encodeURIComponent(userData.display_name)}&avatar_url=${encodeURIComponent(userData.avatar_url)}`;
      res.redirect(redirectUrl);

    } catch (error) {
      console.error('Error retrieving user profile:', error.response.data);
      res.status(500).send('Error retrieving user profile');
    }
    //   res.send(`
    //     <h1>Welcome, ${userData.display_name}!</h1>
    //     <img src="${userData.avatar_url}" alt="Avatar" />
    //   `);
    // } catch (error) {
    //   console.error('Error retrieving user profile:', error.response.data);
    //   res.status(500).send('Error retrieving user profile');
    // }
  });

  app.get('/profile-info', (req, res) => {
    const displayName = req.query.display_name;
    const avatarUrl = req.query.avatar_url;
  
    res.send(`
      <h1>Welcome, ${displayName}!</h1>
      <img src="${avatarUrl}" alt="Avatar" />
    `);
  });

  
  
// Profile route
// app.get('/profile', async (req, res) => {
//   if (!req.session.accessToken) {
//     return res.redirect('/auth/tiktok');
//   }

//   res.send({
//     accessToken: req.session.accessToken,
//   });

//   const url = 'https://open-api.tiktok.com/user/info/';
//   const params = new URLSearchParams({
//     access_token: req.session.accessToken,
//     fields: 'open_id,union_id,avatar_url,display_name',
//   });
//   try {
//     const response = await axios.get(`${url}?${params.toString()}`);
//     const profile = response.data.data.user;
//     res.send(`
//       <h1>Welcome, ${profile.display_name}!</h1>
//       <img src="${profile.avatar_url}" alt="Avatar" />
//     `);
//   } catch (error) {
//     console.error('Error retrieving user profile:', error.response.data);
//     res.status(500).send('Error retrieving user profile');
//   }
// });
