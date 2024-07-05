require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');

const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(cors());
app.use(express.static('src'))

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
    res.sendFile(path.join(__dirname, '/src/Index.html'));
})

app.get('/Logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/Privacy.png'));
})

app.get('/InUse.png', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/ExtensionInUse.png'));
})

app.get('/Extension.zip', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/ExtensionV1.zip'));
})

app.get('/HowToUse', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/HowTo.html'));
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

app.get('/TermsOfService', function (req, res) {
    res.sendFile(path.join(__dirname, '/src/TOS.html'));
});

app.get('/PrivacyPolicy', function (req, res) {
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
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
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

async function fetchPrivacyPolicy(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let policyText = '';

    // // Strategy: Find common headings and search within their sibling or child elements
    // $('h1, h2, h3, h4, h5, h6').each((i, element) => {
    //     const heading = $(element).text().toLowerCase();

    //     const section = $(element).nextAll().map((j, el) => $(el).text()).get().join(' ');
    //     policyText += section;

    // });
    // const heading = $('h1').text().toLowerCase();

    const section = $('h1').nextAll().map((j, el) => $(el).text()).get().join(' ');
    policyText += section;
    const paragraphs = $('p').map((index, element) => $(element).text()).get();
    policyText += paragraphs;

    return policyText.trim();
}


app.post('/api/extract-policy', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const policyText = await fetchPrivacyPolicy(url);
        res.json({ privacyPolicy: policyText });
    } catch (error) {
        // console.error('Error extracting privacy policy:', error);
        res.json({
            privacyPolicy: `Return exactly like this, like the required format{
            "Pros": [
                {
                    "Main Point": "To be updated",
                    "Description": "Privacy policy cannot be properly interpreted. This will be remedied in the future"
                }],
            "Cons": [
                {
                    "Main Point": "To be updated",
                    "Description": "Privacy policy cannot be properly interpreted. This will be remedied in the future"
                }]
            }`
        
        });
        // res.status(500).send('Error extracting privacy policy');
    }
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
