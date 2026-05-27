import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
const useAmveraData = fs.existsSync('/data');
const CUSTOM_POSTS_PATH = useAmveraData
  ? '/data/custom_posts.json'
  : path.join(__dirname, 'registration-page', 'data', 'custom_posts.json');

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
} catch (err) {
  console.error('Error initializing custom_posts.json:', err);
}

// Serve static assets from the registration-page directory
app.use(express.static(path.join(__dirname, 'registration-page')));

// Serve static assets under /registration-page path explicitly
app.use('/registration-page', express.static(path.join(__dirname, 'registration-page')));

// Fallback: Also serve from root so our assets are accessible from root-level routes
app.use(express.static(path.join(__dirname, 'registration-page')));

/**
 * Helper to fetch and parse an XML RSS feed for St. Petersburg news of various outlets
 */
async function fetchRssFeed(url: string, sourceName: string, defaultCategory = 'новости'): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, application/rss+xml, */*'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const items: any[] = [];
    
    // Match <item> or <entry> tags with any optional attributes (e.g. <item rdf:about="...">)
    const itemMatches = xmlText.match(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi) || [];

    for (const itemXml of itemMatches) {
      const titleMatch = itemXml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = itemXml.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i) || itemXml.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
      const dateMatch = itemXml.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i) || itemXml.match(/<published\b[^>]*>([\s\S]*?)<\/published>/i) || itemXml.match(/<updated\b[^>]*>([\s\S]*?)<\/updated>/i);
      const linkMatch = itemXml.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i) || itemXml.match(/<link\s+[^>]*href=["']([^"']+)["']/i);
      const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
      // Try finding image inside html / description
      const imgInDescMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);

      let title = titleMatch ? titleMatch[1].trim() : '';
      let description = descMatch ? descMatch[1].trim() : '';

      if (!title) continue;

      const cleanMarkup = (val: string): string => {
        if (!val) return '';
        let cleaned = val.trim();
        // Remove CDATA tags
        cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
        // Remove general HTML tags
        cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, "").trim();
        // Decode common HTML entities
        cleaned = cleaned
          .replace(/&nbsp;/g, ' ')
          .replace(/&mdash;/g, '—')
          .replace(/&ldquo;/g, '«')
          .replace(/&rdquo;/g, '»')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&#171;/g, '«')
          .replace(/&#187;/g, '»')
          .replace(/&#8196;/g, ' ')
          .replace(/&#8212;/g, '—')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        return cleaned.trim();
      };

      title = cleanMarkup(title);
      description = cleanMarkup(description);

      let timestamp = Math.floor(Date.now() / 1000);
      if (dateMatch) {
        try {
          const rawDate = cleanMarkup(dateMatch[1]);
          const parsed = Date.parse(rawDate);
          if (!isNaN(parsed)) {
            timestamp = Math.floor(parsed / 1000);
          }
        } catch (e) {}
      }

      let imageUrl = '';
      if (encMatch && encMatch[1]) {
        imageUrl = encMatch[1];
      } else if (mediaMatch && mediaMatch[1]) {
        imageUrl = mediaMatch[1];
      } else if (imgInDescMatch && imgInDescMatch[1]) {
        imageUrl = imgInDescMatch[1];
      }

      if (!imageUrl) {
        // Aesthetic Petersburg city fallbacks randomly selected to beautify news cards
        const cityBackups = [
          "NODEBOX/Hermitage/Hermitage.jpeg",
          "NODEBOX/isaakievskiy/isaakievskiy.jpeg"
        ];
        imageUrl = cityBackups[Math.floor(Math.random() * cityBackups.length)];
      }

      let itemLink = '';
      if (linkMatch) {
        if (linkMatch[1]) {
          itemLink = cleanMarkup(linkMatch[1]);
        }
      }

      // Shorten ID representation for cleaner hashes
      const titleHash = Buffer.from(title.substring(0, Math.min(title.length, 10))).toString('hex');

      items.push({
        id: `rss-${sourceName}-${titleHash}-${timestamp}`,
        title: title,
        description: description || 'Смотрите подробный городской репортаж по ссылке на городском портале.',
        category: defaultCategory,
        publication_date: timestamp,
        images: [{ image: imageUrl }],
        author: sourceName,
        source_link: itemLink
      });
    }

    return items;
  } catch (error) {
    const err = error as any;
    console.warn(`Failed to fetch RSS feed from ${sourceName}:`, err.message);
    return [];
  }
}

/**
 * GET /api/feed
 * Fetches St. Petersburg news from multiple live news sources (KudaGo Spb API, RSS, etc.)
 */
