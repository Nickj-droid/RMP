const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/professor', async (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: "Missing 'name' parameter" });

    const searchUrl = `https://www.ratemyprofessors.com/search/teachers?query=${encodeURIComponent(name)}&sid=U2Nob29sLTE3NTY=`;

    try {
        // Step 1: Get search page
        const searchResp = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const searchHtml = await searchResp.text();
        const profMatch = searchHtml.match(/\/professor\/\d+/);
        if (!profMatch) return res.status(404).json({ error: 'Professor not found in search results' });

        const profUrl = `https://www.ratemyprofessors.com${profMatch[0]}`;

        // Step 2: Get professor page
        const profResp = await fetch(profUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const profHtml = await profResp.text();
        const $ = cheerio.load(profHtml);

        const jsonText = $('#__NEXT_DATA__').html();
        if (!jsonText) return res.status(500).json({ error: "Couldn't locate professor data script" });

        const jsonData = JSON.parse(jsonText);
        const teacher = jsonData?.props?.pageProps?.teacher;

        if (!teacher) return res.status(500).json({ error: "Teacher data not found" });

        return res.json({
            name: `${teacher.firstName} ${teacher.lastName}`,
            avgRating: teacher.avgRating,
            avgDifficulty: teacher.avgDifficulty,
            department: teacher.department,
            numRatings: teacher.numRatings,
            link: profUrl
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch or parse data', detail: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
