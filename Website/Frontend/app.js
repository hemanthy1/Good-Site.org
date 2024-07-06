// Modules
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

//Tiktok OAuth requires a session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

//Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/Index.html'));
})

// TikTok OAuth route
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

//TikTok callback
app.get('/auth/tiktok/callback', async (req, res) => {
    const { code, state } = req.query;
    if (state !== 'your_state_value') {
        return res.status(403).send('Invalid state');
    }

    try {
        const accessToken = code;

        req.session.accessToken = accessToken;

        res.redirect('/redirectACT');
    } catch (error) {
        console.error('Error retrieving access token:', error);
        res.status(500).send('Error retrieving access token');
    }
});

//Redirect to get access token
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

//Profile route
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

});

//Profile info route
app.get('/profile-info', (req, res) => {
    const displayName = req.query.display_name;
    const avatarUrl = req.query.avatar_url;

    res.send(`
      <h1>Welcome, ${displayName}!</h1>
      <img src="${avatarUrl}" alt="Avatar" />
    `);
});

// REST API to parse privacy policy from url
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

    }
});

// Function to parse privacy policy from URL
async function fetchPrivacyPolicy(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let policyText = '';

    const section = $('h1').nextAll().map((j, el) => $(el).text()).get().join(' ');
    policyText += section;
    const paragraphs = $('p').map((index, element) => $(element).text()).get();
    policyText += paragraphs;

    policyText = policyText.replace(/(\r\n|\n|\r)/gm, "");

    if (policyText.length > 119000) {
        policyText = policyText.slice(0, 119000);
    }

    return policyText.trim();
}

// TOS Route
app.get('/TermsOfService', function (req, res) {
    res.sendFile(path.join(__dirname, '/src/TOS.html'));
});

// Privacy Policy Route
app.get('/PrivacyPolicy', function (req, res) {
    res.sendFile(path.join(__dirname, '/src/PrivacyPolicy.html'));
});

// How to use Route
app.get('/HowToUse', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/HowTo.html'));
})

//Media Routes
app.get('/Logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/Privacy.png'));
})

app.get('/InUse.png', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/ExtensionInUse.png'));
})

app.get('/Extension.zip', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/ExtensionV1.zip'));
})