app.get(['/api/feed', '/registration-page/api/feed'], async (req: any, res: any) => {
  try {
    // 1. Read custom posts published on the server by the users/admins
    let customPosts: any[] = [];
    if (fs.existsSync(CUSTOM_POSTS_PATH)) {
      try {
        const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
        customPosts = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse custom posts:', e);
      }
    }

    // 2. Fetch live news & events from Saint Petersburg in parallel for high speed
    let liveNewsCombined: any[] = [];
    
    const fetchPromises = [
      // KudaGo SPb Cultural News
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const response = await fetch(
            'https://kudago.com/public-api/v1.4/news/?location=spb&page_size=15&fields=id,title,description,publication_date,images',
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = (await response.json()) as any;
          if (data && data.results && data.results.length > 0) {
            return data.results.map((item: any) => {
              let cleanDesc = item.description || '';
              cleanDesc = cleanDesc.replace(/<\/?[^>]+(>|$)/g, "").trim();
              cleanDesc = cleanDesc
                .replace(/&nbsp;/g, ' ')
                .replace(/&mdash;/g, '—')
                .replace(/&ldquo;/g, '«')
                .replace(/&rdquo;/g, '»')
                .replace(/&quot;/g, '"');

              let url = "NODEBOX/Hermitage/Hermitage.jpeg";
              if (item.images && item.images.length > 0 && item.images[0].image) {
                url = item.images[0].image;
              }

              return {
                id: `kuda-${item.id}`,
                title: item.title,
                description: cleanDesc,
                category: 'культура',
                publication_date: item.publication_date,
                images: [{ image: url }],
                author: 'KudaGo SPb'
              };
            });
          }
        } catch (error) {
          const e = error as any;
          console.warn('Failed to fetch KudaGo events source:', e.message);
        }
        return [];
      })(),
      
      // RSS Feed 1: Фонтанка.ру
      fetchRssFeed('https://www.fontanka.ru/fontanka.rss', 'Фонтанка.ру', 'новости'),

      // RSS Feed 2: Петербургский Дневник (Official SPb News)
      fetchRssFeed('https://spbdnevnik.ru/xml/rss/all.xml', 'Петербургский Дневник', 'город'),
      
      // RSS Feed 3: ИА «Диалог» (Saint-Petersburg Live News)
      fetchRssFeed('https://topdialog.ru/feed/', 'Информагентство Диалог', 'новости')
    ];

    const results = await Promise.all(fetchPromises);
    for (const feedItems of results) {
      if (Array.isArray(feedItems)) {
        liveNewsCombined = liveNewsCombined.concat(feedItems);
      }
    }

    // 3. De-duplicate news by title to offer premium, clean experience
    const seenTitles = new Set<string>();
    let uniqueLiveNews = liveNewsCombined.filter(item => {
      const lowerTitle = item.title.toLowerCase().trim();
      if (seenTitles.has(lowerTitle)) {
        return false;
      }
      seenTitles.add(lowerTitle);
      return true;
    });

    // 4. Sort live news by publication date descending (newest first)
    uniqueLiveNews.sort((a, b) => b.publication_date - a.publication_date);

    // Limit live news size to avoid huge payload
    uniqueLiveNews = uniqueLiveNews.slice(0, 30);

    // Combine custom user/admin posts first, then the dynamic city news
    const combined = [...customPosts, ...uniqueLiveNews];
    res.json({ success: true, posts: combined });

  } catch (error) {
    const err = error as any;
    console.error('Unified error in /api/feed GET:', err);
    res.json({ success: true, posts: [] });
  }
});

/**
 * POST /api/feed
 * Publishes a new post from any user (specifically Admin).
 */
