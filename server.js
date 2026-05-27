import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;
// Enable JSON body parsing for posting custom news
app.use(express.json());
// Enable CORS middleware so the parent shell can fetch our endpoints without CORS block
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
// Path to custom posts storage file
const CUSTOM_POSTS_PATH = path.join(__dirname, 'registration-page', 'data', 'custom_posts.json');
// Ensure parent data directory and default custom_posts.json file exist
try {
    const dir = path.dirname(CUSTOM_POSTS_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(CUSTOM_POSTS_PATH)) {
        const initialPosts = [
            {
                id: "sys-welcome",
                title: "Указ Хранителей: Открытие Кодекса Петербурга",
                description: "Вниманию пытливых умов и любителей тайн! Интерактивная карта и главы петербургских достопримечательностей открыты для расследования. Изучайте загадки Эрмитажа, соборов и парков.",
                category: "указ",
                publication_date: Math.floor(Date.now() / 1000) - 3600,
                images: [
                    {
                        image: "NODEBOX/Hermitage/Hermitage.jpeg"
                    }
                ],
                author: "Вестник Кодекса"
            }
        ];
        fs.writeFileSync(CUSTOM_POSTS_PATH, JSON.stringify(initialPosts, null, 2), 'utf8');
    }
}
catch (err) {
    console.error('Error initializing custom_posts.json:', err);
}
// Serve static assets from the registration-page directory in "кодекс-петербурга (2)"
app.use(express.static(path.join(__dirname, 'кодекс-петербурга (2)', 'registration-page')));
// Serve static assets under /registration-page path explicitly
app.use('/registration-page', express.static(path.join(__dirname, 'registration-page')));
// Fallback: Also serve from root so our assets are accessible from root-level routes
app.use(express.static(path.join(__dirname, 'registration-page')));
/**
 * GET /api/feed
 * Fetches St. Petersburg news from KudaGo API and combines it with admin custom posts
 */
app.get(['/api/feed', '/registration-page/api/feed'], async (req, res) => {
    try {
        // 1. Read custom posts published on the server
        let customPosts = [];
        if (fs.existsSync(CUSTOM_POSTS_PATH)) {
            try {
                const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
                customPosts = JSON.parse(raw);
            }
            catch (e) {
                console.error('Failed to parse custom posts:', e);
            }
        }
        // 2. Fetch live St. Petersburg cultural news from KudaGo Public API
        let liveNews = [];
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout for speed/safety
            const response = await fetch('https://kudago.com/public-api/v1.4/news/?location=spb&page_size=15&fields=id,title,description,publication_date,images', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = (await response.json());
            if (data && data.results && data.results.length > 0) {
                liveNews = data.results.map((item) => {
                    // Remove html tags from description for safe aesthetic display
                    let cleanDesc = item.description || '';
                    cleanDesc = cleanDesc.replace(/<\/?[^>]+(>|$)/g, "").trim();
                    // Decode simple html entities
                    cleanDesc = cleanDesc
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&mdash;/g, '—')
                        .replace(/&ldquo;/g, '«')
                        .replace(/&rdquo;/g, '»')
                        .replace(/&quot;/g, '"');
                    return {
                        id: `kuda-${item.id}`,
                        title: item.title,
                        description: cleanDesc,
                        category: 'событие',
                        publication_date: item.publication_date,
                        images: item.images || [],
                        author: 'KudaGo SPb'
                    };
                });
            }
            else {
                throw new Error("No data results from KudaGo");
            }
        }
        catch (apiError) {
            console.warn('Could not fetch KudaGo live news, using server backups:', apiError);
            // Fallback: generate high-quality cultural news if External API fails
            liveNews = [
                {
                    id: "back-1",
                    title: "Прогулки по крышам: романтика петербургских рассветов",
                    description: "Начался сезон потрясающих экскурсий по панорамным площадкам Коломны и Невского проспекта. Узнайте город с высоты птичьего полета под истории профессиональных гидов.",
                    category: "событие",
                    publication_date: Math.floor(Date.now() / 1000) - 18000,
                    images: [{ image: "NODEBOX/isaakievskiy/isaakievskiy.jpeg" }],
                    author: "Экскурсии СПб"
                },
                {
                    id: "back-2",
                    title: "Тайны масонов в Петербурге: новая лекция в Летнем Саду",
                    description: "Известные историки соберутся в кофейном домике, чтобы приподнять завесу тайны над знаками и символами, оставленными на фасадах петербургских дворцов великими зодчими.",
                    category: "культура",
                    publication_date: Math.floor(Date.now() / 1000) - 86400,
                    images: [{ image: "NODEBOX/Hermitage/Hermitage.jpeg" }],
                    author: "Лекторий Кодекса"
                }
            ];
        }
        // 3. Combine custom posts at the top and live news below
        const combined = [...customPosts, ...liveNews];
        res.json({ success: true, posts: combined });
    }
    catch (error) {
        const err = error;
        console.error('Failsafe triggered for /api/feed GET:', err);
        const failsafeBackup = [
          {
            id: "sys-welcome",
            title: "Указ Хранителей: Открытие Кодекса Петербурга",
            description: "Вниманию пытливых умов и любителей тайн! Интерактивная карта и главы петербургских достопримечательностей открыты для расследования. Изучайте загадки Эрмитажа, соборов и парков.",
            category: "указ",
            publication_date: Math.floor(Date.now() / 1000) - 3600,
            images: [{ image: "NODEBOX/Hermitage/Hermitage.jpeg" }],
            author: "Вестник Кодекса"
          },
          {
            id: "back-r1",
            title: "Прогулки по крышам: романтика петербургских рассветов",
            description: "Начался сезон потрясающих экскурсий по панорамным площадкам Коломны и Невского проспекта. Узнайте город с высоты птичьего полета под истории профессиональных гидов.",
            category: "событие",
            publication_date: Math.floor(Date.now() / 1000) - 18000,
            images: [{ image: "NODEBOX/isaakievskiy/isaakievskiy.jpeg" }],
            author: "Экскурсии СПб"
          }
        ];
        res.json({ success: true, posts: failsafeBackup });
    }
});
/**
 * POST /api/feed
 * Publishes a new post from any user (specifically Admin).
 */
app.post(['/api/feed', '/registration-page/api/feed'], (req, res) => {
    try {
        const { title, category, image, content, author } = req.body;
        if (!title || !content) {
            res.status(400).json({ success: false, message: "Заголовок и содержание обязательны" });
            return;
        }
        let customPosts = [];
        if (fs.existsSync(CUSTOM_POSTS_PATH)) {
            try {
                const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
                customPosts = JSON.parse(raw);
            }
            catch (e) {
                console.error('Failed to parse existing custom posts inside pub:', e);
            }
        }
        const newPost = {
            id: `custom-${Date.now()}`,
            title: title.trim(),
            description: content.trim(),
            category: category || 'событие',
            publication_date: Math.floor(Date.now() / 1000),
            images: [
                {
                    image: image ? image.trim() : "NODEBOX/Hermitage/Hermitage.jpeg"
                }
            ],
            author: author || "Администратор"
        };
        customPosts.unshift(newPost); // Put new custom post at the very top!
        fs.writeFileSync(CUSTOM_POSTS_PATH, JSON.stringify(customPosts, null, 2), 'utf8');
        res.json({ success: true, post: newPost });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ success: false, error: err.message });
    }
});
// Serve the index.html on the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'registration-page', 'index.html'));
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