app.post(['/api/feed', '/registration-page/api/feed'], (req: any, res: any) => {
  try {
    const { title, category, image, content, author } = req.body;

    if (!title || !content) {
      res.status(400).json({ success: false, message: "Заголовок и содержание обязательны" });
      return;
    }

    let customPosts: any[] = [];
    if (fs.existsSync(CUSTOM_POSTS_PATH)) {
      try {
        const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
        customPosts = JSON.parse(raw);
      } catch (e) {
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
  } catch (error) {
    const err = error as any;
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/feed/:id or POST /api/feed/edit/:id - Edit an existing post
 */
app.post(['/api/feed/edit/:id', '/registration-page/api/feed/edit/:id'], (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, category, image, content } = req.body;

    if (!title || !content) {
      res.status(400).json({ success: false, message: "Заголовок и содержание обязательны" });
      return;
    }

    let customPosts: any[] = [];
    if (fs.existsSync(CUSTOM_POSTS_PATH)) {
      try {
        const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
        customPosts = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse existing custom posts:', e);
      }
    }

    const postIndex = customPosts.findIndex((p: any) => String(p.id) === String(id));
    if (postIndex === -1) {
      res.status(404).json({ success: false, message: "Пост не найден на сервере" });
      return;
    }

    customPosts[postIndex].title = title.trim();
    customPosts[postIndex].description = content.trim();
    customPosts[postIndex].category = category || 'событие';
    if (image) {
      customPosts[postIndex].images = [{ image: image.trim() }];
    }

    fs.writeFileSync(CUSTOM_POSTS_PATH, JSON.stringify(customPosts, null, 2), 'utf8');
    res.json({ success: true, post: customPosts[postIndex] });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put(['/api/feed/:id', '/registration-page/api/feed/:id'], (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, category, image, content } = req.body;

    if (!title || !content) {
      res.status(400).json({ success: false, message: "Заголовок и содержание обязательны" });
      return;
    }

    let customPosts: any[] = [];
    if (fs.existsSync(CUSTOM_POSTS_PATH)) {
      try {
        const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
        customPosts = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse existing custom posts:', e);
      }
    }

    const postIndex = customPosts.findIndex((p: any) => String(p.id) === String(id));
    if (postIndex === -1) {
      res.status(404).json({ success: false, message: "Пост не найден на сервере" });
      return;
    }

    customPosts[postIndex].title = title.trim();
    customPosts[postIndex].description = content.trim();
    customPosts[postIndex].category = category || 'событие';
    if (image) {
      customPosts[postIndex].images = [{ image: image.trim() }];
    }

    fs.writeFileSync(CUSTOM_POSTS_PATH, JSON.stringify(customPosts, null, 2), 'utf8');
    res.json({ success: true, post: customPosts[postIndex] });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/feed/:id or POST /api/feed/delete/:id - Delete an existing post
 */
app.delete(['/api/feed/:id', '/registration-page/api/feed/:id'], (req: any, res: any) => {
  try {
    const { id } = req.params;

    let customPosts: any[] = [];
    if (fs.existsSync(CUSTOM_POSTS_PATH)) {
      try {
        const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
        customPosts = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse existing custom posts:', e);
      }
    }

    const updated = customPosts.filter((p: any) => String(p.id) !== String(id));
    fs.writeFileSync(CUSTOM_POSTS_PATH, JSON.stringify(updated, null, 2), 'utf8');

    res.json({ success: true });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/feed/delete/:id', '/registration-page/api/feed/delete/:id'], (req: any, res: any) => {
  try {
    const { id } = req.params;

    let customPosts: any[] = [];
    if (fs.existsSync(CUSTOM_POSTS_PATH)) {
      try {
        const raw = fs.readFileSync(CUSTOM_POSTS_PATH, 'utf8');
        customPosts = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse existing custom posts:', e);
      }
    }

    const updated = customPosts.filter((p: any) => String(p.id) !== String(id));
    fs.writeFileSync(CUSTOM_POSTS_PATH, JSON.stringify(updated, null, 2), 'utf8');

    res.json({ success: true });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve the index.html on the root path
app.get('/', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, 'registration-page', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
